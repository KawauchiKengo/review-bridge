'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewSubmissionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    abstract: '',
    journal_name: '',
    author_name: '',
    author_email: '',
    keywords: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? '登録に失敗しました')
      setLoading(false)
      return
    }

    const submission = await res.json()
    router.push(`/submissions/${submission.id}`)
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">査読依頼を登録</h1>
        <p className="text-sm text-gray-500 mt-1">論文情報を入力すると、AIが適切な査読者候補を提案します</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">論文タイトル <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            required
            placeholder="例: 深層学習を用いた医療画像診断の自動化"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">アブストラクト <span className="text-red-500">*</span></label>
          <textarea
            value={form.abstract}
            onChange={set('abstract')}
            required
            rows={6}
            placeholder="論文の概要を入力してください（AIがこの内容を分析して査読者を提案します）"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ジャーナル名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.journal_name}
              onChange={set('journal_name')}
              required
              placeholder="例: 情報処理学会論文誌"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">著者名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.author_name}
              onChange={set('author_name')}
              required
              placeholder="例: 山田 太郎"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">著者メールアドレス <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={form.author_email}
            onChange={set('author_email')}
            required
            placeholder="利益相反チェックに使用します"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">キーワード（カンマ区切り）</label>
          <input
            type="text"
            value={form.keywords}
            onChange={set('keywords')}
            placeholder="例: 機械学習, 医療画像, 深層学習"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '登録中...' : '登録してAI分析へ'}
          </button>
        </div>
      </form>
    </div>
  )
}
