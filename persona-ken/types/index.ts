export type PersonaVisibility = 'private' | 'team' | 'org'

export interface Organization {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export interface Profile {
  id: string
  org_id: string | null
  role: 'admin' | 'member'
  display_name: string
  created_at: string
}

export interface Team {
  id: string
  org_id: string
  name: string
  created_at: string
}

export interface Persona {
  id: string
  owner_id: string
  org_id: string
  team_id: string | null
  name: string
  role: string
  tone: string
  viewpoint: string
  system_prompt: string
  visibility: PersonaVisibility
  created_at: string
}

export type ConversationType = 'single' | 'multi'

export interface Conversation {
  id: string
  type: ConversationType
  title: string
  created_by: string
  created_at: string
  personas?: Persona[]
}

export type MessageSenderType = 'user' | 'persona'

export interface Message {
  id: string
  conversation_id: string
  sender_type: MessageSenderType
  persona_id: string | null
  content: string
  created_at: string
  persona?: Persona
}

export interface PersonaShare {
  persona_id: string
  user_id: string
  shared_by: string
  created_at: string
}

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected'

export interface JoinRequest {
  id: string
  org_id: string
  user_id: string
  requester_display_name: string
  status: JoinRequestStatus
  created_at: string
  resolved_at: string | null
}

export type PersonaFeedbackStatus = 'pending' | 'applied' | 'dismissed'

export interface PersonaFeedback {
  id: string
  persona_id: string
  message_id: string | null
  created_by: string
  feedback_text: string
  original_system_prompt: string
  proposed_system_prompt: string
  status: PersonaFeedbackStatus
  created_at: string
  resolved_at: string | null
  created_by_profile?: Profile
}
