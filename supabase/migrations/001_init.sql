-- 投稿論文テーブル
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  abstract text not null,
  journal_name text not null,
  author_name text not null,
  author_email text not null,
  keywords text[] default '{}',
  ai_tags text[] default '{}',
  status text not null default 'pending' check (status in ('pending', 'analyzing', 'ready', 'assigned')),
  created_at timestamptz default now()
);

-- 査読者テーブル
create table if not exists reviewers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  affiliation text not null,
  expertise_tags text[] default '{}',
  review_count integer default 0,
  created_at timestamptz default now()
);

-- 査読依頼テーブル
create table if not exists review_requests (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  reviewer_id uuid not null references reviewers(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  coi_flag boolean default false,
  match_score integer default 0,
  selected_at timestamptz,
  created_at timestamptz default now(),
  unique(submission_id, reviewer_id)
);

-- サンプル査読者データ
insert into reviewers (name, email, affiliation, expertise_tags, review_count) values
  ('田中 太郎', 'tanaka@example.ac.jp', '東京大学 情報工学科', array['機械学習', 'ニューラルネットワーク', 'コンピュータビジョン'], 47),
  ('鈴木 花子', 'suzuki@example.ac.jp', '京都大学 数理工学科', array['統計学', '最適化', 'データサイエンス'], 32),
  ('佐藤 健一', 'sato@example.ac.jp', '大阪大学 生命科学科', array['バイオインフォマティクス', 'ゲノム解析', '機械学習'], 28),
  ('山田 美咲', 'yamada@example.ac.jp', '東北大学 電気工学科', array['自然言語処理', '深層学習', 'テキストマイニング'], 55),
  ('伊藤 正道', 'ito@example.ac.jp', '名古屋大学 物理学科', array['量子コンピュータ', '量子情報', '暗号理論'], 19),
  ('渡辺 由美', 'watanabe@example.ac.jp', '九州大学 化学科', array['分子シミュレーション', '計算化学', '材料科学'], 41);
