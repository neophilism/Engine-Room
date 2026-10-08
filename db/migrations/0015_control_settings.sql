-- Administrative settings contain no provider credentials or secrets.
create table engine_room_control_settings (
  singleton boolean primary key default true check (singleton),
  revision integer not null default 0 check (revision >= 0),
  github_reconciliation_enabled boolean not null default false,
  github_reconciliation_interval_minutes integer not null default 60
    check (github_reconciliation_interval_minutes in (15, 30, 60, 180, 360, 720, 1440)),
  changed_at timestamptz not null default now()
);

insert into engine_room_control_settings (singleton) values (true)
on conflict (singleton) do nothing;

create table engine_room_control_audit (
  revision integer primary key check (revision > 0),
  actor text not null,
  previous_settings jsonb not null,
  new_settings jsonb not null,
  changed_at timestamptz not null default now()
);

create table engine_room_reconciliation_runs (
  installation_id bigint primary key check (installation_id > 0),
  last_started_at timestamptz not null default now(),
  last_finished_at timestamptz,
  status text not null check (status in ('running', 'succeeded', 'failed'))
);
