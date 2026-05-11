import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: submission } = await supabase
    .from('submissions')
    .select('ai_tags, keywords, author_email')
    .eq('id', id)
    .single()

  if (!submission) return NextResponse.json({ error: '投稿が見つかりません' }, { status: 404 })

  const allTags = [...(submission.ai_tags ?? []), ...(submission.keywords ?? [])]

  const { data: reviewers } = await supabase.from('reviewers').select('*')
  if (!reviewers) return NextResponse.json([])

  const candidates = reviewers
    .filter(r => r.email !== submission.author_email)
    .map(r => {
      const matches = r.expertise_tags.filter((tag: string) =>
        allTags.some(t => t.includes(tag) || tag.includes(t))
      )
      const matchScore = Math.min(100, matches.length * 20 + Math.floor(Math.random() * 10))
      const coiFlag = submission.author_email?.split('@')[1] === r.email?.split('@')[1]
      return { ...r, match_score: matchScore, coi_flag: coiFlag }
    })
    .sort((a, b) => b.match_score - a.match_score)

  return NextResponse.json(candidates)
}
