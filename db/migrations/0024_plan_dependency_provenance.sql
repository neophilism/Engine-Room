ALTER TABLE project_plan_documents ADD COLUMN source_commit text
 CHECK(source_commit IS NULL OR source_commit ~ '^[a-f0-9]{40}$');
ALTER TABLE project_plan_items
 ADD COLUMN source_item_id text,
 ADD COLUMN depends_on jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(depends_on)='array'),
 ADD COLUMN external_dependencies jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(external_dependencies)='array'),
 ADD COLUMN external_prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(external_prerequisites)='array'),
 ADD COLUMN source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
-- Backfill each exact retained source fingerprint. Invalid historic JSON stays
-- visibly unreconciled rather than preventing a migration or inventing edges.
DO $$ DECLARE doc record; unit record; BEGIN
 FOR doc IN SELECT repository_id,path,fingerprint,body FROM project_plan_documents WHERE path='registry/prs.json' LOOP
  BEGIN
   FOR unit IN SELECT value,ordinality FROM jsonb_array_elements(doc.body::jsonb->'units') WITH ORDINALITY LOOP
    UPDATE project_plan_items SET source_item_id=unit.value->>'id',
      depends_on=coalesce(unit.value->'dependsOn','[]'::jsonb),
      external_dependencies=coalesce(unit.value->'externalDependencies','[]'::jsonb),
      external_prerequisites=coalesce(unit.value->'externalPrerequisites','[]'::jsonb),source_metadata=unit.value
     WHERE repository_id=doc.repository_id AND path=doc.path AND fingerprint=doc.fingerprint AND ordinal=unit.ordinality;
   END LOOP;
  EXCEPTION WHEN invalid_text_representation OR invalid_parameter_value OR check_violation THEN
   RAISE NOTICE 'Historic plan provenance remains unreconciled';
  END;
 END LOOP;
END $$;
CREATE INDEX plan_unit_identity ON project_plan_items(repository_id,path,fingerprint,source_item_id);
