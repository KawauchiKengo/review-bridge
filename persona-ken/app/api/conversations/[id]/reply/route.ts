import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { generatePersonaReply } from '@/lib/personaReply'
import { Persona } from '@/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const supabase = createServerSupabase(authHeader.replace('Bearer ', ''))
  const { persona_id } = await req.json()

  const { data: conversation } = await supabase.from('conversations').select('*').eq('id', id).single()
  if (!conversation) {
    return NextResponse.json({ error: '会話が見つかりません' }, { status: 404 })
  }

  const { data: participants } = await supabase
    .from('conversation_personas')
    .select('persona:personas(*)')
    .eq('conversation_id', id)

  const allPersonas = ((participants ?? []) as unknown as { persona: Persona }[])
    .map((row) => row.persona)
    .filter(Boolean)

  const personaNameById: Record<string, string> = {}
  for (const p of allPersonas) personaNameById[p.id] = p.name

  const targetPersona = allPersonas.find((p) => p.id === persona_id)
  if (!targetPersona) {
    return NextResponse.json({ error: 'ペルソナが会話に参加していません' }, { status: 404 })
  }

  try {
    const message = await generatePersonaReply(supabase, id, targetPersona, personaNameById)
    return NextResponse.json({ message })
  } catch {
    return NextResponse.json({ error: 'AI応答の生成に失敗しました' }, { status: 500 })
  }
}
