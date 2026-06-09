-- ============================================================
-- MIGRACION 019: RLS policies for notifications table
-- ============================================================

-- 1) Ensure RLS is enabled
alter table notifications enable row level security;

-- 2) Users can SELECT their own unread notifications
drop policy if exists "users_select_own" on notifications;
create policy "users_select_own" on notifications
  for select
  using (auth.uid() = user_id);

-- 3) Users can UPDATE their own notifications (mark as read)
drop policy if exists "users_update_own" on notifications;
create policy "users_update_own" on notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
