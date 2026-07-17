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

alter table persona_feedback enable row level security;

-- 自分が送ったフィードバック、または自分がオーナーのペルソナへのフィードバックは閲覧可
create policy "select own feedback or as persona owner" on persona_feedback
  for select using (
    created_by = auth.uid()
    or persona_id in (select id from personas where owner_id = auth.uid())
  );

-- 閲覧可能なペルソナに対してのみフィードバックを送信できる
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

-- 反映/却下はペルソナ所有者のみ
create policy "owner resolves feedback" on persona_feedback
  for update using (
    persona_id in (select id from personas where owner_id = auth.uid())
  );
