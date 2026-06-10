import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { XReplyResult } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// 格上アカウントへのリプライは500人規模での最大の流入経路。
// 賛同で終わらず、ジェネラリストの横断視点で価値を足すと相手のフォロワーに刺さる。
export async function POST(req: NextRequest) {
  const { target_post, style_samples, author_profile } = await req.json()

  if (!target_post || typeof target_post !== 'string' || target_post.trim().length === 0) {
    return NextResponse.json({ error: '返信先の投稿を入力してください' }, { status: 400 })
  }

  const samples = typeof style_samples === 'string' ? style_samples.trim() : ''
  const profile = typeof author_profile === 'string' ? author_profile.trim() : ''

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.95 },
  })

  const profileSection = profile
    ? `# あなた（書き手）の経歴・立場
${profile}
強みはジェネラリストであること。返信の価値は、相手の話に別の引き出しの原理を持ち込んで
新しい角度を一つ足すところにある。肩書きは羅列せず視点として滲ませる。こじつけは禁止。

`
    : ''

  const styleSection = samples
    ? `# あなた（書き手）の過去投稿（文体の見本）
語尾・文の長さ・リズム・記号の使い方を再現し、この人が書いたと分かる返信にする。
話題やフレーズの流用はしない。

----- 過去投稿ここから -----
${samples}
----- 過去投稿ここまで -----

`
    : ''

  const prompt = `あなたはX（旧Twitter）で、他人の投稿に的確な返信を付ける書き手です。
目的は、相手のフォロワーが「この人を follow したい」と思う返信を作ること。

${profileSection}${styleSection}# 良い返信の条件
- 単なる賛同・感想・お世辞で終わらない。相手の論に「新しい角度」を一つ足す。
- あなたの横断的な経歴の引き出しから、相手が見ていない一点を持ち込む。
- 離れた領域をつなぐときは「構造の共通性」で架ける（表面の類似でこじつけない）。
- 相手の主張が「現象・課題・論点」のどれかを見極め、一段ずらした論点で返す。
- 相手を否定して論破しにいかない。乗っかった上で広げる。
- 140字以内。1行目（結論ファースト）で価値を感じさせる。
- 過度な絵文字・媚び・定型句（「勉強になります」等）は禁止。

# 手順
1. 相手の投稿の主張の核を捉える。
2. あなたの経歴の引き出しのうち、相手の分野とは離れたものを使って架けられる橋を探す。
3. 角度の異なる返信候補を3つ作る。

# 出力形式
JSONのみを返す。前後に説明文・コードフェンス・余計な文字を一切付けない。
{
  "candidates": [
    { "angle": "...", "reply": "...", "note": "..." }
  ]
}

# 返信先の投稿
${target_post}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI応答の解析に失敗しました' }, { status: 500 })
    }
    const parsed: XReplyResult = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'リプライ候補の生成に失敗しました' }, { status: 500 })
  }
}
