'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: rpcError } = await supabase.rpc('create_organization', { org_name: orgName })
    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: rpcError } = await supabase.rpc('join_organization', { code: inviteCode })
    if (rpcError || !data) {
      setError(rpcError?.message ?? '招待コードが正しくありません')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">組織の設定</h1>
        <p className="text-sm text-gray-500 mt-1">ペルソナはチーム・組織単位で共有できます。まずは所属先を決めてください。</p>
      </div>

      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">新しく組織を作る</h2>
        <input
          type="text"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          required
          placeholder="組織名（例: 営業部）"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          作成する（自分が管理者になります）
        </button>
      </form>

      <form onSubmit={handleJoin} className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">招待コードで参加する</h2>
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          required
          placeholder="招待コード"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full border border-gray-300 text-gray-700 text-sm py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          参加する
        </button>
      </form>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
    </div>
  )
}
