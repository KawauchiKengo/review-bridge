-- personasとpersona_sharesのRLSポリシーが互いを参照し合っており、
-- 「infinite recursion detected in policy for relation "personas"」の原因になっていた。
-- profilesの時と同様、SECURITY DEFINER関数経由にして解消する。

create or replace function get_my_persona_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select id from personas where owner_id = auth.uid()
$$;

drop policy if exists "select own shares" on persona_shares;
create policy "select own shares" on persona_shares
  for select using (
    user_id = auth.uid()
    or persona_id in (select get_my_persona_ids())
  );
