-- 001と002をまとめた、何度実行しても安全な統合SQL。
-- 途中まで実行されていた状態からでも、これを1回流せば正しい状態に揃う。

-- 組織
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

-- ユーザープロフィール（auth.usersを拡張）
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id),
  role text not null default 'member' check (role in ('admin', 'member')),
  display_name text not null default '',
  created_at timestamptz default now()
);

-- サインアップ時に自動でprofilesを作成
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- チーム
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- チームメンバー
create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (team_id, user_id)
);

-- ペルソナ（AI人格）
create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  name text not null,
  role text not null default '',
  tone text not null default '',
  viewpoint text not null default '',
  system_prompt text not null,
  visibility text not null default 'private' check (visibility in ('private', 'team', 'org')),
  created_at timestamptz default now(),
  check (visibility <> 'team' or team_id is not null)
);

-- 会話（1対1 or 複数ペルソナ議論）
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('single', 'multi')),
  title text not null default '',
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- 会話に参加するペルソナ
create table if not exists conversation_personas (
  conversation_id uuid not null references conversations(id) on delete cascade,
  persona_id uuid not null references personas(id) on delete cascade,
  primary key (conversation_id, persona_id)
);

-- メッセージ
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'persona')),
  persona_id uuid references personas(id) on delete set null,
  content text not null,
  created_at timestamptz default now()
);

-- ペルソナへのフィードバック（人格設定を育てるための改訂提案）
create table if not exists persona_feedback (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  created_by uuid not null references profiles(id) on delete cascade,
  feedback_text text not null,
  original_system_prompt text not null,
  proposed_system_prompt text not null,
  status text not null default 'pending' check (status in ('pending', 'applied', 'dismissed')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- 組織作成（作成者が管理者になる）
create or replace function create_organization(org_name text)
returns organizations as $$
declare
  new_org organizations;
begin
  insert into organizations (name) values (org_name) returning * into new_org;
  update profiles set org_id = new_org.id, role = 'admin' where id = auth.uid();
  return new_org;
end;
$$ language plpgsql security definer;

-- 招待コードで組織に参加
create or replace function join_organization(code text)
returns boolean as $$
declare
  target_org_id uuid;
begin
  select id into target_org_id from organizations where invite_code = code;
  if target_org_id is null then
    return false;
  end if;
  update profiles set org_id = target_org_id, role = 'member' where id = auth.uid();
  return true;
end;
$$ language plpgsql security definer;

-- org_id / role は上記の関数経由でのみ変更させる（本人の直接更新は表示名のみ）
revoke update on profiles from authenticated;
grant update (display_name) on profiles to authenticated;

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table personas enable row level security;
alter table conversations enable row level security;
alter table conversation_personas enable row level security;
alter table messages enable row level security;
alter table persona_feedback enable row level security;

drop policy if exists "select own organization" on organizations;
create policy "select own organization" on organizations
  for select using (id in (select org_id from profiles where id = auth.uid()));

drop policy if exists "select same org profiles" on profiles;
create policy "select same org profiles" on profiles
  for select using (
    id = auth.uid()
    or org_id in (select org_id from profiles where id = auth.uid())
  );
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles
  for update using (id = auth.uid());

drop policy if exists "select same org teams" on teams;
create policy "select same org teams" on teams
  for select using (org_id in (select org_id from profiles where id = auth.uid()));
drop policy if exists "admin manages teams" on teams;
create policy "admin manages teams" on teams
  for all using (
    org_id in (select org_id from profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "select same org team members" on team_members;
create policy "select same org team members" on team_members
  for select using (
    team_id in (
      select id from teams where org_id in (select org_id from profiles where id = auth.uid())
    )
  );
drop policy if exists "admin manages team members" on team_members;
create policy "admin manages team members" on team_members
  for all using (
    team_id in (
      select id from teams
      where org_id in (select org_id from profiles where id = auth.uid() and role = 'admin')
    )
  );

drop policy if exists "select visible personas" on personas;
create policy "select visible personas" on personas
  for select using (
    owner_id = auth.uid()
    or (visibility = 'org' and org_id in (select org_id from profiles where id = auth.uid()))
    or (visibility = 'team' and team_id in (select team_id from team_members where user_id = auth.uid()))
  );
drop policy if exists "insert own personas" on personas;
create policy "insert own personas" on personas
  for insert with check (
    owner_id = auth.uid()
    and org_id in (select org_id from profiles where id = auth.uid())
  );
drop policy if exists "update own personas" on personas;
create policy "update own personas" on personas
  for update using (owner_id = auth.uid());
drop policy if exists "delete own personas" on personas;
create policy "delete own personas" on personas
  for delete using (owner_id = auth.uid());

drop policy if exists "own conversations" on conversations;
create policy "own conversations" on conversations
  for all using (created_by = auth.uid());

drop policy if exists "own conversation participants" on conversation_personas;
create policy "own conversation participants" on conversation_personas
  for all using (
    conversation_id in (select id from conversations where created_by = auth.uid())
  );

drop policy if exists "own conversation messages" on messages;
create policy "own conversation messages" on messages
  for all using (
    conversation_id in (select id from conversations where created_by = auth.uid())
  );

drop policy if exists "select own feedback or as persona owner" on persona_feedback;
create policy "select own feedback or as persona owner" on persona_feedback
  for select using (
    created_by = auth.uid()
    or persona_id in (select id from personas where owner_id = auth.uid())
  );

drop policy if exists "insert feedback on visible personas" on persona_feedback;
create policy "insert feedback on visible personas" on persona_feedback
  for insert with check (
    created_by = auth.uid()
    and persona_id in (
      select id from personas where
        owner_id = auth.uid()
        or (visibility = 'org' and org_id in (select org_id from profiles where id = auth.uid()))
        or (visibility = 'team' and team_id in (select team_id from team_members where user_id = auth.uid()))
    )
  );

drop policy if exists "owner resolves feedback" on persona_feedback;
create policy "owner resolves feedback" on persona_feedback
  for update using (
    persona_id in (select id from personas where owner_id = auth.uid())
  );
