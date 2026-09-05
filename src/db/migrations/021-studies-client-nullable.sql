-- 021: Allow studies to be created without a client (OPI-only projects)
-- The /track route auto-creates a study for OPI projects that may not have a client linked
ALTER TABLE studies ALTER COLUMN client_id DROP NOT NULL;
