ALTER TABLE project_plan_documents ADD COLUMN runtime_evidence jsonb NOT NULL DEFAULT '[]'::jsonb
 CHECK(jsonb_typeof(runtime_evidence)='array');
