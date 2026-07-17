'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { Persona } from '@/types'

export default function NewMultiChatPage() {
  const router = useRouter()
  const { profile, loading } = useAuth()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return
    supabase
      .from('personas')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setPersonas(data ?? []))
  }, [profile])

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selected.length < 2) {
      setError('2人以上のペルソナを選んでください')
      return
    }
    if (!profile) return
    setCreating(true)
    setError('')

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'multi', title: title || '議論', created_by: profile.id })
      .select()
      .single()

    if (convError || !conversation) {
      setError('作成に失敗しました')
      setCreating(false)
      return
    }

    await supabase
      .from('conversation_personas')
      .insert(selected.map((persona_id) => ({ conversation_id: conversation.id, persona_id })))

    await supabase
      .from('messages')
      .insert({ conversation_id: conversation.id, sender_type: 'user', content: topic })

    router.push(`/chat/multi/${conversation.id}`)
  }

  if (loading || !profile) return <p className="text-gray-500 text-sm">読み込み中...</p>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">複数人で議論する</h1>
        <p className="text-sm text-gray-500 mt-1">2人以上のペルソナを選んで、お題について議論させます</p>
      </div>

      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 新規事業の是非"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            お題 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            rows={4}
            placeholder="議論してほしいテーマや相談内容を入力してください"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">参加させるペルソナ（2人以上）</label>
          <div className="grid grid-cols-2 gap-2">
            {personas.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                  selected.includes(p.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => toggle(p.id)}
                  className="accent-blue-600"
                />
                {p.name}
              </label>
            ))}
          </div>
          {personas.length === 0 && <p className="text-sm text-gray-500">まだペルソナがありません</p>}
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        <button
          type="submit"
          disabled={creating}
          className="w-full bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {creating ? '作成中...' : '議論を始める'}
        </button>
      </form>
    </div>
  )
}
