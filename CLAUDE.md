# CLAUDE.md

## プロジェクト概要

Review Bridge — 学術査読者マッチング支援システム。
Next.js 14 (App Router) + Supabase (PostgreSQL) + Google Gemini API。

## コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npm run lint     # Lint
```

## 禁止事項

**勝手な思い込みをしない**
- 仕様が不明な場合は実装前に確認する。推測で進めない。

**不要な抽象化をしない**
- 同じコードが3箇所以上になるまで共通化しない。1〜2箇所なら重複を許容する。

**関係ない箇所を修正しない**
- 依頼されたファイル・関数のみ変更する。「ついでに」の修正はしない。

**未検証を成功と言わない**
- ビルドが通った、型が合った、だけでは「動作確認済み」と報告しない。
- 不確実な場合は「〜のはずですが、実際に画面で確認してください」と明示する。

## 実装方針

**AI vs コード**
- 判断・分類・要約など曖昧な処理 → Gemini APIに任せる
- ルーティング、リトライ、バリデーションなど決定論的な処理 → コードに書く

**一貫性**
- 矛盾する実装パターンを混ぜない。例: `fetch` と `supabase-js` を同じ目的に両方使わない。
- どちらを採用するか迷ったら、既存コードに合わせるか、使用パターンをここに追記してから実装する。

**実装前の確認**
- 書く前に、関連ファイル・呼び出し元・共通関数を必ず読む。
- `types/index.ts`、`lib/supabase.ts` は変更前に必ず参照する。

**テスト**
- テストは「何が起きるか」だけでなく「なぜそうあるべきか」まで検証する。
- 例: `expect(score).toBe(80)` ではなく `// キーワードが2個一致した場合スコアは80になる` を添える。

## 長い作業のルール

**チェックポイントを置く**
- 3ステップ以上の作業では、ステップごとに完了確認を取る。
- 例: 「DBスキーマ作成が完了しました。次はAPIルート実装に進んでよいですか？」

**トークン予算**
- 1タスクが長引いて文脈が複雑になってきたら、その時点での状況を要約してユーザーに伝え、仕切り直す。

## アーキテクチャ

```
app/
  page.tsx                        # 査読依頼一覧
  submissions/
    new/page.tsx                  # 依頼登録フォーム
    [id]/page.tsx                 # 詳細 + 査読者候補
  api/
    submissions/
      route.ts                    # GET(一覧) / POST(登録)
      [id]/
        route.ts                  # GET(詳細)
        analyze/route.ts          # POST: Gemini APIでタグ付け
        candidates/route.ts       # GET: 候補査読者マッチング
        select/route.ts           # POST: 査読者選択・保存
lib/
  supabase.ts                     # Supabaseクライアント（ブラウザ用）
types/
  index.ts                        # 共通型定義
supabase/
  migrations/001_init.sql         # DBスキーマ + サンプルデータ
```

## 環境変数

| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase公開キー |
| `GEMINI_API_KEY` | Google Gemini API認証（サーバーサイドのみ） |
