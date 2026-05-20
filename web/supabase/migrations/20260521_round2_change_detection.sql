-- Round 2 commit 2: store last pricing-change detection per audit

alter table public.public_audits
  add column if not exists last_change_payload jsonb,
  add column if not exists change_detected_at timestamptz;
