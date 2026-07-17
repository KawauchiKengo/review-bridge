'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'

// ログイン必須ページ共通のガード。未ログインなら/login、組織未所属なら/onboardingへ誘導する
export function useAuth() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!active) return

      if (!profileData) {
        setLoading(false)
        return
      }

      if (!profileData.org_id) {
        router.replace('/onboarding')
        return
      }

      setProfile(profileData)
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [router])

  return { profile, loading }
}
