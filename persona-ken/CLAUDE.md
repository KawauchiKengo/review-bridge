# CLAUDE.md

## プロジェクト概要

persona-ken（川内2号くん） — 複数のAI人格（ペルソナ）と壁打ち・議論シミュレーションができる社内向けツール。
Next.js 14 (App Router) + Supabase (PostgreSQL / Auth) + Google Gemini API。

review-bridge リポジトリ内で開発を始めたが、review-bridge（学術査読マッチング）とはドメインが異なる別プロジェクト。
将来的に独立したリポジトリへ分離する想定。

## コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npm run lint     # Lint
```

## アーキテクチャ

```
app/
  page.tsx                              # ダッシュボード（ペルソナ一覧）
  login/page.tsx                        # ログイン・新規登録
  onboarding/page.tsx                   # 組織の作成・参加
  org/page.tsx                          # 組織設定（招待コード・チーム管理、管理者のみ）
  personas/
    new/page.tsx                        # ペルソナ作成
    [id]/page.tsx                       # ペルソナ詳細・編集
    [id]/share/page.tsx                 # 個人単位の共有設定（所有者のみ）
  chat/
    new/page.tsx                        # 1対1会話の作成（?persona=IDで起動）
    [id]/page.tsx                       # 1対1チャット画面
    new-multi/page.tsx                  # 複数人議論の作成（ペルソナ選択）
    multi/[id]/page.tsx                 # 複数人議論画面
  conversations/page.tsx                # 会話ログ一覧
  api/
    conversations/[id]/reply/route.ts   # POST: 指定ペルソナとしてGemini応答を生成・保存
    personas/[id]/feedback/route.ts     # POST: フィードバックを踏まえた人格設定の改訂案をGeminiで生成・保存
lib/
  supabase.ts                           # Supabaseクライアント（ブラウザ用 / サーバー用）
  gemini.ts                             # Gemini APIクライアント
  personaReply.ts                       # ペルソナ発言生成の共通ロジック（1対1・複数人議論の両方から利用）
  useAuth.ts                            # ログイン必須ページ共通のガード（未ログイン→/login、組織未所属→/onboarding）
types/
  index.ts                              # 共通型定義
supabase/
  migrations/
    001_init.sql                        # DBスキーマ（組織・チーム・ペルソナ・会話ログ・RLS）
    002_persona_feedback.sql            # persona_feedback（フィードバックで育てる機能）
    003_persona_shares.sql              # persona_shares（個人単位の共有）
    004_join_approval.sql               # join_requests（組織参加の承認フロー）
    000_combined_idempotent.sql         # 001〜004をまとめた、何度実行しても安全な統合SQL
```

## データモデルの要点

- **公開範囲**: ペルソナは `private`（自分のみ）/ `team`（チーム内）/ `org`（組織全体）を持ち、RLSで閲覧範囲を制御する。編集・削除は作成者のみ。
- **個人単位の共有**: 上記の `visibility` とは別に、`persona_shares` テーブルで特定の組織メンバーにだけ閲覧・壁打ち権限を渡せる（`/personas/[id]/share`、所有者のみ操作可）。招待された側が管理者権限を持つことはない。共有は「閲覧＋壁打ち」のみで、編集・削除・フィードバック送信はできない。
- **会話ログ**: `conversations` / `conversation_personas` / `messages` は作成者本人にのみ閲覧・操作権限がある（RLSで非公開）。他人が作ったペルソナと議論しても、そのログは自分だけのもの。
- **組織参加**: `create_organization` / `request_join_organization` / `approve_join_request` という SECURITY DEFINER 関数経由でのみ `profiles.org_id` / `role` を変更できる（直接更新は `display_name` のみ許可）。招待コードを入力しても即時参加はせず、`join_requests` に `pending` 状態の申請が作られるだけ。組織の管理者が `/org` の「参加申請」で承認して初めて `profiles.org_id` / `role` が更新される。却下はテーブル更新のみ（`status` を `rejected` にできるだけで `approved` には直接できない）でRLS側からも承認バイパスを防いでいる。
- **フィードバックで育てる**: ペルソナの発言に「これは違う」とフィードバックを送ると、Geminiが現在の人格設定＋フィードバックをもとに改訂案（`persona_feedback.proposed_system_prompt`）を生成する。**自動反映はしない**。ペルソナ所有者が `/personas/[id]/feedback` で内容を確認し、「反映する」を押して初めて `personas.system_prompt` が更新される。フィードバックの送信・反映・却下はすべてペルソナ所有者のみ（RLSで制御）。共有された側（他人のペルソナを閲覧・壁打ちできる人）はフィードバックを送信できない。

## 環境変数

| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase公開キー |
| `GEMINI_API_KEY` | Google Gemini API認証（サーバーサイドのみ） |

## 実装方針

review-bridge (`/CLAUDE.md`) の方針を踏襲する。特に以下を守る。

- 仕様が不明な場合は実装前に確認する。推測で進めない。
- 同じコードが3箇所以上になるまで共通化しない。
- 判断・分類・要約など曖昧な処理はGemini APIに任せ、ルーティング・バリデーションなど決定論的な処理はコードに書く。
- ビルドが通った・型が合っただけでは「動作確認済み」と言わない。実際の画面確認が必要な場合は明示する。

## 未実装・今後の課題

- 複数人議論の「ラウンドを進める」は現状ボタン操作（手動進行）。自動連続進行は未実装。
- チームからのメンバー削除時、そのチーム限定公開のペルソナは表示され続ける（team_idの整合性チェックなし）。
- パスワードリセット・メール確認などのアカウント管理フローは未実装。
