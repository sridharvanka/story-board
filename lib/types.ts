export interface Project {
  id: number
  name: string
  project_type: string
  created_at: string
}

export interface Fragment {
  id: number
  project_id: number
  text: string
  url: string | null
  pos_x: number
  pos_y: number
  created_at: string
}

export interface Connection {
  id: number
  project_id: number
  from_id: number
  to_id: number
  label: string
  source: 'ai' | 'user'
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export interface OutlineItem {
  fragment_id: number
  position: number
  text: string
  url: string | null
}

export interface Preference {
  id: number
  from_text: string
  to_text: string
  original_label: string
  corrected_label: string | null
  created_at: string
}
