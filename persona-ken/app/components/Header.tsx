'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const router = useRouter()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-blue-700 tracking-tight">
          川内2号くん
        </Link>
        {loggedIn && (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/personas/new" className="text-gray-600 hover:text-gray-900">
              ペルソナを作る
            </Link>
            <Link href="/org" className="text-gray-600 hover:text-gray-900">
              組織設定
            </Link>
            <button onClick={handleLogout} className="text-gray-400 hover:text-gray-700">
              ログアウト
            </button>
          </nav>
        )}
      </div>
    </header>
  )
}
