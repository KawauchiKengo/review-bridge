'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { Conversation, Message, Persona } from '@/types'
import PersonaFeedbackButton from '@/app/components/PersonaFeedbackButton'

export default function MultiChatPage() {
  const params = useParams<{ id: string }>()
  const { profile, loading } = useAuth()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [advancing, setAdvancing] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profile) return
    Promise.all([
      supabase.from('conversations').select('*').eq('id', params.id).single(),
      supabase.from('conversation_personas').select('persona:personas(*)').eq('conversation_id', params.id),
      supabase.from('messages').select('*').eq('conversation_id', params.id).order('created_at', { ascending: true }),
    ]).then(([{ data: conv }, { data: cp }, { data: msgs }]) => {
      setConversation(conv)
      setPersonas(((cp ?? []) as unknown as { persona: Persona }[]).map((r) => r.persona).filter(Boolean))
      setMessages(msgs ?? [])
    })
  }, [profile, params.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const personaNameById = Object.fromEntries(personas.map((p) => [p.id, p.name]))

  const handleAdvanceRound = async () => {
    setAdvancing(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()

    for (const persona of personas) {
      const res = await fetch(`/api/conversations/${params.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ persona_id: persona.id }),
      })
      if (!res.ok) {
        setError('AIの応答に失敗しました')
        break
      }
      const { message } = await res.json()
      setMessages((m) => [...m, message])
    }

    setAdvancing(false)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setSendingMessage(true)
    setError('')

    const { data: userMessage, error: insertError } = await supabase
      .from('messages')
      .insert({ conversation_id: params.id, sender_type: 'user', content: input })
      .select()
      .single()

    if (insertError || !userMessage) {
      setError('送信に失敗しました')
      setSendingMessage(false)
      return
    }

    setMessages((m) => [...m, userMessage])
    setInput('')
    setSendingMessage(false)
  }

  if (loading || !profile || !conversation) return <p className="text-gray-500 text-sm">読み込み中...</p>

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">{conversation.title || '議論'}</h1>
        <p className="text-sm text-gray-500">参加者: {personas.map((p) => p.name).join('、')}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 bg-white border border-gray-200 rounded-xl p-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                m.sender_type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            >
              {m.sender_type === 'persona' && (
                <p className="text-xs font-medium text-gray-500 mb-1">{personaNameById[m.persona_id ?? ''] ?? 'AI'}</p>
              )}
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.sender_type === 'persona' && m.persona_id && (
                <PersonaFeedbackButton personaId={m.persona_id} messageId={m.id} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mt-3">{error}</div>}

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleAdvanceRound}
          disabled={advancing || personas.length === 0}
          className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {advancing ? '議論中...' : '次のラウンドを進める'}
        </button>
        <form onSubmit={handleSend} className="flex flex-1 gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="あなたの発言を追加（任意）"
            disabled={sendingMessage}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={sendingMessage || !input.trim()}
            className="border border-gray-300 text-gray-700 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            発言する
          </button>
        </form>
      </div>
    </div>
  )
}
