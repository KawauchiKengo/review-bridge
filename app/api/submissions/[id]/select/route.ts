import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { reviewer_id, match_score, coi_flag } = await req.json()

  const { data: existing } = await supabase
    .from('review_requests')
    .select('id')
    .eq('submission_id', id)
    .eq('reviewer_id', reviewer_id)
    .single()

  if (existing) {
    await supabase
      .from('review_requests')
      .delete()
      .eq('submission_id', id)
      .eq('reviewer_id', reviewer_id)
    return NextResponse.json({ selected: false })
  }

  const { error } = await supabase.from('review_requests').insert({
    submission_id: id,
    reviewer_id,
    match_score: match_score ?? 0,
    coi_flag: coi_flag ?? false,
    selected_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('submissions').update({ status: 'assigned' }).eq('id', id)
  return NextResponse.json({ selected: true })
}
