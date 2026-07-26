-- security definer + plpgsqlに変更しても再帰が解消しなかったため、
-- 関数内で明示的にRLSそのものを無効化するrow_security = offを追加する。
-- これはロール・所有者まわりの曖昧さに左右されない、確実なRLS無効化設定。

create or replace function get_my_org_id()
returns uuid
language plpgsql
security definer
stable
set search_path = public
set row_security = off
as $$
begin
  return (select org_id from profiles where id = auth.uid());
end;
$$;

create or replace function get_my_persona_ids()
returns setof uuid
language plpgsql
security definer
stable
set search_path = public
set row_security = off
as $$
begin
  return query select id from personas where owner_id = auth.uid();
end;
$$;
