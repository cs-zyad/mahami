create table if not exists public.routines (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  icon text not null default 'sparkles' check (char_length(icon) between 1 and 24),
  reminder_time time,
  reminder_enabled boolean not null default false,
  repeat_days smallint[] not null default array[0, 1, 2, 3, 4, 5, 6]::smallint[],
  notification_ids text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(repeat_days) between 1 and 7),
  check (repeat_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[])
);

alter table public.routines
  add column if not exists icon text not null default 'sparkles';

create index if not exists routines_user_active_idx
  on public.routines (user_id, active, created_at);

alter table public.routines enable row level security;

revoke all on table public.routines from anon, authenticated;
grant select, insert, update, delete on table public.routines to authenticated;

drop policy if exists "routines_select_own" on public.routines;
create policy "routines_select_own"
  on public.routines for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "routines_insert_own" on public.routines;
create policy "routines_insert_own"
  on public.routines for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "routines_update_own" on public.routines;
create policy "routines_update_own"
  on public.routines for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "routines_delete_own" on public.routines;
create policy "routines_delete_own"
  on public.routines for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.routine_completions (
  id text primary key,
  routine_id text not null references public.routines (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_on date not null,
  completed_at timestamptz not null default now(),
  unique (routine_id, completed_on)
);

create index if not exists routine_completions_user_date_idx
  on public.routine_completions (user_id, completed_on desc);

alter table public.routine_completions enable row level security;

revoke all on table public.routine_completions from anon, authenticated;
grant select, insert, update, delete on table public.routine_completions to authenticated;

drop policy if exists "routine_completions_select_own" on public.routine_completions;
create policy "routine_completions_select_own"
  on public.routine_completions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "routine_completions_insert_own" on public.routine_completions;
create policy "routine_completions_insert_own"
  on public.routine_completions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.routines
      where routines.id = routine_id
        and routines.user_id = (select auth.uid())
    )
  );

drop policy if exists "routine_completions_update_own" on public.routine_completions;
create policy "routine_completions_update_own"
  on public.routine_completions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.routines
      where routines.id = routine_id
        and routines.user_id = (select auth.uid())
    )
  );

drop policy if exists "routine_completions_delete_own" on public.routine_completions;
create policy "routine_completions_delete_own"
  on public.routine_completions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.routines is
  'User-owned repeating routines for Mahami.';

comment on table public.routine_completions is
  'Daily routine completion history used for progress and streaks.';
