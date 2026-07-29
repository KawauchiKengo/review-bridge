-- persona_shares -> personas 側は関数経由にしていたが、
-- personas -> persona_shares 側がまだ生のサブクエリのままで、
-- 循環の片側だけが残っていたため無限再帰が続いていた。
-- 双方向とも関数経由にして確実に断ち切る。

create or replace function get_shared_persona_ids()
returns setof uuid
language plpgsql
security definer
stable
set search_path = public
set row_security = off
as $$
begin
  return query select persona_id from persona_shares where user_id = auth.uid();
end;
$$;

drop policy if exists "select visible personas" on personas;
create policy "select visible personas" on personas
  for select using (
    owner_id = auth.uid()
    or (visibility = 'org' and org_id = get_my_org_id())
    or (visibility = 'team' and team_id in (select team_id from team_members where user_id = auth.uid()))
    or id in (select get_shared_persona_ids())
  );

drop policy if exists "owner shares persona" on persona_shares;
create policy "owner shares persona" on persona_shares
  for insert with check (
    shared_by = auth.uid()
    and persona_id in (select get_my_persona_ids())
    and user_id in (
      select id from profiles where org_id = get_my_org_id()
    )
  );

drop policy if exists "owner revokes share" on persona_shares;
create policy "owner revokes share" on persona_shares
  for delete using (
    persona_id in (select get_my_persona_ids())
  );
