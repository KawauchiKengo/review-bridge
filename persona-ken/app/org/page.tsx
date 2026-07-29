'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { Team, Profile, Organization, JoinRequest } from '@/types'

export default function OrgPage() {
  const { profile, loading } = useAuth()
  const [org, setOrg] = useState<Organization | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [teamMembers, setTeamMembers] = useState<Record<string, string[]>>({})
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [error, setError] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    if (profile) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function load() {
    if (!profile?.org_id) return
    const [{ data: orgData }, { data: teamsData }, { data: membersData }, { data: tmData }, { data: requestsData }] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', profile.org_id).single(),
      supabase.from('teams').select('*').eq('org_id', profile.org_id).order('created_at'),
      supabase.from('profiles').select('*').eq('org_id', profile.org_id).order('display_name'),
      supabase.from('team_members').select('team_id, user_id'),
      supabase.from('join_requests').select('*').eq('org_id', profile.org_id).eq('status', 'pending').order('created_at'),
    ])
    setOrg(orgData)
    setTeams(teamsData ?? [])
    setMembers(membersData ?? [])
    setJoinRequests(requestsData ?? [])

    const grouped: Record<string, string[]> = {}
    for (const row of tmData ?? []) {
      grouped[row.team_id] = [...(grouped[row.team_id] ?? []), row.user_id]
    }
    setTeamMembers(grouped)
  }

  const handleApprove = async (requestId: string) => {
    setResolvingId(requestId)
    await supabase.rpc('approve_join_request', { request_id: requestId })
    setResolvingId(null)
    load()
  }

  const handleReject = async (requestId: string) => {
    setResolvingId(requestId)
    await supabase
      .from('join_requests')
      .update({ status: 'rejected', resolved_at: new Date().toISOString() })
      .eq('id', requestId)
    setResolvingId(null)
    load()
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const { error: insertError } = await supabase
      .from('teams')
      .insert({ org_id: profile!.org_id, name: newTeamName })

    if (insertError) {
      setError(insertError.message)
      return
    }
    setNewTeamName('')
    load()
  }

  const toggleMember = async (teamId: string, userId: string, isMember: boolean) => {
    if (isMember) {
      await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId)
    } else {
      await supabase.from('team_members').insert({ team_id: teamId, user_id: userId })
    }
    load()
  }

  if (loading || !profile) return <p className="text-gray-500 text-sm">読み込み中...</p>

  const isAdmin = profile.role === 'admin'

  if (!isAdmin) return <p className="text-gray-500 text-sm">このページは管理者のみ利用できます</p>

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">組織設定</h1>
        <p className="text-sm text-gray-500 mt-1">{org?.name}</p>
      </div>

      {isAdmin && org && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-2">招待コード</h2>
          <p className="text-sm text-gray-500 mb-2">このコードを伝えると、メンバーが組織への参加を申請できます。参加には管理者の承認が必要です。</p>
          <code className="bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono">{org.invite_code}</code>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">参加申請</h2>

          {joinRequests.length === 0 && <p className="text-sm text-gray-500">承認待ちの申請はありません</p>}

          {joinRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-2.5">
              <span className="text-sm text-gray-900">{req.requester_display_name || req.user_id}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReject(req.id)}
                  disabled={resolvingId === req.id}
                  className="border border-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  却下
                </button>
                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={resolvingId === req.id}
                  className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  承認
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">チーム</h2>

        {isAdmin && (
          <form onSubmit={handleCreateTeam} className="flex gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="新しいチーム名"
              required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              作成
            </button>
          </form>
        )}

        {teams.length === 0 && <p className="text-sm text-gray-500">チームはまだありません</p>}

        {teams.map((team) => (
          <div key={team.id} className="border border-gray-100 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">{team.name}</h3>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const isMember = (teamMembers[team.id] ?? []).includes(m.id)
                return (
                  <button
                    key={m.id}
                    disabled={!isAdmin}
                    onClick={() => toggleMember(team.id, m.id, isMember)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      isMember
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    } ${!isAdmin ? 'cursor-default opacity-70' : ''}`}
                  >
                    {m.display_name || m.id}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
    </div>
  )
}
