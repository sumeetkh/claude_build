// Mock data for the visual stub. No backend, no real logic — just enough
// shape to lay out the Workspace -> Sessions -> three-panel canvas.

export type Agent = {
  id: string
  name: string
  summary: string
}

export type Scenario = {
  id: string
  name: string
  code: string // e.g. "E1", "E0", "—"
  summary: string
}

export type Session = {
  id: string
  label: string // "Call #1"
  agentId: string
  scenarioId: string
  status: 'live' | 'ended'
}

export const agents: Agent[] = [
  { id: 'a-v3', name: 'Support v3', summary: 'Front-panel triage agent, latest revision.' },
  { id: 'a-v2', name: 'Support v2', summary: 'Previous revision, kept for comparison.' },
  { id: 'a-blank', name: 'Blank', summary: 'Empty agent — no instructions or tools yet.' },
]

export const scenarios: Scenario[] = [
  { id: 's-e1-isp', name: 'E1 ISP outage', code: 'E1', summary: 'Internet light steady red. Upstream is down — reseat never fixes it.' },
  { id: 's-e1-cable', name: 'E1 loose cable', code: 'E1', summary: 'Internet light steady red. A WAN re-seat brings it back.' },
  { id: 's-e0-power', name: 'E0 power fault', code: 'E0', summary: 'Power light steady red, rest dark.' },
  { id: 's-nominal', name: 'Nominal', code: '—', summary: 'All green. The target state.' },
]

export const sessions: Session[] = [
  { id: 'call-1', label: 'Call #1', agentId: 'a-v3', scenarioId: 's-e1-isp', status: 'live' },
  { id: 'call-2', label: 'Call #2', agentId: 'a-v3', scenarioId: 's-e0-power', status: 'live' },
  { id: 'call-0', label: 'Call #0', agentId: 'a-v2', scenarioId: 's-e0-power', status: 'ended' },
]

export const agentById = (id: string) => agents.find((a) => a.id === id)
export const scenarioById = (id: string) => scenarios.find((s) => s.id === id)
