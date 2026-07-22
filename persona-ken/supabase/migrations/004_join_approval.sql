-- 組織参加を「即時参加」から「申請→管理者承認」に変更する

create table if not exists join_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  requester_display_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

alter table join_requests enable row level security;

create policy "select own or admin org requests" on join_requests
  for select using (
    user_id = auth.uid()
    or org_id in (select org_id from profiles where id = auth.uid() and role = 'admin')
  );

-- 却下は管理者がテーブル更新で行う。承認はprofilesの更新を伴うためRPC経由のみ許可する
create policy "admin rejects join requests" on join_requests
  for update using (
    org_id in (select org_id from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    status = 'rejected'
  );

-- 招待コードで組織への参加を「申請」する（即時参加はしない）
drop function if exists join_organization(text);
create or replace function request_join_organization(code text)
returns boolean as $$
declare
  target_org_id uuid;
  requester_name text;
begin
  select id into target_org_id from organizations where invite_code = code;
  if target_org_id is null then
    return false;
  end if;

  select display_name into requester_name from profiles where id = auth.uid();

  insert into join_requests (org_id, user_id, requester_display_name, status)
  values (target_org_id, auth.uid(), requester_name, 'pending');

  return true;
end;
$$ language plpgsql security definer;

-- 管理者が申請を承認する（承認された人のprofilesを更新する）
create or replace function approve_join_request(request_id uuid)
returns boolean as $$
declare
  req join_requests;
begin
  select * into req from join_requests where id = request_id and status = 'pending';
  if req is null then
    return false;
  end if;

  if not exists (
    select 1 from profiles where id = auth.uid() and org_id = req.org_id and role = 'admin'
  ) then
    return false;
  end if;

  update profiles set org_id = req.org_id, role = 'member' where id = req.user_id;
  update join_requests set status = 'approved', resolved_at = now() where id = request_id;
  return true;
end;
$$ language plpgsql security definer;
