'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Submission } from '@/types'

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: '受付済み', className: 'bg-yellow-100 text-yellow-800' },
  analyzing: { label: 'AI分析中', className: 'bg-blue-100 text-blue-800' },
  ready: { label: '候補準備完了', className: 'bg-green-100 text-green-800' },
  assigned: { label: '査読者決定', className: 'bg-purple-100 text-purple-800' },
}

export default function HomePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/submissions')
      .then(r => r.json())
      .then(data => { setSubmissions(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">査読依頼一覧</h1>
          <p className="text-sm text-gray-500 mt-1">投稿論文の査読者マッチングを管理します</p>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400">読み込み中...</div>
      )}

      {!loading && submissions.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-4">まだ査読依頼がありません</p>
          <Link href="/submissions/new" className="text-blue-600 hover:underline text-sm">
            最初の依頼を登録する →
          </Link>
        </div>
      )}

      {!loading && submissions.length > 0 && (
        <div className="space-y-3">
          {submissions.map(s => {
            const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.pending
            return (
              <Link key={s.id} href={`/submissions/${s.id}`}>
                <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{s.title}</p>
                      <p className="text-sm text-gray-500 mt-1">{s.journal_name} · {s.author_name}</p>
                      {s.ai_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.ai_tags.slice(0, 4).map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.className}`}>{st.label}</span>
                      <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
