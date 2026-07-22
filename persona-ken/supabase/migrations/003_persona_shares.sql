-- ペルソナの個人単位共有（visibilityとは独立に、特定のユーザーにだけ閲覧・壁打ち権限を渡す）
create table if not exists persona_shares (
  persona_id uuid not null references personas(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  shared_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (persona_id, user_id)
);

alter table persona_shares enable row level security;

-- 所有者は自分のペルソナの共有一覧を、共有された本人は自分への共有を見れる
create policy "select own shares" on persona_shares
  for select using (
    user_id = auth.uid()
    or persona_id in (select id from personas where owner_id = auth.uid())
  );

-- 共有できるのはペルソナ所有者のみ。対象は同じ組織のメンバーに限る
create policy "owner shares persona" on persona_shares
  for insert with check (
    shared_by = auth.uid()
    and persona_id in (select id from personas where owner_id = auth.uid())
    and user_id in (
      select id from profiles
      where org_id = (select org_id from personas where id = persona_id)
    )
  );

-- 共有解除も所有者のみ
create policy "owner revokes share" on persona_shares
  for delete using (
    persona_id in (select id from personas where owner_id = auth.uid())
  );

-- ペルソナの閲覧範囲に「個人共有されている」場合を追加
drop policy if exists "select visible personas" on personas;
create policy "select visible personas" on personas
  for select using (
    owner_id = auth.uid()
    or (visibility = 'org' and org_id in (select org_id from profiles where id = auth.uid()))
    or (visibility = 'team' and team_id in (select team_id from team_members where user_id = auth.uid()))
    or id in (select persona_id from persona_shares where user_id = auth.uid())
  );

-- フィードバックの送信はペルソナ所有者のみ（閲覧可能な人全員には送らせない）
drop policy if exists "insert feedback on visible personas" on persona_feedback;
create policy "insert feedback on visible personas" on persona_feedback
  for insert with check (
    created_by = auth.uid()
    and persona_id in (select id from personas where owner_id = auth.uid())
  );
