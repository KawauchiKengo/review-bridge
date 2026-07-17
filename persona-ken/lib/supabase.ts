import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ブラウザ用（ログインセッションを保持し、RLSは本人の権限で評価される）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// APIルート用（フロントから受け取ったアクセストークンでRLSを本人権限として評価する）
export function createServerSupabase(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  })
}
