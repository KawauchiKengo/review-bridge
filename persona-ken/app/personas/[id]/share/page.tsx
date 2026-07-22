'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { Persona, Profile, PersonaShare } from '@/types'

export default function PersonaSharePage() {
  const params = useParams<{ id: string }>()
  const { profile, loading } = useAuth()
  const [persona, setPersona] = useState<Persona | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [shares, setShares] = useState<PersonaShare[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function load() {
    const { data: p } = await supabase.from('personas').select('*').eq('id', params.id).single()
    setPersona(p)
    if (!p) return

    const [{ data: membersData }, { data: sharesData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('org_id', p.org_id).neq('id', p.owner_id).order('display_name'),
      supabase.from('persona_shares').select('*').eq('persona_id', p.id),
    ])
    setMembers(membersData ?? [])
    setShares(sharesData ?? [])
  }

  const isOwner = !!(profile && persona && persona.owner_id === profile.id)
  const sharedUserIds = new Set(shares.map((s) => s.user_id))

  const toggleShare = async (userId: string) => {
    if (!persona || !profile) return
    setError('')

    if (sharedUserIds.has(userId)) {
      const { error: deleteError } = await supabase
        .from('persona_shares')
        .delete()
        .eq('persona_id', persona.id)
        .eq('user_id', userId)
      if (deleteError) {
        setError(deleteError.message)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('persona_shares')
        .insert({ persona_id: persona.id, user_id: userId, shared_by: profile.id })
      if (insertError) {
        setError(insertError.message)
        return
      }
    }
    load()
  }

  if (loading || !profile) return <p className="text-gray-500 text-sm">読み込み中...</p>
  if (!persona) return <p className="text-gray-500 text-sm">読み込み中...</p>
  if (!isOwner) return <p className="text-gray-500 text-sm">このページはペルソナ所有者のみ利用できます</p>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{persona.name} を共有する</h1>
        <p className="text-sm text-gray-500 mt-1">
          選んだ相手は閲覧と壁打ちができます。人格設定の編集・削除・フィードバック送信はできません。
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {members.length === 0 && <p className="text-sm text-gray-500">同じ組織に他のメンバーがいません</p>}

        <div className="space-y-2">
          {members.map((m) => {
            const shared = sharedUserIds.has(m.id)
            return (
              <div
                key={m.id}
                className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-2.5"
              >
                <span className="text-sm text-gray-900">{m.display_name || m.id}</span>
                <button
                  onClick={() => toggleShare(m.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    shared
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {shared ? '共有中（解除する）' : '共有する'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mt-4">{error}</div>}
    </div>
  )
}
