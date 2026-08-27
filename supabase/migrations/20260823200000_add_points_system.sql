-- Points/balance foundation for the scenario ladder, starting with the coin
-- flip band. player_id is a client-generated guest UUID for now (stored in
-- localStorage) and will become auth.uid() once accounts + guest-merge land.

create table public.player_balances (
  player_id uuid primary key,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scenario_stats (
  player_id uuid not null,
  scenario_key text not null,
  attempts integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player_id, scenario_key)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger player_balances_set_updated_at
  before update on public.player_balances
  for each row execute function public.set_updated_at();

create trigger scenario_stats_set_updated_at
  before update on public.scenario_stats
  for each row execute function public.set_updated_at();

alter table public.player_balances enable row level security;
alter table public.scenario_stats enable row level security;

-- No accounts exist yet, so there is no session-bound way to scope these
-- rows to "the current player" - every guest is trusted with their own
-- (randomly-keyed) row for now. Tighten to auth.uid()-scoped policies once
-- real accounts land.
create policy "player_balances_rw" on public.player_balances
  for all to anon, authenticated using (true) with check (true);

create policy "scenario_stats_rw" on public.scenario_stats
  for all to anon, authenticated using (true) with check (true);
