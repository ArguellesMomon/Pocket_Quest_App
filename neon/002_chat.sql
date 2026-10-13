create table if not exists pocketquest.chat_conversations (
  owner_id text not null references pocketquest.games(owner_id) on delete cascade,
  character_id text not null check (character_id in ('cat','nori','pip','maple','samo','chami')),
  summary text not null default '' check (length(summary) <= 1200),
  primary key (owner_id, character_id)
);
create table if not exists pocketquest.chat_turns (
  sequence bigint generated always as identity,
  owner_id text not null,
  character_id text not null,
  request_id uuid not null,
  user_text text not null check (length(user_text) between 1 and 1000),
  reply text not null check (length(reply) between 1 and 2000),
  created_at timestamptz not null default now(),
  primary key (owner_id, request_id),
  foreign key (owner_id, character_id) references pocketquest.chat_conversations(owner_id, character_id) on delete cascade
);
create index if not exists chat_history on pocketquest.chat_turns(owner_id, character_id, sequence desc);
create table if not exists pocketquest.chat_usage (
  owner_id text primary key references pocketquest.games(owner_id) on delete cascade,
  day date not null,
  attempts integer not null default 0,
  last_attempt bigint not null default 0,
  pending_token uuid,
  pending_character text,
  pending_until bigint not null default 0
);
alter table pocketquest.chat_conversations enable row level security;
alter table pocketquest.chat_turns enable row level security;
alter table pocketquest.chat_usage enable row level security;
do $$ begin
  if not exists (select from pg_policies where schemaname='pocketquest' and tablename='chat_conversations' and policyname='owner_only') then
    create policy owner_only on pocketquest.chat_conversations to pocketquest_app
      using (owner_id = current_setting('pocketquest.owner_id', true))
      with check (owner_id = current_setting('pocketquest.owner_id', true));
    create policy owner_only on pocketquest.chat_turns to pocketquest_app
      using (owner_id = current_setting('pocketquest.owner_id', true))
      with check (owner_id = current_setting('pocketquest.owner_id', true));
    create policy owner_only on pocketquest.chat_usage to pocketquest_app
      using (owner_id = current_setting('pocketquest.owner_id', true))
      with check (owner_id = current_setting('pocketquest.owner_id', true));
  end if;
end $$;
grant select, insert, update, delete on pocketquest.chat_conversations, pocketquest.chat_turns to pocketquest_app;
grant select, insert, update on pocketquest.chat_usage to pocketquest_app;
grant usage on sequence pocketquest.chat_turns_sequence_seq to pocketquest_app;
