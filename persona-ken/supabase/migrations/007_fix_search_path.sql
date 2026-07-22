-- SECURITY DEFINER関数がsearch_pathを明示していなかったため、
-- サインアップ時のトリガー(handle_new_user)が「relation "profiles" does not exist」で
-- 失敗し、ユーザー作成そのものが毎回ロールバックされていた。
-- 全てのSECURITY DEFINER関数にsearch_pathを固定して解消する。

alter function handle_new_user() set search_path = public;
alter function create_organization(text) set search_path = public;
alter function request_join_organization(text) set search_path = public;
alter function approve_join_request(uuid) set search_path = public;
alter function get_my_org_id() set search_path = public;
alter function get_my_persona_ids() set search_path = public;
