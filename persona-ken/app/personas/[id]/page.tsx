'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { Persona, Team, PersonaVisibility } from '@/types'

export default function PersonaDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { profile, loading } = useAuth()
  const [persona, setPersona] = useState<Persona | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!profile) return
    supabase.from('personas').select('*').eq('id', params.id).single().then(({ data }) => {
      if (!data) {
        setNotFound(true)
        return
      }
      setPersona(data)
    })
    if (profile.org_id) {
      supabase.from('teams').select('*').eq('org_id', profile.org_id).order('name').then(({ data }) => setTeams(data ?? []))
    }
  }, [profile, params.id])

  const isOwner = profile && persona && persona.owner_id === profile.id

  const set = (field: 'name' | 'role' | 'tone' | 'viewpoint' | 'system_prompt') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setPersona((p) => (p ? { ...p, [field]: e.target.value } : p))

  const setVisibility = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setPersona((p) => (p ? { ...p, visibility: e.target.value as PersonaVisibility } : p))

  const setTeamId = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setPersona((p) => (p ? { ...p, team_id: e.target.value || null } : p))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!persona) return
    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('personas')
      .update({
        name: persona.name,
        role: persona.role,
        tone: persona.tone,
        viewpoint: persona.viewpoint,
        system_prompt: persona.system_prompt,
        visibility: persona.visibility,
        team_id: persona.visibility === 'team' ? persona.team_id : null,
      })
      .eq('id', persona.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!persona) return
    if (!confirm(`「${persona.name}」を削除しますか？`)) return
    await supabase.from('personas').delete().eq('id', persona.id)
    router.push('/')
  }

  if (loading || !profile) return <p className="text-gray-500 text-sm">読み込み中...</p>
  if (notFound) return <p className="text-gray-500 text-sm">ペルソナが見つかりません</p>
  if (!persona) return <p className="text-gray-500 text-sm">読み込み中...</p>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{persona.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{isOwner ? '編集できます' : '閲覧のみ（作成者のみ編集可）'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/personas/${persona.id}/feedback`)}
            className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            フィードバック
          </button>
          <button
            onClick={() => router.push(`/chat/new?persona=${persona.id}`)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            壁打ちを始める
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <fieldset disabled={!isOwner} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">名前</label>
            <input
              type="text"
              value={persona.name}
              onChange={set('name')}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">役割</label>
              <input
                type="text"
                value={persona.role}
                onChange={set('role')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">口調</label>
              <input
                type="text"
                value={persona.tone}
                onChange={set('tone')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">視点・専門性</label>
            <input
              type="text"
              value={persona.viewpoint}
              onChange={set('viewpoint')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">人格設定（AIへの指示）</label>
            <textarea
              value={persona.system_prompt}
              onChange={set('system_prompt')}
              required
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">公開範囲</label>
              <select
                value={persona.visibility}
                onChange={setVisibility}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              >
                <option value="private">自分のみ</option>
                <option value="team">チーム内</option>
                <option value="org">組織全体</option>
              </select>
            </div>
            {persona.visibility === 'team' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">チーム</label>
                <select
                  value={persona.team_id ?? ''}
                  onChange={setTeamId}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                >
                  <option value="">選択してください</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </fieldset>

        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        {isOwner && (
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleDelete}
              className="border border-red-300 text-red-600 text-sm px-4 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              削除
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
