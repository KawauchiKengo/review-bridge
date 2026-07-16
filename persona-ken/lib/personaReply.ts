import { SupabaseClient } from '@supabase/supabase-js'
import { getGeminiModel } from '@/lib/gemini'
import { Persona, Message } from '@/types'

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
  const result = await model.generateContent(prompt)
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
