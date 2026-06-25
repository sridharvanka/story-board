import { getSupabase } from './supabase'
import { getSessionId } from './session'
import type { Project, Fragment, Connection, OutlineItem, Preference } from './types'

export const store = {
  // --- Projects ---
  async listProjects(): Promise<Project[]> {
    const { data, error } = await getSupabase()
      .from('sb_projects')
      .select('*')
      .eq('session_id', getSessionId())
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  },

  async createProject(data: { name: string; project_type: string }): Promise<Project> {
    const { data: p, error } = await getSupabase()
      .from('sb_projects')
      .insert({ ...data, session_id: getSessionId() })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return p
  },

  async deleteProject(id: number): Promise<void> {
    const { error } = await getSupabase()
      .from('sb_projects')
      .delete()
      .eq('id', id)
      .eq('session_id', getSessionId())
    if (error) throw new Error(error.message)
  },

  // --- Fragments ---
  async listFragments(pid: number): Promise<Fragment[]> {
    const { data, error } = await getSupabase()
      .from('sb_fragments')
      .select('*')
      .eq('project_id', pid)
      .order('created_at')
    if (error) throw new Error(error.message)
    return data
  },

  async addFragment(pid: number, data: Omit<Fragment, 'id' | 'project_id' | 'created_at'>): Promise<Fragment> {
    const { data: f, error } = await getSupabase()
      .from('sb_fragments')
      .insert({ ...data, project_id: pid })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return f
  },

  async updateFragment(id: number, data: Partial<Pick<Fragment, 'text' | 'url' | 'pos_x' | 'pos_y'>>): Promise<Fragment> {
    const { data: f, error } = await getSupabase()
      .from('sb_fragments')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return f
  },

  async deleteFragment(id: number): Promise<void> {
    // Connections cascade via DB foreign key
    const { error } = await getSupabase().from('sb_fragments').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // --- Connections ---
  async listConnections(pid: number): Promise<Connection[]> {
    const { data, error } = await getSupabase()
      .from('sb_connections')
      .select('*')
      .eq('project_id', pid)
      .order('created_at')
    if (error) throw new Error(error.message)
    return data
  },

  async findConnection(id: number): Promise<Connection | null> {
    const { data, error } = await getSupabase()
      .from('sb_connections')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async addConnection(pid: number, data: Omit<Connection, 'id' | 'project_id' | 'created_at'>): Promise<Connection> {
    const { data: c, error } = await getSupabase()
      .from('sb_connections')
      .insert({ ...data, project_id: pid })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return c
  },

  async updateConnection(id: number, data: Partial<Pick<Connection, 'label' | 'status'>>): Promise<Connection> {
    const { data: c, error } = await getSupabase()
      .from('sb_connections')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return c
  },

  async deleteConnection(id: number): Promise<void> {
    const { error } = await getSupabase().from('sb_connections').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // --- Outline ---
  async getOutline(pid: number): Promise<OutlineItem[]> {
    const { data, error } = await getSupabase()
      .from('sb_outline_order')
      .select('fragment_id, position, sb_fragments(text, url)')
      .eq('project_id', pid)
      .order('position')

    if (error || !data || data.length === 0) {
      // Fall back to creation order
      const frags = await this.listFragments(pid)
      return frags.map((f, i) => ({ fragment_id: f.id, position: i, text: f.text, url: f.url }))
    }

    return data.map(r => {
      const frag = r.sb_fragments as unknown as { text: string; url: string | null } | null
      return {
        fragment_id: r.fragment_id,
        position:    r.position,
        text:        frag?.text ?? '',
        url:         frag?.url ?? null,
      }
    })
  },

  async saveOutline(pid: number, items: OutlineItem[]): Promise<void> {
    // Replace existing outline
    await getSupabase().from('sb_outline_order').delete().eq('project_id', pid)
    if (items.length === 0) return
    const rows = items.map(item => ({
      project_id:  pid,
      fragment_id: item.fragment_id,
      position:    item.position,
    }))
    const { error } = await getSupabase().from('sb_outline_order').insert(rows)
    if (error) throw new Error(error.message)
  },

  // --- Preferences ---
  async listPreferences(): Promise<Preference[]> {
    const { data, error } = await getSupabase()
      .from('sb_preferences')
      .select('*')
      .eq('session_id', getSessionId())
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  },

  async addPreference(data: Omit<Preference, 'id' | 'created_at'>): Promise<Preference> {
    const { data: p, error } = await getSupabase()
      .from('sb_preferences')
      .insert({ ...data, session_id: getSessionId() })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return p
  },

  async updatePreference(id: number, data: { corrected_label: string }): Promise<Preference> {
    const { data: p, error } = await getSupabase()
      .from('sb_preferences')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return p
  },

  async deletePreference(id: number): Promise<void> {
    const { error } = await getSupabase().from('sb_preferences').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
