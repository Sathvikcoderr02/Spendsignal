-- Round 2: persist full audit for re-audit on pricing change (run in Supabase SQL editor)

alter table public.public_audits
  add column if not exists email text,
  add column if not exists input_stack jsonb,
  add column if not exists pricing_snapshot jsonb,
  add column if not exists pricing_version text;

create index if not exists public_audits_email_idx on public.public_audits (email)
  where email is not null;
