'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { Team, PersonaVisibility } from '@/types'

export default function NewPersonaPage() {
  const router = useRouter()
  const { profile, loading } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    role: '',
    tone: '',
    viewpoint: '',
    system_prompt: '',
    visibility: 'private' as PersonaVisibility,
    team_id: '',
  })

  useEffect(() => {
    if (!profile?.org_id) return
    supabase
      .from('teams')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('name')
      .then(({ data }) => setTeams(data ?? []))
  }, [profile])

  const set = (field: 'name' | 'role' | 'tone' | 'viewpoint' | 'system_prompt') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const setVisibility = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setForm((f) => ({ ...f, visibility: e.target.value as PersonaVisibility }))

  const setTeamId = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setForm((f) => ({ ...f, team_id: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError('')

    const { data, error: insertError } = await supabase
      .from('personas')
      .insert({
        owner_id: profile.id,
        org_id: profile.org_id,
        team_id: form.visibility === 'team' ? form.team_id || null : null,
        name: form.name,
        role: form.role,
        tone: form.tone,
        viewpoint: form.viewpoint,
        system_prompt: form.system_prompt,
        visibility: form.visibility,
      })
      .select()
      .single()

    if (insertError || !data) {
      setError(insertError?.message ?? '作成に失敗しました')
      setSaving(false)
      return
    }

    router.push('/')
  }

  if (loading || !profile) return <p className="text-gray-500 text-sm">読み込み中...</p>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ペルソナを作る</h1>
        <p className="text-sm text-gray-500 mt-1">壁打ち相手や議論相手になるAI人格を設定します</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">名前 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            required
            placeholder="例: 川内2号くん"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">役割</label>
            <input
              type="text"
              value={form.role}
              onChange={set('role')}
              placeholder="例: 批判的レビュアー"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">口調</label>
            <input
              type="text"
              value={form.tone}
              onChange={set('tone')}
              placeholder="例: 率直で少し厳しい"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">視点・専門性</label>
          <input
            type="text"
            value={form.viewpoint}
            onChange={set('viewpoint')}
            placeholder="例: コスト意識とリスク管理を重視する"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            人格設定（AIへの指示） <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.system_prompt}
            onChange={set('system_prompt')}
            required
            rows={6}
            placeholder="このペルソナがどう振る舞うべきか、具体的に指示してください"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">公開範囲</label>
            <select
              value={form.visibility}
              onChange={setVisibility}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="private">自分のみ</option>
              <option value="team">チーム内</option>
              <option value="org">組織全体</option>
            </select>
          </div>
          {form.visibility === 'team' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">チーム</label>
              <select
                value={form.team_id}
                onChange={setTeamId}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">選択してください</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

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
            disabled={saving}
            className="flex-1 bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '作成中...' : '作成する'}
          </button>
        </div>
      </form>
    </div>
  )
}
