// Thin client for the simulator backend (FastAPI on :8000).
import type {
  Action,
  Scenario,
  ScenarioSummary,
  SessionView,
} from './types'

const BASE = 'http://localhost:8000/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} — ${detail}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const listScenarios = () => req<ScenarioSummary[]>('/scenarios')
export const getScenario = (id: string) => req<Scenario>(`/scenarios/${id}`)
export const createScenario = (s: Scenario) =>
  req<Scenario>('/scenarios', { method: 'POST', body: JSON.stringify(s) })
export const updateScenario = (id: string, s: Scenario) =>
  req<Scenario>(`/scenarios/${id}`, { method: 'PUT', body: JSON.stringify(s) })
export const deleteScenario = (id: string) =>
  req<void>(`/scenarios/${id}`, { method: 'DELETE' })

export const createSession = (scenario_id: string, seed?: number) =>
  req<SessionView>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ scenario_id, seed }),
  })
export const getSession = (id: string) => req<SessionView>(`/sessions/${id}`)
export const sendAction = (id: string, action: Action) =>
  req<{ applied: boolean; session: SessionView }>(`/sessions/${id}/actions`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
export const advanceSession = (id: string, seconds: number) =>
  req<SessionView>(`/sessions/${id}/advance`, {
    method: 'POST',
    body: JSON.stringify({ seconds }),
  })
