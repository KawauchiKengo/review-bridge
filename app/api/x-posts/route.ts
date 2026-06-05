import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { XPostResult } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const { news, style_samples } = await req.json()

  if (!news || typeof news !== 'string' || news.trim().length === 0) {
    return NextResponse.json({ error: 'ニュース本文を入力してください' }, { status: 400 })
  }

  const samples = typeof style_samples === 'string' ? style_samples.trim() : ''

  // responseMimeType でJSON出力を強制し、parse失敗を減らす（無償）。
  // temperatureを上げて蝶番の発想を発散させ、横並びの浅い候補を避ける。
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.95 },
  })

  // 過去投稿が渡されたら、文体と視点の癖の見本として先頭に置く。
  // これが「私の文章に近い」かつ「私らしい深さ」を生む唯一の手段。
  const styleSection = samples
    ? `# あなた（書き手）の過去投稿（最優先で再現する見本）
以下はこのアカウントの実際の投稿です。次の2点を抽出し、全候補に反映せよ。
1. 文体: 語彙・一人称・語尾・文の長さとリズム・改行や記号の使い方・絵文字の有無。一般的な解説文ではなく、この人が書いたと分かる文章にする。
2. 視点の癖: この人が物事を見るときの典型的な切り口・価値観・こだわり。蝶番(hinge)の選び方自体を、この人ならどこを突くかに寄せる。
※真似るのは「文体と視点」であり、過去投稿の話題やフレーズをそのまま流用しない。

----- 過去投稿ここから -----
${samples}
----- 過去投稿ここまで -----

`
    : ''

  // 深さの本体はこのプロンプト。要約・感想ではなく「蝶番（hinge）」を特定し、
  // それが逆に振れたら結論がどう反転するかを示すことで、読者の次の予想を変える。
  const prompt = `あなたはニュースを深く読み解き、X（旧Twitter）の投稿候補を作る編集者です。
浅い投稿は禁止です。ここでの「深さ」の定義はただ一つ、「読者が次に何が起きるかの予想を、読む前と後で変えること」です。

${styleSection}# 思考の手順（必ずこの順で考える）
1. このニュースの本質的な問い（core_question）を一つ特定する。誰もが見る「正面の話題」を一度言語化し、それを意図的に捨てて、皆が見落としている問いを選ぶ。
2. このニュースの「蝶番（hinge）」を最低5つ書き出し、最も非自明なものから3つを選ぶ。蝶番とは、それが逆に振れると話全体の意味が反転するような一変数のこと。
   （例: 値上げ報道なら「同業他社が追随したか否か」。追随＝価格転嫁できる側に回った合図、非追随＝その一社の体力切れの兆候、と意味が正反対になる。）
3. 選んだ3つの蝶番それぞれを軸に、視点・視座の異なる投稿候補を作る。3候補は「時間軸の長さ（短期/長期）」か「抽象度（個人/業界/社会）」のどちらかで必ずズラす。

# 各候補が満たすこと
- hinge: 肝となる一変数を一文で。「多い/少ない」「した/しない」のように、逆方向が明確に言えるものにする。
- reversal: その変数が逆に振れたら結論がどう反転するかを一文で。賭け（外れうる主張）になっていること。
- angle: 視点・視座のラベル（例: 当事者の損得 / 業界構造 / 長期の時間軸 / 隣接領域との接続）。3候補で重複させない。
- post: X投稿本文。140字以内。冒頭で「皆が見る正面」を否定し、蝶番を指す。読者が後で自分で確認できる「次に見るべき具体的な一点」を必ず含める。背景説明で字数を埋めない。
- self_check: 自己診断を一文で。差し替えテスト（ニュースを別の事件に差し替えても成立する文＝不可）と確率テスト（読者の予想を変えるか）に合格しているか述べる。不合格なら作り直すこと。

# 禁止事項
- 要約や言い換えだけで終わる。
- 背景説明を並べただけ（長いだけで浅い）。
- 「賛否が分かれる」「今後の動向が注目される」「目が離せない」などの無情報な締め。
- どのニュースにも貼れる一般論への退避。
- 蝶番が「正面の話題」そのものになっている（非自明さがない）。

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
