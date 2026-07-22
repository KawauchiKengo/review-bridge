import { SupabaseClient } from '@supabase/supabase-js'
import { getGeminiModel } from '@/lib/gemini'
import { Persona, Message } from '@/types'

// Geminiが一時的に混雑（503）している場合は少し待って自動リトライする
async function generateContentWithRetry(
  model: ReturnType<typeof getGeminiModel>,
  prompt: string,
  maxAttempts = 3
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await model.generateContent(prompt)
    } catch (error) {
      const status = (error as { status?: number })?.status
      if (status === 503 && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        continue
      }
      throw error
    }
  }
  throw new Error('Geminiへのリクエストに失敗しました')
}

// 指定したペルソナとして、これまでの会話を踏まえた次の発言をGeminiに生成させ、messagesに保存する
export async function generatePersonaReply(
  supabase: SupabaseClient,
  conversationId: string,
  persona: Persona,
  personaNameById: Record<string, string>
): Promise<Message> {
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  const transcript = ((messages ?? []) as Message[])
    .map((m) => {
      const speaker = m.sender_type === 'user' ? 'ユーザー' : (personaNameById[m.persona_id ?? ''] ?? 'AI')
      return `${speaker}: ${m.content}`
    })
    .join('\n')

  const prompt = `あなたは以下の人格として、この会話に参加者の一人として発言してください。

【あなたの人格設定】
名前: ${persona.name}
役割: ${persona.role || '未設定'}
口調: ${persona.tone || '未設定'}
視点・専門性: ${persona.viewpoint || '未設定'}
詳細な人格設定: ${persona.system_prompt}

【これまでの会話】
${transcript || '（まだ発言はありません）'}

上記を踏まえて、${persona.name}として次の発言を書いてください。発言内容のみを出力し、名前や接頭辞は付けないでください。`

  const model = getGeminiModel()
  const result = await generateContentWithRetry(model, prompt)
  const text = result.response.text().trim()

  const { data: inserted, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'persona',
      persona_id: persona.id,
      content: text,
    })
    .select()
    .single()

  if (error || !inserted) throw error ?? new Error('メッセージの保存に失敗しました')
  return inserted as Message
}
