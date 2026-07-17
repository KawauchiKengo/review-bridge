import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { getGeminiModel } from '@/lib/gemini'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const supabase = createServerSupabase(authHeader.replace('Bearer ', ''))
  const { message_id, feedback_text } = await req.json()

  if (!feedback_text?.trim()) {
    return NextResponse.json({ error: 'フィードバック内容が空です' }, { status: 400 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: persona } = await supabase.from('personas').select('*').eq('id', id).single()
  if (!persona) {
    return NextResponse.json({ error: 'ペルソナが見つかりません' }, { status: 404 })
  }

  let flaggedMessage = ''
  if (message_id) {
    const { data: message } = await supabase.from('messages').select('content').eq('id', message_id).single()
    flaggedMessage = message?.content ?? ''
  }

  const prompt = `以下は、あるAI人格（ペルソナ）の設定と、そのペルソナが実際に行った発言、そしてその発言に対する「本人らしくない」というフィードバックです。

【現在の人格設定】
${persona.system_prompt}

【問題となった発言】
${flaggedMessage || '（特定の発言なし）'}

【フィードバック】
${feedback_text}

このフィードバックを踏まえて、人格設定を改訂してください。既存の内容は基本的に維持しつつ、フィードバックの内容を反映するように必要な部分だけを修正・追記してください。人格設定の全文のみを出力してください（説明や前置き、後書きは不要です）。`

  try {
    const model = getGeminiModel()
    const result = await model.generateContent(prompt)
    const proposedSystemPrompt = result.response.text().trim()

    const { data: feedback, error } = await supabase
      .from('persona_feedback')
      .insert({
        persona_id: id,
        message_id: message_id ?? null,
        created_by: user.id,
        feedback_text,
        original_system_prompt: persona.system_prompt,
        proposed_system_prompt: proposedSystemPrompt,
      })
      .select()
      .single()

    if (error || !feedback) {
      return NextResponse.json({ error: 'フィードバックの保存に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ feedback })
  } catch {
    return NextResponse.json({ error: '改訂案の生成に失敗しました' }, { status: 500 })
  }
}
