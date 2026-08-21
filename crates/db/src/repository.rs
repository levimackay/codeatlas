use crate::convert::*;
use crate::{Database, DbError, DbResult};
use codeatlas_core::{
    ChangeEvent, CleanupCandidate, Graph, ProviderRunSummary, Relationship, Resource, ResourceId,
    ScanRecord,
};
use rusqlite::{params, OptionalExtension};
use std::collections::BTreeMap;
use uuid::Uuid;

impl Database {
    /// Replaces the current machine model with the result of a
    /// completed scan and appends the scan record. Wrapped in a single
    /// transaction so a crash mid-write never leaves the model half old,
    /// half new.
    pub fn persist_scan(&self, scan: &ScanRecord, graph: &Graph) -> DbResult<()> {
        let mut conn = self.conn.lock().expect("db mutex poisoned");
        let tx = conn.transaction()?;

        tx.execute(
            "INSERT INTO scans (id, started_at, finished_at, status, resources_found, providers_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET finished_at = excluded.finished_at,
                status = excluded.status, resources_found = excluded.resources_found,
                providers_json = excluded.providers_json",
            params![
                scan.id.to_string(),
                scan.started_at.to_rfc3339(),
                scan.finished_at.map(|t| t.to_rfc3339()),
                scan_status_to_str(scan.status),
                scan.resources_found as i64,
                serde_json::to_string(&scan.providers_run)?,
            ],
        )?;

        tx.execute("DELETE FROM relationships", [])?;
        tx.execute("DELETE FROM resources", [])?;

        for resource in graph.resources() {
            tx.execute(
                "INSERT INTO resources (id, kind, name, path, attributes_json, evidence_json, first_seen, last_seen, scan_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    resource.id.to_string(),
                    kind_to_str(resource.kind),
                    resource.name,
                    resource.path,
                    serde_json::to_string(&resource.attributes)?,
                    evidence_to_json(&resource.evidence),
                    resource.first_seen.to_rfc3339(),
                    resource.last_seen.to_rfc3339(),
                    scan.id.to_string(),
                ],
            )?;
        }

        for rel in graph.relationships() {
            tx.execute(
                "INSERT INTO relationships (from_id, to_id, kind, evidence_json, scan_id)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    rel.from.to_string(),
                    rel.to.to_string(),
                    relationship_kind_to_str(rel.kind),
                    evidence_to_json(&rel.evidence),
                    scan.id.to_string(),
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn list_scans(&self, limit: usize) -> DbResult<Vec<ScanRecord>> {
        let conn = self.conn.lock().expect("db mutex poisoned");
        let mut stmt = conn.prepare(
            "SELECT id, started_at, finished_at, status, resources_found, providers_json
             FROM scans ORDER BY started_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], |row| {
            let id: String = row.get(0)?;
            let started_at: String = row.get(1)?;
            let finished_at: Option<String> = row.get(2)?;
            let status: String = row.get(3)?;
            let resources_found: i64 = row.get(4)?;
            let providers_json: String = row.get(5)?;
            Ok((
                id,
                started_at,
                finished_at,
                status,
                resources_found,
                providers_json,
            ))
        })?;

        let mut out = Vec::new();
        for row in rows {
            let (id, started_at, finished_at, status, resources_found, providers_json) = row?;
            out.push(ScanRecord {
                id: parse_uuid(&id)?,
                started_at: parse_timestamp(&started_at)?,
                finished_at: finished_at.map(|s| parse_timestamp(&s)).transpose()?,
                status: scan_status_from_str(&status).map_err(crate::DbError::Integrity)?,
                resources_found: resources_found as usize,
                providers_run: serde_json::from_str::<Vec<ProviderRunSummary>>(&providers_json)?,
            });
        }
        Ok(out)
    }

    /// The current machine model: every resource and relationship from
    /// the most recent completed scan.
    pub fn latest_graph(&self) -> DbResult<Graph> {
        let conn = self.conn.lock().expect("db mutex poisoned");
        let mut graph = Graph::new();

        let mut resource_stmt = conn.prepare(
            "SELECT id, kind, name, path, attributes_json, evidence_json, first_seen, last_seen FROM resources",
        )?;
        let resource_rows = resource_stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let kind: String = row.get(1)?;
            let name: String = row.get(2)?;
            let path: Option<String> = row.get(3)?;
            let attributes_json: String = row.get(4)?;
            let evidence_json: String = row.get(5)?;
            let first_seen: String = row.get(6)?;
            let last_seen: String = row.get(7)?;
            Ok((
                id,
                kind,
                name,
                path,
                attributes_json,
                evidence_json,
                first_seen,
                last_seen,
            ))
        })?;

