import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: submission, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !submission) {
    return NextResponse.json({ error: '投稿が見つかりません' }, { status: 404 })
  }

  await supabase.from('submissions').update({ status: 'analyzing' }).eq('id', id)

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const prompt = `以下の学術論文のタイトルとアブストラクトを分析し、査読者選定に使える専門分野タグを5〜8個生成してください。
タグは日本語で、具体的な研究分野名にしてください。
JSON配列形式のみで返してください。例: ["機械学習", "深層学習", "自然言語処理"]

タイトル: ${submission.title}
アブストラクト: ${submission.abstract}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const jsonMatch = text.match(/\[.*\]/s)
    const tags: string[] = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    await supabase
      .from('submissions')
      .update({ ai_tags: tags, status: 'ready' })
      .eq('id', id)

    return NextResponse.json({ tags })
  } catch (e) {
    await supabase.from('submissions').update({ status: 'pending' }).eq('id', id)
    return NextResponse.json({ error: 'AI分析に失敗しました' }, { status: 500 })
  }
}
