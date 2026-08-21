-- Initial schema. Every table stores one full scan generation's worth of
-- data plus the append-only `changes` and `scans` history tables. Rows in
-- `resources` and `relationships` are replaced wholesale on each scan
-- (see `Database::persist_scan`); history tables are never truncated.

CREATE TABLE scans (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,
    resources_found INTEGER NOT NULL DEFAULT 0,
    providers_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE resources (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT,
    attributes_json TEXT NOT NULL DEFAULT '{}',
    evidence_json TEXT NOT NULL DEFAULT '[]',
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    scan_id TEXT NOT NULL REFERENCES scans(id)
);

CREATE INDEX idx_resources_kind ON resources(kind);
CREATE INDEX idx_resources_path ON resources(path);
CREATE INDEX idx_resources_name ON resources(name);
CREATE INDEX idx_resources_scan ON resources(scan_id);

CREATE TABLE relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    evidence_json TEXT NOT NULL DEFAULT '[]',
    scan_id TEXT NOT NULL REFERENCES scans(id)
);

CREATE INDEX idx_relationships_from ON relationships(from_id);
CREATE INDEX idx_relationships_to ON relationships(to_id);
CREATE INDEX idx_relationships_scan ON relationships(scan_id);

CREATE TABLE changes (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL,
    resource_kind TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    kind TEXT NOT NULL,
    summary TEXT NOT NULL,
    occurred_at TEXT NOT NULL
);

CREATE INDEX idx_changes_occurred_at ON changes(occurred_at);

CREATE TABLE cleanup_candidates (
    resource_id TEXT PRIMARY KEY,
    resource_kind TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT,
    category TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    evidence_json TEXT NOT NULL DEFAULT '[]',
    last_used TEXT,
    depended_on_by_json TEXT NOT NULL DEFAULT '[]',
    size_bytes INTEGER,
    reversible INTEGER NOT NULL DEFAULT 1,
    consequence TEXT NOT NULL,
    scan_id TEXT NOT NULL REFERENCES scans(id)
);

CREATE INDEX idx_cleanup_category ON cleanup_candidates(category);
