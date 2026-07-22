-- profilesテーブルのRLSポリシーが自分自身をサブクエリで参照しており、
-- 「infinite recursion detected in policy for relation "profiles"」エラーの原因になっていた。
-- SECURITY DEFINER関数（内部でRLSをバイパスする）経由に変更して解消する。

create or replace function get_my_org_id()
returns uuid
language sql
security definer
stable
as $$
  select org_id from profiles where id = auth.uid()
$$;

drop policy if exists "select same org profiles" on profiles;
create policy "select same org profiles" on profiles
  for select using (
    id = auth.uid()
    or org_id = get_my_org_id()
  );
