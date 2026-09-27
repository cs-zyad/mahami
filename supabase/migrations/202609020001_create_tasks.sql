create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  description text not null default '' check (char_length(description) <= 5000),
  important boolean not null default false,
  urgent boolean not null default false,
  category text not null default 'شخصي' check (char_length(category) between 1 and 80),
  due_at timestamptz,
  reminder_minutes integer check (reminder_minutes between 0 and 10080),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_status_due_idx
  on public.tasks using btree (user_id, status, due_at);

create index if not exists tasks_user_updated_idx
  on public.tasks using btree (user_id, updated_at desc);

alter table public.tasks enable row level security;

revoke all on table public.tasks from anon, authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
  on public.tasks for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
  on public.tasks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
  on public.tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
  on public.tasks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.tasks is
  'User-owned tasks for Mahami. Access is restricted by RLS to the authenticated owner.';
