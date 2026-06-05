export type SubmissionStatus = 'pending' | 'analyzing' | 'ready' | 'assigned'

export interface Submission {
  id: string
  title: string
  abstract: string
  journal_name: string
  author_name: string
  author_email: string
  keywords: string[]
  ai_tags: string[]
  status: SubmissionStatus
  created_at: string
}

export interface Reviewer {
  id: string
  name: string
  email: string
  affiliation: string
  expertise_tags: string[]
  review_count: number
  created_at: string
}

export interface XPostCandidate {
  hinge: string        // 肝＝結論を左右する蝶番となる一変数
  reversal: string     // その変数が逆に振れたら結論がどう反転するか
  angle: string        // 視点・視座のラベル（例: 当事者の損得 / 業界構造 / 長期）
  hook: string         // 1行目だけで読む手を止める単独成立のフック
  post: string         // X投稿本文（140字以内、hookで始まる）
  self_check: string   // 差し替えテスト・確率テストの自己診断
}

export interface XReplyCandidate {
  angle: string   // どの引き出し（視座）から橋を架けたか
  reply: string   // 返信本文（140字以内）。賛同で終わらず価値を足す
  note: string    // なぜこの返信が相手のフォロワーに刺さるかの一言
}

export interface XPostResult {
  core_question: string          // このニュースの本質的な問い
  candidates: XPostCandidate[]   // 異なる蝶番を軸にした投稿候補
  trend_replies: XReplyCandidate[] // 伸びている投稿に被せて使う返信/引用ドラフト
}

export interface XReplyResult {
  candidates: XReplyCandidate[]
}

export interface ReviewRequest {
  id: string
  submission_id: string
  reviewer_id: string
  status: 'pending' | 'accepted' | 'declined'
  coi_flag: boolean
  match_score: number
  selected_at: string | null
  reviewer?: Reviewer
}
