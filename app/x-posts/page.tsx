'use client'

import { useEffect, useState } from 'react'
import type { XPostResult } from '@/types'

const STYLE_STORAGE_KEY = 'x-posts-style-samples'

export default function XPostsPage() {
  const [news, setNews] = useState('')
  const [styleSamples, setStyleSamples] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<XPostResult | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // 過去投稿の見本はブラウザに保存し、毎回貼り直さずに済むようにする。
  // localStorageはSSR時に無いためmount後に読み込む（定石パターン）。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStyleSamples(localStorage.getItem(STYLE_STORAGE_KEY) ?? '')
  }, [])

  const updateStyleSamples = (value: string) => {
    setStyleSamples(value)
    localStorage.setItem(STYLE_STORAGE_KEY, value)
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    const res = await fetch('/api/x-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ news, style_samples: styleSamples }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? '生成に失敗しました')
      setLoading(false)
      return
    }

    setResult(await res.json())
    setLoading(false)
  }

  const copyPost = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">X投稿候補を生成</h1>
        <p className="text-sm text-gray-500 mt-1">
          ニュースの「肝（蝶番）」を特定し、読者の予想を変える深い投稿候補を提案します
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            ニュース本文 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={news}
            onChange={e => setNews(e.target.value)}
            rows={8}
            placeholder="深掘りしたいニュースの本文や要点を貼り付けてください"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            あなたの過去のX投稿（文体の見本）
          </label>
          <textarea
            value={styleSamples}
            onChange={e => updateStyleSamples(e.target.value)}
            rows={6}
            placeholder="あなたらしい投稿を5〜10本、改行で区切って貼り付けてください。文体と視点の癖を学習し、あなたに近い文章で候補を生成します（ブラウザに保存され、次回も使えます）"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            未入力でも生成できますが、入れるほど「あなたらしさ」と切り口の深さが出ます。
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || news.trim().length === 0}
          className="w-full bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '思考中...' : '投稿候補を生成'}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-medium text-amber-700 mb-1">このニュースの本質的な問い</p>
            <p className="text-sm text-gray-800">{result.core_question}</p>
          </div>

          {result.candidates.map((c, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {c.angle}
                </span>
                <button
                  type="button"
                  onClick={() => copyPost(c.post, i)}
                  className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                >
                  {copiedIndex === i ? 'コピーしました' : '本文をコピー'}
                </button>
              </div>

              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{c.post}</p>

              <div className="border-t border-gray-100 pt-3 space-y-2 text-xs text-gray-600">
                <p><span className="font-medium text-gray-800">肝（蝶番）:</span> {c.hinge}</p>
                <p><span className="font-medium text-gray-800">反転:</span> {c.reversal}</p>
                <p><span className="font-medium text-gray-800">自己診断:</span> {c.self_check}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
