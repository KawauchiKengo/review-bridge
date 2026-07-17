'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { Conversation, Persona } from '@/types'

type ConversationRow = Conversation & { personas: Persona[] }

export default function ConversationsPage() {
  const { profile, loading } = useAuth()
  const [conversations, setConversations] = useState<ConversationRow[]>([])

  useEffect(() => {
    if (!profile) return
    supabase
      .from('conversations')
      .select('*, conversation_personas(persona:personas(*))')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = ((data ?? []) as unknown as (Conversation & {
          conversation_personas: { persona: Persona }[]
        })[]).map((c) => ({ ...c, personas: c.conversation_personas.map((cp) => cp.persona).filter(Boolean) }))
        setConversations(rows)
      })
  }, [profile])

  if (loading || !profile) return <p className="text-gray-500 text-sm">読み込み中...</p>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">会話ログ</h1>
        <p className="text-sm text-gray-500 mt-1">これまでの壁打ち・議論の履歴</p>
      </div>

      {conversations.length === 0 && <p className="text-sm text-gray-500">まだ会話履歴がありません</p>}

      <div className="space-y-2">
        {conversations.map((c) => (
          <Link
            key={c.id}
            href={c.type === 'multi' ? `/chat/multi/${c.id}` : `/chat/${c.id}`}
            className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-900">{c.title || '無題の会話'}</h2>
              <span className="text-xs text-gray-400">{c.type === 'multi' ? '複数人議論' : '1対1'}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{c.personas.map((p) => p.name).join('、')}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
