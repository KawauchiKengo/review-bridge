# persona-ken（2号くん）

複数のAI人格（ペルソナ）と壁打ち・議論シミュレーションができる社内向けツール。
Next.js (App Router) + Supabase (PostgreSQL / Auth) + Google Gemini API。

## セットアップ

1. [Supabase](https://supabase.com) でプロジェクトを作成する
2. Supabase の SQL Editor で `supabase/migrations/001_init.sql` と `supabase/migrations/002_persona_feedback.sql` の内容を実行する
3. `.env.example` を `.env.local` にコピーし、値を埋める

```bash
cp .env.example .env.local
```

| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase公開キー |
| `GEMINI_API_KEY` | Google Gemini API認証（サーバーサイドのみ） |

4. 依存パッケージをインストールして起動する

```bash
npm install
npm run dev
```

## 使い方（初回の流れ）

1. `/login` で新規登録（メールアドレス・パスワード）
2. 初回ログイン後、自動的に `/onboarding` に案内される
   - 「組織を作る」→ 自分が管理者になる
   - 既に組織がある場合は、管理者から共有された招待コードで「参加する」
3. `/personas/new` でペルソナ（AI人格）を作成する
   - 公開範囲を「自分のみ」「チーム内」「組織全体」から選べる
4. ペルソナ詳細ページから「壁打ちを始める」で1対1チャット
5. ダッシュボードの「複数人で議論する」で、複数ペルソナ（他人が作ったペルソナも含む）を選んで議論させる
6. 「会話ログ」から過去のやり取りを見返せる
7. ペルソナの返答に「これは違う」と感じたら、フィードバックを送信できる。ペルソナ作成者が内容を確認し、「反映する」を押すと人格設定が更新される（`/personas/[id]/feedback`）

## コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npm run lint     # Lint
```
