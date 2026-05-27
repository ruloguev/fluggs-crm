alter table profiles
  add column if not exists privacy_notice_accepted_at timestamptz;
