'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PersonaFeedbackButton({ personaId, messageId }: { personaId: string; messageId: string }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/personas/${personaId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ message_id: messageId, feedback_text: text }),
    })

    setSubmitting(false)
    if (res.ok) {
      setSubmitted(true)
      setOpen(false)
    }
  }

  if (submitted) {
    return <p className="text-xs text-gray-400 mt-1">フィードバックを送信しました</p>
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors"
      >
        👎 これは違う
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-1.5 space-y-1.5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="どう違うか一言で（例: ここまで強く言わない）"
        rows={2}
        autoFocus
        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="text-xs bg-gray-800 text-white px-3 py-1 rounded-md hover:bg-gray-900 disabled:opacity-50 transition-colors"
        >
          {submitting ? '送信中...' : '送信'}
        </button>
      </div>
    </form>
  )
}
