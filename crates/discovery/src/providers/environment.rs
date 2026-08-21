use crate::context::ScanContext;
use crate::provider::{Availability, DiscoveryProvider, ProviderError, ProviderOutput};
use async_trait::async_trait;
use codeatlas_core::{Resource, ResourceKind};

/// Discovers the *names* of environment variables set for the current
/// process. Values are never read, stored, logged, or passed through any
/// intermediate variable: `std::env::vars()` yields `(name, value)`
/// pairs and this provider immediately discards `.1` at the iterator
/// step, before a `Resource` is ever constructed. `ResourceKind::EnvironmentVariable`
/// is marked `is_sensitive_by_default()` in `codeatlas_core::resource`
/// precisely because a variable's value can be a credential, API key, or
/// token — the only thing safe to surface by default is that a variable
/// with a given name exists. No `attributes` are ever set on the
/// produced resources for this same reason: even an attribute that looks
/// harmless (e.g. a value's length) is unnecessary risk for no real
/// product value, so this provider sets none at all.
///
/// Resources use `Resource::new` rather than `Resource::identified`: a
/// variable *name* is not a stable real-world discriminator worth
/// linking other resources to across scans or machines (unlike a
/// filesystem path or a git remote), so there is no benefit to a
/// deterministic id here.
pub struct EnvironmentVariableProvider;

#[async_trait]
impl DiscoveryProvider for EnvironmentVariableProvider {
    fn id(&self) -> &'static str {
        "environment"
    }

    fn label(&self) -> &'static str {
        "Environment variables"
    }

    fn availability(&self, _ctx: &ScanContext) -> Availability {
        Availability::Available
    }

    async fn scan(&self, _ctx: &ScanContext) -> Result<ProviderOutput, ProviderError> {
        tokio::task::spawn_blocking(scan_blocking)
            .await
            .map_err(|e| ProviderError::Other(e.to_string()))?
    }
}

fn scan_blocking() -> Result<ProviderOutput, ProviderError> {
    let mut output = ProviderOutput::default();

    for (name, _value) in std::env::vars() {
        // `_value` is dropped here, at the earliest possible point,
        // never bound to anything else and never inspected.
        output
            .resources
            .push(Resource::new(ResourceKind::EnvironmentVariable, name));
    }

    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context::ScanContext;
    use std::path::PathBuf;

    #[tokio::test]
    async fn never_leaks_a_variable_value_into_any_resource() {
        const SENTINEL: &str = "SECRET_TEST_VALUE_XYZ";
        std::env::set_var("CODEATLAS_TEST_VAR", SENTINEL);

        let ctx = ScanContext::new(PathBuf::from("/tmp"), vec![]);
        let output = EnvironmentVariableProvider.scan(&ctx).await.unwrap();

        std::env::remove_var("CODEATLAS_TEST_VAR");

        assert!(
            output
                .resources
                .iter()
                .any(|r| r.name == "CODEATLAS_TEST_VAR"),
            "the variable's name should still be reported"
        );

        let serialized = serde_json::to_string(&output.resources).unwrap();
        assert!(
            !serialized.contains(SENTINEL),
            "the variable's value must never appear in any produced resource"
        );

        for resource in &output.resources {
            assert!(
                resource.attributes.is_empty(),
                "environment variable resources must never carry attributes"
            );
        }
    }

    #[tokio::test]
    async fn is_always_available() {
        let ctx = ScanContext::new(PathBuf::from("/tmp"), vec![]);
        assert_eq!(
            EnvironmentVariableProvider.availability(&ctx),
            Availability::Available
        );
    }
}