        for row in resource_rows {
            let (id, kind, name, path, attributes_json, evidence_json, first_seen, last_seen) =
                row?;
            let attributes: BTreeMap<String, serde_json::Value> =
                serde_json::from_str(&attributes_json)?;
            graph.upsert_resource(Resource {
                id: parse_uuid(&id)?,
                kind: kind_from_str(&kind).map_err(crate::DbError::Integrity)?,
                name,
                path,
                attributes,
                evidence: evidence_from_json(&evidence_json),
                first_seen: parse_timestamp(&first_seen)?,
                last_seen: parse_timestamp(&last_seen)?,
            });
        }

        let mut rel_stmt =
            conn.prepare("SELECT from_id, to_id, kind, evidence_json FROM relationships")?;
        let rel_rows = rel_stmt.query_map([], |row| {
            let from_id: String = row.get(0)?;
            let to_id: String = row.get(1)?;
            let kind: String = row.get(2)?;
            let evidence_json: String = row.get(3)?;
            Ok((from_id, to_id, kind, evidence_json))
        })?;

        for row in rel_rows {
            let (from_id, to_id, kind, evidence_json) = row?;
            graph.add_relationship(Relationship {
                from: parse_uuid(&from_id)?,
                to: parse_uuid(&to_id)?,
                kind: relationship_kind_from_str(&kind).map_err(crate::DbError::Integrity)?,
                evidence: evidence_from_json(&evidence_json),
            });
        }

