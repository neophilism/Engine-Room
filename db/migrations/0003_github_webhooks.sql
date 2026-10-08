create table github_webhook_deliveries (
  id bigserial primary key,
  delivery_id text not null unique,
  event_name text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  check (delivery_id <> ''),
  check (event_name <> '')
);

create index github_webhook_deliveries_unprocessed
  on github_webhook_deliveries(received_at)
  where processed_at is null;

comment on table github_webhook_deliveries is
  'Durable, idempotent inbox for signed GitHub webhook deliveries.';
