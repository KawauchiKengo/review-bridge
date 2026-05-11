export type SubmissionStatus = 'pending' | 'analyzing' | 'ready' | 'assigned'

export interface Submission {
  id: string
  title: string
  abstract: string
  journal_name: string
  author_name: string
  author_email: string
  keywords: string[]
  ai_tags: string[]
  status: SubmissionStatus
  created_at: string
}

export interface Reviewer {
  id: string
  name: string
  email: string
  affiliation: string
  expertise_tags: string[]
  review_count: number
  created_at: string
}

export interface ReviewRequest {
  id: string
  submission_id: string
  reviewer_id: string
  status: 'pending' | 'accepted' | 'declined'
  coi_flag: boolean
  match_score: number
  selected_at: string | null
  reviewer?: Reviewer
}
