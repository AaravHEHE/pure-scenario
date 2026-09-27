-- Public leaderboard. Only signed-in accounts can ever appear on it: every
-- row is keyed to an auth.users id, so a guest (who has no account) cannot
-- have a row. A guest's preview rank is computed in their own browser and is
-- never written anywhere (see src/lib/leaderboard.ts).
--
-- Browsers can read display_name and total_points and nothing else, and
-- cannot write at all: there are no insert/update/delete policies or grants.
-- Rows will be written server-side (an Edge Function using the service role)
-- once accounts, display names and persisted points exist.

create table public.leaderboard_entries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null unique,
  total_points bigint not null default 0 check (total_points >= 0),
  updated_at timestamptz not null default now()
);

create trigger leaderboard_entries_set_updated_at
  before update on public.leaderboard_entries
  for each row execute function public.set_updated_at();

alter table public.leaderboard_entries enable row level security;

-- Column-level read access only: user_id stays private.
revoke all on public.leaderboard_entries from anon, authenticated;
grant select (display_name, total_points) on public.leaderboard_entries to anon, authenticated;

create policy "leaderboard_entries_public_read" on public.leaderboard_entries
  for select to anon, authenticated using (true);
