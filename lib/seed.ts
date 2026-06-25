import { store } from './store'
import { setDemoProjectId } from './session'
import type { OutlineItem } from './types'

export async function seedDemoProject(): Promise<number> {
  const project = await store.createProject({ name: 'The Sleep Crisis', project_type: 'essay' })
  const pid = project.id

  // Create fragments with explicit grid positions
  const [f1, f2, f3, f4, f5, f6] = await Promise.all([
    store.addFragment(pid, {
      text: 'Sleep deprivation costs the US economy $411 billion a year in lost productivity',
      url: null, pos_x: 80, pos_y: 100,
    }),
    store.addFragment(pid, {
      text: 'After 17 hours awake, cognitive performance drops to the equivalent of a 0.05% blood alcohol level',
      url: null, pos_x: 380, pos_y: 100,
    }),
    store.addFragment(pid, {
      text: 'The average American now sleeps 6.8 hours — down from 9 hours a century ago',
      url: null, pos_x: 680, pos_y: 100,
    }),
    store.addFragment(pid, {
      text: 'Artificial light after dark suppresses melatonin production, delaying sleep onset by hours',
      url: null, pos_x: 80, pos_y: 320,
    }),
    store.addFragment(pid, {
      text: 'Most adults need 7–9 hours of sleep to maintain peak cognitive, immune, and emotional function',
      url: null, pos_x: 380, pos_y: 320,
    }),
    store.addFragment(pid, {
      text: 'CEOs who boast about sleeping 4 hours are not high performers — they are adapting to chronic impairment',
      url: null, pos_x: 680, pos_y: 320,
    }),
  ])

  // Accepted connections — show the graph already populated
  await Promise.all([
    store.addConnection(pid, { from_id: f2.id, to_id: f1.id, label: 'evidence for',  source: 'ai', status: 'accepted' }),
    store.addConnection(pid, { from_id: f4.id, to_id: f3.id, label: 'causes',        source: 'ai', status: 'accepted' }),
    store.addConnection(pid, { from_id: f5.id, to_id: f2.id, label: 'mechanism for', source: 'ai', status: 'accepted' }),
    store.addConnection(pid, { from_id: f3.id, to_id: f1.id, label: 'evidence for',  source: 'ai', status: 'accepted' }),
    store.addConnection(pid, { from_id: f4.id, to_id: f5.id, label: 'related to',    source: 'ai', status: 'accepted' }),
  ])

  // One pending suggestion — lets the visitor try the accept/reject UI
  await store.addConnection(pid, {
    from_id: f6.id, to_id: f1.id, label: 'supports',
    source: 'ai', status: 'pending',
  })

  // Pre-built outline: Hook → Context → Mechanism → Evidence → Implication
  const outline: OutlineItem[] = [
    { fragment_id: f6.id, position: 0, text: f6.text, url: null },
    { fragment_id: f3.id, position: 1, text: f3.text, url: null },
    { fragment_id: f4.id, position: 2, text: f4.text, url: null },
    { fragment_id: f5.id, position: 3, text: f5.text, url: null },
    { fragment_id: f2.id, position: 4, text: f2.text, url: null },
    { fragment_id: f1.id, position: 5, text: f1.text, url: null },
  ]
  await store.saveOutline(pid, outline)

  setDemoProjectId(project.id)
  return project.id
}

export async function resetDemoProject(existingDemoId: number | null): Promise<number> {
  if (existingDemoId !== null) {
    await store.deleteProject(existingDemoId)
  }
  return seedDemoProject()
}
