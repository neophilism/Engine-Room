create table project_financial_entries (
  project_id uuid not null references projects(id) on delete cascade,
  environment text not null,
  source text not null,
  external_id text not null,
  kind text not null check (kind in ('cost', 'revenue')),
  category text not null,
  currency text not null check (currency in ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'KWD')),
  amount_minor bigint not null check (amount_minor between -9007199254740991 and 9007199254740991),
  occurred_on date not null,
  description text,
  payload_hash text not null,
  received_at timestamptz not null default now(),
  primary key (project_id, environment, source, external_id)
);
create index financial_entries_by_period on project_financial_entries(occurred_on, currency, project_id);
create table project_financial_forecasts (
  project_id uuid not null references projects(id) on delete cascade,
  environment text not null,
  source text not null,
  external_id text not null,
  currency text not null check (currency in ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'KWD')),
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  cost_minor bigint not null check (cost_minor between 0 and 9007199254740991),
  revenue_minor bigint not null check (revenue_minor between 0 and 9007199254740991),
  observed_at timestamptz not null,
  payload_hash text not null,
  received_at timestamptz not null default now(),
  primary key (project_id, environment, source, external_id)
);
create index financial_forecasts_by_period on project_financial_forecasts(project_id, period, currency, observed_at desc);