        Ok(graph)
    }

    pub fn record_changes(&self, events: &[ChangeEvent]) -> DbResult<()> {
        let conn = self.conn.lock().expect("db mutex poisoned");
        for event in events {
            conn.execute(
                "INSERT INTO changes (id, resource_id, resource_kind, resource_name, kind, summary, occurred_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    event.id.to_string(),
                    event.resource_id.to_string(),
                    kind_to_str(event.resource_kind),
                    event.resource_name,
                    change_kind_to_str(event.kind),
                    event.summary,
                    event.occurred_at.to_rfc3339(),
                ],
            )?;
        }
        Ok(())
    }

    pub fn list_changes(&self, limit: usize) -> DbResult<Vec<ChangeEvent>> {
        let conn = self.conn.lock().expect("db mutex poisoned");
        let mut stmt = conn.prepare(
            "SELECT id, resource_id, resource_kind, resource_name, kind, summary, occurred_at
             FROM changes ORDER BY occurred_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
            ))
        })?;

        let mut out = Vec::new();
        for row in rows {
            let (id, resource_id, resource_kind, resource_name, kind, summary, occurred_at) = row?;
            out.push(ChangeEvent {
                id: parse_uuid(&id)?,
                resource_id: parse_uuid(&resource_id)?,
                resource_kind: kind_from_str(&resource_kind).map_err(crate::DbError::Integrity)?,
                resource_name,
                kind: change_kind_from_str(&kind).map_err(crate::DbError::Integrity)?,
                summary,
                occurred_at: parse_timestamp(&occurred_at)?,
            });
        }
        Ok(out)
    }

    pub fn save_cleanup_candidates(
        &self,
        scan_id: Uuid,
        candidates: &[CleanupCandidate],
    ) -> DbResult<()> {
        let mut conn = self.conn.lock().expect("db mutex poisoned");
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM cleanup_candidates", [])?;
        for c in candidates {
            tx.execute(
                "INSERT INTO cleanup_candidates
                 (resource_id, resource_kind, name, path, category, reasoning, evidence_json,
                  last_used, depended_on_by_json, size_bytes, reversible, consequence, scan_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                params![
                    c.resource_id.to_string(),
                    kind_to_str(c.resource_kind),
                    c.name,
                    c.path,
                    cleanup_category_to_str(c.category),
                    c.reasoning,
                    evidence_to_json(&c.evidence),
                    c.last_used.map(|t| t.to_rfc3339()),
                    serde_json::to_string(
                        &c.depended_on_by
                            .iter()
                            .map(|id| id.to_string())
                            .collect::<Vec<_>>()
                    )?,
                    c.size_bytes.map(|v| v as i64),
                    c.reversible as i64,
                    c.consequence,
                    scan_id.to_string(),
                ],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn list_cleanup_candidates(&self) -> DbResult<Vec<CleanupCandidate>> {
        let conn = self.conn.lock().expect("db mutex poisoned");
        let mut stmt = conn.prepare(
            "SELECT resource_id, resource_kind, name, path, category, reasoning, evidence_json,
                    last_used, depended_on_by_json, size_bytes, reversible, consequence
             FROM cleanup_candidates",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, String>(8)?,
                row.get::<_, Option<i64>>(9)?,
                row.get::<_, i64>(10)?,
                row.get::<_, String>(11)?,
            ))
        })?;

        let mut out = Vec::new();
        for row in rows {
            let (
                resource_id,
                resource_kind,
                name,
                path,
                category,
                reasoning,
                evidence_json,
                last_used,
                depended_on_by_json,
                size_bytes,
                reversible,
                consequence,
            ) = row?;
            let depended_on_by: Vec<String> = serde_json::from_str(&depended_on_by_json)?;
            let mut ids = Vec::with_capacity(depended_on_by.len());
            for id in depended_on_by {
                ids.push(parse_uuid(&id)?);
            }
            out.push(CleanupCandidate {
                resource_id: parse_uuid(&resource_id)?,
                resource_kind: kind_from_str(&resource_kind).map_err(crate::DbError::Integrity)?,
                name,
                path,
                category: cleanup_category_from_str(&category)
                    .map_err(crate::DbError::Integrity)?,
                reasoning,
                evidence: evidence_from_json(&evidence_json),
                last_used: last_used.map(|s| parse_timestamp(&s)).transpose()?,
                depended_on_by: ids,
                size_bytes: size_bytes.map(|v| v as u64),
                reversible: reversible != 0,
                consequence,
            });
        }
        Ok(out)
    }

    /// Plain substring search over resource name and path. This is
    /// deliberately simple for the initial release: correct, fast enough
    /// for the resource counts a single machine produces, and with no
    /// index-corruption failure mode the way FTS5 can have. A ranked
    /// full-text index is tracked in ROADMAP.md.
    pub fn search(&self, query: &str, limit: usize) -> DbResult<Vec<Resource>> {
        let conn = self.conn.lock().expect("db mutex poisoned");
        let pattern = format!("%{}%", query.replace('%', "\\%").replace('_', "\\_"));
        let mut stmt = conn.prepare(
            "SELECT id, kind, name, path, attributes_json, evidence_json, first_seen, last_seen
             FROM resources
             WHERE name LIKE ?1 ESCAPE '\\' OR path LIKE ?1 ESCAPE '\\' OR kind LIKE ?1 ESCAPE '\\'
             ORDER BY last_seen DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![pattern, limit as i64], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
            ))
        })?;

        let mut out = Vec::new();
        for row in rows {
            let (id, kind, name, path, attributes_json, evidence_json, first_seen, last_seen) =
                row?;
            let attributes: BTreeMap<String, serde_json::Value> =
                serde_json::from_str(&attributes_json)?;
            out.push(Resource {
                id: parse_uuid(&id)?,
                kind: kind_from_str(&kind).map_err(crate::DbError::Integrity)?,
                name,
                path,
                attributes,
                evidence: evidence_from_json(&evidence_json),
                first_seen: parse_timestamp(&first_seen)?,
                last_seen: parse_timestamp(&last_seen)?,
            });
        }
        Ok(out)
    }

    pub fn get_setting<T: serde::de::DeserializeOwned>(&self, key: &str) -> DbResult<Option<T>> {
        let conn = self.conn.lock().expect("db mutex poisoned");
        let value_json: Option<String> = conn
            .query_row(
                "SELECT value_json FROM app_settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()?;
        value_json
            .map(|json| serde_json::from_str(&json))
            .transpose()
            .map_err(DbError::from)
    }

    pub fn set_setting<T: serde::Serialize>(&self, key: &str, value: &T) -> DbResult<()> {
        let conn = self.conn.lock().expect("db mutex poisoned");
        conn.execute(
            "INSERT INTO app_settings (key, value_json, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
            params![key, serde_json::to_string(value)?, chrono::Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    pub fn resource_by_id(&self, id: ResourceId) -> DbResult<Option<Resource>> {
        let conn = self.conn.lock().expect("db mutex poisoned");
        conn.query_row(
            "SELECT id, kind, name, path, attributes_json, evidence_json, first_seen, last_seen
             FROM resources WHERE id = ?1",
            params![id.to_string()],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, String>(7)?,
                ))
            },
        )
        .optional()?
        .map(
            |(id, kind, name, path, attributes_json, evidence_json, first_seen, last_seen)| {
                let attributes: BTreeMap<String, serde_json::Value> =
                    serde_json::from_str(&attributes_json)?;
                Ok(Resource {
                    id: parse_uuid(&id)?,
                    kind: kind_from_str(&kind).map_err(crate::DbError::Integrity)?,
                    name,
                    path,
                    attributes,
                    evidence: evidence_from_json(&evidence_json),
                    first_seen: parse_timestamp(&first_seen)?,
                    last_seen: parse_timestamp(&last_seen)?,
                })
            },
        )
        .transpose()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use codeatlas_core::{Resource, ResourceKind, ScanStatus};

    #[test]
    fn persist_and_reload_round_trips() {
        let db = Database::open_in_memory().unwrap();
        let mut graph = Graph::new();
        let project = Resource::new(ResourceKind::Project, "codeatlas").with_path("/tmp/codeatlas");
        graph.upsert_resource(project.clone());

        let mut scan = ScanRecord::start();
        scan.status = ScanStatus::Completed;
        scan.finished_at = Some(chrono::Utc::now());
        scan.resources_found = 1;

        db.persist_scan(&scan, &graph).unwrap();

        let reloaded = db.latest_graph().unwrap();
        assert_eq!(reloaded.len(), 1);
        let found = reloaded.resource(project.id).unwrap();
        assert_eq!(found.name, "codeatlas");

        let scans = db.list_scans(10).unwrap();
        assert_eq!(scans.len(), 1);
        assert_eq!(scans[0].status, ScanStatus::Completed);
    }

    #[test]
    fn search_matches_name_and_path() {
        let db = Database::open_in_memory().unwrap();
        let mut graph = Graph::new();
        graph.upsert_resource(
            Resource::new(ResourceKind::Tool, "postgres").with_path("/usr/local/bin/postgres"),
        );
        graph.upsert_resource(
            Resource::new(ResourceKind::Tool, "node").with_path("/usr/local/bin/node"),
        );

        let mut scan = ScanRecord::start();
        scan.status = ScanStatus::Completed;
        db.persist_scan(&scan, &graph).unwrap();

        let results = db.search("postgres", 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "postgres");
    }

    #[test]
    fn second_scan_replaces_resources_but_keeps_scan_history() {
        let db = Database::open_in_memory().unwrap();

        let mut first_graph = Graph::new();
        first_graph.upsert_resource(Resource::new(ResourceKind::Tool, "python2"));
        let mut first_scan = ScanRecord::start();
        first_scan.status = ScanStatus::Completed;
        db.persist_scan(&first_scan, &first_graph).unwrap();

        let mut second_graph = Graph::new();
        second_graph.upsert_resource(Resource::new(ResourceKind::Tool, "python3"));
        let mut second_scan = ScanRecord::start();
        second_scan.status = ScanStatus::Completed;
        db.persist_scan(&second_scan, &second_graph).unwrap();

        let current = db.latest_graph().unwrap();
        assert_eq!(current.len(), 1);
        assert!(current.resources().any(|r| r.name == "python3"));

        assert_eq!(db.list_scans(10).unwrap().len(), 2);
    }
}
