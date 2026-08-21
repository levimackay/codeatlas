-- Simple key/value store for application settings: configured search
-- roots, onboarding completion, provider allow/deny list, telemetry
-- opt-in (which defaults to absent, i.e. off). Values are JSON so the
-- schema does not need a migration every time a new setting is added.
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
