use crate::context::ScanContext;
use crate::provider::{Availability, DiscoveryProvider, ProviderError, ProviderOutput};
use async_trait::async_trait;
use codeatlas_core::{
    deterministic_id, Evidence, Relationship, RelationshipKind, Resource, ResourceKind,
};
use std::path::Path;
use std::process::Command;
use walkdir::WalkDir;

/// Inspects git repositories found under the search roots and reports
/// branch, working tree status, and recent commit history. Every git
/// invocation uses an explicit argument vector against a specific
/// directory (`git -C <dir> ...`); nothing here ever builds a shell
/// string from repository content, and repository content (commit
/// messages, remote names) is treated as untrusted display text, never
/// as something to interpret or execute.
pub struct GitProvider;

#[async_trait]
impl DiscoveryProvider for GitProvider {
    fn id(&self) -> &'static str {
        "git"
    }

    fn label(&self) -> &'static str {
        "Git repositories"
    }

    fn availability(&self, _ctx: &ScanContext) -> Availability {
        match which::which("git") {
            Ok(_) => Availability::Available,
            Err(_) => Availability::Unavailable {
                reason: "git is not on PATH".to_string(),
            },
        }
    }

    async fn scan(&self, ctx: &ScanContext) -> Result<ProviderOutput, ProviderError> {
        let ctx = ctx.clone();
        tokio::task::spawn_blocking(move || scan_blocking(&ctx))
            .await
            .map_err(|e| ProviderError::Other(e.to_string()))?
    }
}

fn scan_blocking(ctx: &ScanContext) -> Result<ProviderOutput, ProviderError> {
    let mut output = ProviderOutput::default();

    for root in &ctx.search_roots {
        if !root.exists() {
            continue;
        }
        find_repositories(root, ctx, &mut output);
    }

    Ok(output)
}

fn find_repositories(root: &Path, ctx: &ScanContext, output: &mut ProviderOutput) {
    let mut walker = WalkDir::new(root).max_depth(ctx.max_fs_depth).into_iter();

    loop {
        let entry = match walker.next() {
            Some(Ok(entry)) => entry,
            Some(Err(_)) => continue,
            None => break,
        };

        if !entry.file_type().is_dir() {
            continue;
        }

        let name = entry.file_name().to_string_lossy();
        if ctx
            .ignored_directory_names
            .iter()
            .any(|ignored| ignored == name.as_ref())
        {
            walker.skip_current_dir();
            continue;
        }

        if entry.path().join(".git").is_dir() {
            if let Some(repo) = inspect_repository(entry.path()) {
                output.resources.push(repo.repository);
                output.resources.extend(repo.remote_resource);
                output.relationships.push(repo.contains_relationship);
                if let Some(uses) = repo.remote_relationship {
                    output.relationships.push(uses);
                }
            }
            // A repository's own working tree is not walked further for
            // nested repositories; git submodules are out of scope for
            // the initial release (see ROADMAP.md).
            walker.skip_current_dir();
        }
    }
}

struct RepositoryFindings {
    repository: Resource,
    contains_relationship: Relationship,
    remote_resource: Option<Resource>,
    remote_relationship: Option<Relationship>,
}

fn inspect_repository(dir: &Path) -> Option<RepositoryFindings> {
    let dir_display = dir.display().to_string();
    let project_id = deterministic_id(ResourceKind::Project, &dir_display);
    let repo_id_key = format!("{dir_display}/.git");

    let branch = run_git(dir, &["rev-parse", "--abbrev-ref", "HEAD"]);
    let status_output = run_git(dir, &["status", "--porcelain=v1"]);
    let is_clean = status_output.as_deref().map(|s| s.trim().is_empty());
    let recent_commits = run_git(
        dir,
        &["log", "-5", "--pretty=format:%H\x1f%s\x1f%cI", "--no-color"],
    )
    .map(|raw| parse_commits(&raw))
    .unwrap_or_default();

    let name = dir.file_name()?.to_string_lossy().into_owned();
    let mut repository = Resource::identified(ResourceKind::GitRepository, name, &repo_id_key)
        .with_path(dir_display.clone())
        .with_attribute("branch", branch.clone())
        .with_attribute("clean", is_clean)
        .with_attribute(
            "recent_commits",
            recent_commits
                .iter()
                .map(
                    |c| serde_json::json!({ "subject": c.subject, "committed_at": c.committed_at }),
                )
                .collect::<Vec<_>>(),
        )
        .with_evidence(Evidence {
            source: "git".to_string(),
            description: "found .git directory and read repository state".to_string(),
            path: Some(dir.join(".git").display().to_string()),
        });

    if let Some(branch) = &branch {
        repository = repository.with_attribute("current_branch", branch);
    }

    let contains_relationship =
        Relationship::new(project_id, repository.id, RelationshipKind::Contains).with_evidence(
            Evidence {
                source: "git".to_string(),
                description: "repository root is the project root".to_string(),
                path: None,
            },
        );

    let (remote_resource, remote_relationship) = run_git(dir, &["remote", "get-url", "origin"])
        .map(|url| redact_credentials(url.trim()))
        .filter(|url| !url.is_empty())
        .map(|remote_url| {
            let remote = Resource::identified(
                ResourceKind::ConfigFile,
                format!("origin ({remote_url})"),
                &format!("{repo_id_key}/remote/origin"),
            )
            .with_attribute("remote_url", &remote_url)
            .with_evidence(Evidence {
                source: "git".to_string(),
                description: "git remote get-url origin".to_string(),
                path: None,
            });
            let relationship = Relationship::new(repository.id, remote.id, RelationshipKind::Uses);
            (remote, relationship)
        })
        .map(|(r, rel)| (Some(r), Some(rel)))
        .unwrap_or((None, None));

    Some(RepositoryFindings {
        repository,
        contains_relationship,
        remote_resource,
        remote_relationship,
    })
}

