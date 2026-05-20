create table if not exists public.audit_leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null,
  company_name text,
  role text,
  team_size integer,
  monthly_savings integer not null,
  annual_savings integer not null,
  lead_tier text not null,
  source text not null default 'spendsignal-web',
  audit_payload jsonb not null
);

create index if not exists audit_leads_created_at_idx on public.audit_leads (created_at desc);
create index if not exists audit_leads_email_idx on public.audit_leads (email);

create table if not exists public.public_audits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  share_id text not null unique,
  email text,
  team_size integer not null,
  primary_use_case text not null,
  total_monthly_savings integer not null,
  total_annual_savings integer not null,
  lead_tier text not null,
  audit_payload jsonb not null,
  input_stack jsonb,
  pricing_snapshot jsonb,
  pricing_version text
);

create index if not exists public_audits_created_at_idx on public.public_audits (created_at desc);
create index if not exists public_audits_share_id_idx on public.public_audits (share_id);
create index if not exists public_audits_email_idx on public.public_audits (email) where email is not null;
