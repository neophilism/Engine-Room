-- A PR may be merged while a larger approved package still fails its
-- acceptance criteria. Track source-owned contribution evidence separately
-- from the package-completion PR links, with no change to approved totals.
ALTER TABLE project_plan_items ADD COLUMN contributing_pr_numbers jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE project_plan_items ADD CONSTRAINT contributing_pr_numbers_is_array
  CHECK (jsonb_typeof(contributing_pr_numbers) = 'array');