struct CommitSummary {
    subject: String,
    committed_at: String,
}

fn parse_commits(raw: &str) -> Vec<CommitSummary> {
    raw.lines()
        .filter_map(|line| {
            let mut parts = line.splitn(3, '\u{1f}');
            let _hash = parts.next()?;
            let subject = parts.next()?.to_string();
            let committed_at = parts.next().unwrap_or_default().to_string();
            Some(CommitSummary {
                subject,
                committed_at,
            })
        })
        .collect()
}

/// Strips any `user:password@` or `user@` userinfo component from a git
/// remote URL before it is ever stored or displayed. HTTPS remotes with
/// embedded personal access tokens are common enough that this is not a
/// hypothetical: `https://ghp_xxx@github.com/...` must become
/// `https://github.com/...`.
///
/// The userinfo/host boundary is the *last* `@` that appears before the
/// authority component ends (at the first `/`, `?`, or `#` after the
/// scheme, or at the end of the string if there is none). This matters
/// because a password or token can itself contain an unescaped `@`
/// (`https://user:p@ssTOKEN@host/...`); splitting on the *first* `@`
/// leaves everything after it up to the real host through untouched,
/// which is a redaction bypass, not just a cosmetic bug — the tail of the
/// credential ends up stored and displayed verbatim. Scanning from the
/// end of the authority also protects against a URL with no credentials
/// at all but an `@` in its path (`https://host/user@repo.git`), which
/// the first-`@` approach would misparse as userinfo and corrupt.
fn redact_credentials(url: &str) -> String {
    if let Some(scheme_end) = url.find("://") {
        let (scheme, rest) = url.split_at(scheme_end + 3);
        let authority_end = rest
            .find(['/', '?', '#'])
            .unwrap_or(rest.len());
        let (authority, remainder) = rest.split_at(authority_end);
        if let Some(at_pos) = authority.rfind('@') {
            let host = &authority[at_pos + 1..];
            return format!("{scheme}{host}{remainder}");
        }
    }
    url.to_string()
}

fn run_git(dir: &Path, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(args)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8(output.stdout).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_userinfo_from_remote_url() {
        assert_eq!(
            redact_credentials("https://ghp_abc123@github.com/levimackay/codeatlas.git"),
            "https://github.com/levimackay/codeatlas.git"
        );
        assert_eq!(
            redact_credentials("https://github.com/levimackay/codeatlas.git"),
            "https://github.com/levimackay/codeatlas.git"
        );
        assert_eq!(
            redact_credentials("git@github.com:levimackay/codeatlas.git"),
            "git@github.com:levimackay/codeatlas.git"
        );
    }

    #[test]
    fn redacts_a_token_that_contains_an_unescaped_at_sign() {
        // A naive "split on the first @" strips only up to that first @,
        // leaving the tail of the credential (and a stray @) in the
        // "redacted" output: a real bypass, not a cosmetic bug.
        assert_eq!(
            redact_credentials("https://user:p@ssTOKEN@github.com/org/repo.git"),
            "https://github.com/org/repo.git"
        );
        assert_eq!(
            redact_credentials("https://a@b@c@host.example.com/path"),
            "https://host.example.com/path"
        );
    }

    #[test]
    fn does_not_mistake_an_at_sign_in_the_path_for_userinfo() {
        // No credentials here at all; the `@` belongs to the path. The
        // first-@ approach would corrupt this into "https://repo.git".
        assert_eq!(
            redact_credentials("https://github.com/user@name/repo.git"),
            "https://github.com/user@name/repo.git"
        );
    }

    #[test]
    fn redacts_credentials_with_a_port_present() {
        assert_eq!(
            redact_credentials("https://token@internal-git.example.com:8443/team/repo.git"),
            "https://internal-git.example.com:8443/team/repo.git"
        );
    }

    #[test]
    fn is_case_insensitive_to_scheme_when_locating_the_separator() {
        // The scheme's own casing never affects the "://" search, since
        // it only ever looks for the literal separator, not the scheme
        // name itself.
        assert_eq!(
            redact_credentials("HTTPS://TOKEN@GitHub.com/org/repo.git"),
            "HTTPS://GitHub.com/org/repo.git"
        );
    }

    #[test]
    fn parses_commit_log_with_unit_separator() {
        let raw = "abc123\u{1f}fix bug\u{1f}2026-01-01T00:00:00Z\ndef456\u{1f}add feature\u{1f}2026-01-02T00:00:00Z";
        let commits = parse_commits(raw);
        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].subject, "fix bug");
        assert_eq!(commits[1].committed_at, "2026-01-02T00:00:00Z");
    }
}
