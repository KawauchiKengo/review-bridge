'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

function NewChatInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile, loading } = useAuth()
  const started = useRef(false)

  async function create(personaId: string) {
    const { data: persona } = await supabase.from('personas').select('*').eq('id', personaId).single()
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        type: 'single',
        title: persona ? `${persona.name}との壁打ち` : '壁打ち',
        created_by: profile!.id,
      })
      .select()
      .single()

    if (error || !conversation) {
      router.replace('/')
      return
    }

    await supabase.from('conversation_personas').insert({ conversation_id: conversation.id, persona_id: personaId })
    router.replace(`/chat/${conversation.id}`)
  }

  useEffect(() => {
    if (!profile || started.current) return
    const personaId = searchParams.get('persona')
    if (!personaId) {
      router.replace('/')
      return
    }
    started.current = true
    create(personaId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, searchParams, router])

  return <p className="text-gray-500 text-sm">{loading ? '読み込み中...' : '会話を準備しています...'}</p>
}

export default function NewChatPage() {
  return (
    <Suspense fallback={<p className="text-gray-500 text-sm">読み込み中...</p>}>
      <NewChatInner />
    </Suspense>
  )
}
