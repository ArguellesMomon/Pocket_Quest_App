create schema if not exists pocketquest;
do $$ begin
  if not exists (select from pg_roles where rolname = 'pocketquest_app') then
    create role pocketquest_app nologin;
  end if;
end $$;
grant pocketquest_app to current_user;
create table if not exists pocketquest.games (
  owner_id text primary key,
  state jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
create table if not exists pocketquest.operations (
  owner_id text not null references pocketquest.games(owner_id) on delete cascade,
  operation_id uuid not null,
  message text not null,
  created_at timestamptz not null default now(),
  primary key(owner_id, operation_id)
);
alter table pocketquest.games enable row level security;
alter table pocketquest.operations enable row level security;
do $$ begin
  if not exists (select from pg_policies where schemaname='pocketquest' and tablename='games' and policyname='owner_only') then
    create policy owner_only on pocketquest.games to pocketquest_app
      using (owner_id = current_setting('pocketquest.owner_id', true))
      with check (owner_id = current_setting('pocketquest.owner_id', true));
    create policy owner_only on pocketquest.operations to pocketquest_app
      using (owner_id = current_setting('pocketquest.owner_id', true))
      with check (owner_id = current_setting('pocketquest.owner_id', true));
  end if;
end $$;
grant usage on schema pocketquest to pocketquest_app;
grant select, insert, update on pocketquest.games to pocketquest_app;
grant select, insert on pocketquest.operations to pocketquest_app;
revoke all on schema pocketquest from public;
