import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, abstract, journal_name, author_name, author_email, keywords } = body

  if (!title || !abstract || !journal_name || !author_name || !author_email) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('submissions')
    .insert({ title, abstract, journal_name, author_name, author_email, keywords: keywords ?? [] })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
