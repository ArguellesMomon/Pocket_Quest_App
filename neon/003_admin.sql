-- Membership is provisioned by a trusted server script, never by browser actions.
create table if not exists pocketquest.test_admins (
  owner_id uuid primary key references neon_auth."user"(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on pocketquest.test_admins from public, pocketquest_app;

create table if not exists pocketquest.admin_edits (
  owner_id text not null references pocketquest.games(owner_id) on delete cascade,
  operation_id uuid not null,
  before_values jsonb not null,
  after_values jsonb not null,
  created_at timestamptz not null default now(),
  primary key(owner_id, operation_id)
);
alter table pocketquest.admin_edits enable row level security;
do $$ begin
  if not exists (select from pg_policies where schemaname='pocketquest' and tablename='admin_edits' and policyname='owner_only') then
    create policy owner_only on pocketquest.admin_edits to pocketquest_app
      using (owner_id = current_setting('pocketquest.owner_id', true))
      with check (owner_id = current_setting('pocketquest.owner_id', true));
  end if;
end $$;
revoke all on pocketquest.admin_edits from public;
grant select, insert on pocketquest.admin_edits to pocketquest_app;
