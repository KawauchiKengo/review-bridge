'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { Persona, PersonaFeedback } from '@/types'

const statusLabel: Record<PersonaFeedback['status'], string> = {
  pending: '未対応',
  applied: '反映済み',
  dismissed: '却下済み',
}

export default function PersonaFeedbackPage() {
  const params = useParams<{ id: string }>()
  const { profile, loading } = useAuth()
  const [persona, setPersona] = useState<Persona | null>(null)
  const [feedbackList, setFeedbackList] = useState<PersonaFeedback[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (profile) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function load() {
    const [{ data: p }, { data: fb }] = await Promise.all([
      supabase.from('personas').select('*').eq('id', params.id).single(),
      supabase
        .from('persona_feedback')
        .select('*')
        .eq('persona_id', params.id)
        .order('created_at', { ascending: false }),
    ])
    setPersona(p)
    setFeedbackList(fb ?? [])
  }

  const isOwner = !!(profile && persona && persona.owner_id === profile.id)

  const handleApply = async (item: PersonaFeedback) => {
    setProcessingId(item.id)
    await supabase.from('personas').update({ system_prompt: item.proposed_system_prompt }).eq('id', item.persona_id)
    await supabase
      .from('persona_feedback')
      .update({ status: 'applied', resolved_at: new Date().toISOString() })
      .eq('id', item.id)
    setProcessingId(null)
    load()
  }

  const handleDismiss = async (item: PersonaFeedback) => {
    setProcessingId(item.id)
    await supabase
      .from('persona_feedback')
      .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
      .eq('id', item.id)
    setProcessingId(null)
    load()
  }

  if (loading || !profile || !persona) return <p className="text-gray-500 text-sm">読み込み中...</p>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{persona.name} へのフィードバック</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isOwner ? '内容を確認し、反映するか判断してください' : 'あなたが送ったフィードバックの一覧です'}
        </p>
      </div>

      {feedbackList.length === 0 && <p className="text-sm text-gray-500">まだフィードバックはありません</p>}

      <div className="space-y-4">
        {feedbackList.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  item.status === 'pending'
                    ? 'bg-yellow-50 text-yellow-700'
                    : item.status === 'applied'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {statusLabel[item.status]}
              </span>
              <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString('ja-JP')}</span>
            </div>

            <p className="text-sm text-gray-900 mb-2">{item.feedback_text}</p>

            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {expandedId === item.id ? '改訂案を閉じる' : '改訂案を見る'}
            </button>

            {expandedId === item.id && (
              <textarea
                readOnly
                value={item.proposed_system_prompt}
                rows={10}
                className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 resize-none"
              />
            )}

            {isOwner && item.status === 'pending' && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleDismiss(item)}
                  disabled={processingId === item.id}
                  className="border border-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  却下
                </button>
                <button
                  onClick={() => handleApply(item)}
                  disabled={processingId === item.id}
                  className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {processingId === item.id ? '反映中...' : '反映する'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
