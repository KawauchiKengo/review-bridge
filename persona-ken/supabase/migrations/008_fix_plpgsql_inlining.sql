-- get_my_org_id / get_my_persona_ids を language sql で定義していたため、
-- PostgreSQLのプランナがこれらを呼び出し元のクエリにインライン展開し、
-- security definer によるRLSバイパスが無効化され、無限再帰が再発していた。
-- language sql はプランナに展開されうるため、展開されない plpgsql に変更する。

create or replace function get_my_org_id()
returns uuid
language plpgsql
security definer
stable
set search_path = public
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
as $$
begin
  return query select id from personas where owner_id = auth.uid();
end;
$$;
