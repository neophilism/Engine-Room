create table if not exists engine_room_schema_migrations (
  version varchar(64) primary key,
  description text not null,
  applied_at timestamptz not null default now()
);

comment on table engine_room_schema_migrations is
  'Records database migrations applied to an Engine Room deployment.';
