import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { XPostResult } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const { news } = await req.json()

  if (!news || typeof news !== 'string' || news.trim().length === 0) {
    return NextResponse.json({ error: 'ニュース本文を入力してください' }, { status: 400 })
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  // 深さの本体はこのプロンプト。要約・感想ではなく「蝶番（hinge）」を特定し、
  // それが逆に振れたら結論がどう反転するかを示すことで、読者の次の予想を変える。
  const prompt = `あなたはニュースを深く読み解き、X（旧Twitter）の投稿候補を作る編集者です。
浅い投稿は禁止です。ここでの「深さ」の定義はただ一つ、「読者が次に何が起きるかの予想を、読む前と後で変えること」です。

# 思考の手順（必ずこの順で考える）
1. このニュースの本質的な問い（core_question）を一つ特定する。正面の話題ではなく、皆が見落としている問いを選ぶ。
2. このニュースの「蝶番（hinge）」を複数見つける。蝶番とは、それが逆に振れると話全体の意味が反転するような一変数のこと。
   （例: 値上げ報道なら「同業他社が追随したか否か」。追随＝価格転嫁できる側に回った合図、非追随＝その一社の体力切れの兆候、と意味が正反対になる。）
3. 異なる蝶番を軸に、互いに視点の異なる投稿候補を3つ作る。

# 各候補が満たすこと
- hinge: 肝となる一変数を一文で。
- reversal: その変数が逆に振れたら結論がどう反転するかを一文で。
- angle: 視点・視座のラベル（例: 当事者の損得 / 業界構造 / 長期の時間軸 / 隣接領域との接続）。3候補で重複させない。
- post: X投稿本文。140字以内。蝶番を指し、読者に「次に見るべき一点」を渡す。背景説明で字数を埋めない。
- self_check: 自己診断を一文で。差し替えテスト（ニュースを別の事件に差し替えても成立する文＝不可）と確率テスト（読者の予想を変えるか）に合格しているか述べる。

# 禁止事項
- 要約や言い換えだけで終わる。
- 背景説明を並べただけ（長いだけで浅い）。
- 「賛否が分かれる」「今後の動向が注目される」などの無情報な締め。
- どのニュースにも貼れる一般論への退避。

# 出力形式
JSONのみを返す。前後に説明文・コードフェンス・余計な文字を一切付けない。
{
  "core_question": "...",
  "candidates": [
    { "hinge": "...", "reversal": "...", "angle": "...", "post": "...", "self_check": "..." }
  ]
}

# 対象ニュース
${news}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI応答の解析に失敗しました' }, { status: 500 })
    }
    const parsed: XPostResult = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'X投稿候補の生成に失敗しました' }, { status: 500 })
  }
}
