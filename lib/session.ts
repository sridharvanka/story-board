const SESSION_KEY = 'sb_session_id'
const DEMO_KEY    = 'sb_demo_id'

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function getDemoProjectId(): number | null {
  const id = localStorage.getItem(DEMO_KEY)
  return id ? parseInt(id) : null
}

export function setDemoProjectId(id: number): void {
  localStorage.setItem(DEMO_KEY, String(id))
}

export function clearDemoProjectId(): void {
  localStorage.removeItem(DEMO_KEY)
}
