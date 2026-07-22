'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { Persona } from '@/types'

const visibilityLabel: Record<Persona['visibility'], string> = {
  private: '自分のみ',
  team: 'チーム内',
  org: '組織全体',
}

export default function DashboardPage() {
  const { profile, loading } = useAuth()
  const [personas, setPersonas] = useState<Persona[]>([])

  useEffect(() => {
    if (!profile) return
    supabase
      .from('personas')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setPersonas(data ?? []))
  }, [profile])

  if (loading || !profile) return <p className="text-gray-500 text-sm">読み込み中...</p>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ペルソナ一覧</h1>
          <p className="text-sm text-gray-500 mt-1">壁打ち相手・議論相手を選んでください</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/conversations"
            className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            会話ログ
          </Link>
          {profile.role === 'admin' && (
            <>
              <Link
                href="/chat/new-multi"
                className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                複数人で議論する
              </Link>
              <Link
                href="/personas/new"
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + ペルソナを作る
              </Link>
            </>
          )}
        </div>
      </div>

      {personas.length === 0 && (
        <p className="text-sm text-gray-500">
          {profile.role === 'admin'
            ? 'まだペルソナがありません。最初のペルソナを作ってみましょう。'
            : 'まだ共有されたペルソナがありません。管理者に共有を依頼してください。'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {personas.map((p) => (
          <Link
            key={p.id}
            href={`/personas/${p.id}`}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-gray-900">{p.name}</h2>
              <span className="text-xs text-gray-400">{visibilityLabel[p.visibility]}</span>
            </div>
            {p.owner_id === profile.id && p.role && <p className="text-sm text-gray-500">{p.role}</p>}
            {p.owner_id === profile.id && p.viewpoint && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.viewpoint}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
