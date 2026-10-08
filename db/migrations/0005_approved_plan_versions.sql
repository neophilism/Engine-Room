alter table development_plans
  add column source_repository text,
  add column source_ref text,
  add column source_fingerprint text,
  add column manifest_snapshot jsonb;

create unique index one_current_approved_plan_per_project
  on development_plans(project_id)
  where status = 'approved';

create unique index development_plan_fingerprint_per_project
  on development_plans(project_id, source_fingerprint)
  where source_fingerprint is not null;

alter table development_plans
  add constraint approved_plan_has_source
  check (
    status <> 'approved'
    or (
      source_repository is not null
      and source_ref is not null
      and source_fingerprint is not null
      and manifest_snapshot is not null
    )
  );

create or replace function prevent_approved_plan_identity_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('approved', 'superseded') then
    if new.project_id <> old.project_id
       or new.version <> old.version
       or new.planned_pr_total <> old.planned_pr_total
       or new.source_repository is distinct from old.source_repository
       or new.source_ref is distinct from old.source_ref
       or new.source_fingerprint is distinct from old.source_fingerprint
       or new.manifest_snapshot is distinct from old.manifest_snapshot
       or new.approved_at is distinct from old.approved_at then
      raise exception 'approved development plan identity is immutable';
    end if;
  end if;
  return new;
end;
$$;

create trigger development_plan_approved_identity_immutable
before update on development_plans
for each row execute function prevent_approved_plan_identity_mutation();

comment on column development_plans.source_fingerprint is
  'SHA-256 fingerprint of the canonical approved manifest snapshot.';
comment on column development_plans.manifest_snapshot is
  'Immutable normalized manifest captured at approval time.';
