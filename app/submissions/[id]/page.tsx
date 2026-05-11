'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Submission, Reviewer } from '@/types'

type Candidate = Reviewer & { match_score: number; coi_flag: boolean }

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: '受付済み', className: 'bg-yellow-100 text-yellow-800' },
  analyzing: { label: 'AI分析中', className: 'bg-blue-100 text-blue-800' },
  ready: { label: '候補準備完了', className: 'bg-green-100 text-green-800' },
  assigned: { label: '査読者決定', className: 'bg-purple-100 text-purple-800' },
}

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [analyzing, setAnalyzing] = useState(false)
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then(r => r.json())
      .then(setSubmission)
  }, [id])

  useEffect(() => {
    if (submission?.status === 'ready' || submission?.status === 'assigned') {
      loadCandidates()
    }
  }, [submission?.status])

  const loadCandidates = async () => {
    setLoadingCandidates(true)
    const res = await fetch(`/api/submissions/${id}/candidates`)
    const data = await res.json()
    setCandidates(Array.isArray(data) ? data : [])
    setLoadingCandidates(false)
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setSubmission(s => s ? { ...s, status: 'analyzing' } : s)
    const res = await fetch(`/api/submissions/${id}/analyze`, { method: 'POST' })
    if (res.ok) {
      const updated = await fetch(`/api/submissions/${id}`).then(r => r.json())
      setSubmission(updated)
    }
    setAnalyzing(false)
  }

  const handleSelect = async (reviewer: Candidate) => {
    const res = await fetch(`/api/submissions/${id}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer_id: reviewer.id, match_score: reviewer.match_score, coi_flag: reviewer.coi_flag }),
    })
    const data = await res.json()
    setSelected(prev => {
      const next = new Set(prev)
      if (data.selected) next.add(reviewer.id)
      else next.delete(reviewer.id)
      return next
    })
  }

  if (!submission) return <div className="text-center py-16 text-gray-400">読み込み中...</div>

  const st = STATUS_LABEL[submission.status] ?? STATUS_LABEL.pending

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← 一覧に戻る
      </button>

      {/* 論文情報 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-bold text-gray-900 leading-snug">{submission.title}</h1>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${st.className}`}>{st.label}</span>
        </div>
        <div className="text-sm text-gray-500 mb-3">{submission.journal_name} · {submission.author_name} · {submission.author_email}</div>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">{submission.abstract}</p>

        {submission.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {submission.keywords.map(k => (
              <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{k}</span>
            ))}
          </div>
        )}

        {submission.ai_tags.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-1.5">AIタグ</p>
            <div className="flex flex-wrap gap-1.5">
              {submission.ai_tags.map(tag => (
                <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {submission.status === 'pending' && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="mt-5 w-full bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {analyzing ? '✨ AI分析中...' : '✨ AIで論文を分析して査読者を探す'}
          </button>
        )}

        {submission.status === 'analyzing' && (
          <div className="mt-5 text-center text-sm text-blue-600 py-2">AIが論文を分析中です...</div>
        )}

        {(submission.status === 'ready' || submission.status === 'assigned') && candidates.length === 0 && !loadingCandidates && (
          <button
            onClick={loadCandidates}
            className="mt-5 w-full border border-blue-300 text-blue-600 text-sm py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            査読者候補を表示
          </button>
        )}
      </div>

      {/* 査読者候補 */}
      {loadingCandidates && (
        <div className="text-center py-8 text-gray-400 text-sm">候補を検索中...</div>
      )}

      {candidates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">査読者候補 ({candidates.length}名)</h2>
            {selected.size > 0 && (
              <span className="text-sm text-green-600 font-medium">{selected.size}名を選択中</span>
            )}
          </div>
          <div className="space-y-3">
            {candidates.map(c => (
              <div
                key={c.id}
                className={`bg-white border rounded-xl p-4 transition-all ${
                  selected.has(c.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                } ${c.coi_flag ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      {c.coi_flag && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">COI注意</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{c.affiliation}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.expertise_tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">査読実績: {c.review_count}件</p>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">{c.match_score}%</div>
                      <div className="text-xs text-gray-400">マッチ度</div>
                    </div>
                    {!c.coi_flag && (
                      <button
                        onClick={() => handleSelect(c)}
                        className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
                          selected.has(c.id)
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {selected.has(c.id) ? '✓ 選択済み' : '選択'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
