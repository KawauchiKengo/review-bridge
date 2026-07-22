'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { JoinRequest } from '@/types'

export default function OnboardingPage() {
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [latestRequest, setLatestRequest] = useState<JoinRequest | null>(null)
  const [checkingRequest, setCheckingRequest] = useState(true)

  useEffect(() => {
    loadLatestRequest()
  }, [])

  async function loadLatestRequest() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setCheckingRequest(false)
      return
    }
    const { data } = await supabase
      .from('join_requests')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLatestRequest(data)
    setCheckingRequest(false)
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: rpcError } = await supabase.rpc('request_join_organization', { code: inviteCode })
    if (rpcError || !data) {
      setError(rpcError?.message ?? '招待コードが正しくありません')
      setLoading(false)
      return
    }
    setLoading(false)
    setInviteCode('')
    loadLatestRequest()
  }

  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">組織の設定</h1>
        <p className="text-sm text-gray-500 mt-1">管理者から共有された招待コードを入力してください。</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">招待コードで参加する</h2>

        {checkingRequest ? (
          <p className="text-sm text-gray-500">確認中...</p>
        ) : latestRequest?.status === 'pending' ? (
          <p className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2.5 rounded-lg">
            申請中です。組織の管理者の承認をお待ちください。
          </p>
        ) : (
          <>
            {latestRequest?.status === 'rejected' && (
              <p className="text-sm text-red-700 bg-red-50 px-3 py-2.5 rounded-lg">
                前回の申請は却下されました。コードを確認のうえ、再度申請してください。
              </p>
            )}
            <form onSubmit={handleJoin} className="space-y-3">
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
                申請する
              </button>
            </form>
          </>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
    </div>
  )
}
