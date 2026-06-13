import { useEffect, useState } from 'react'
import * as api from '../api'
import {
  agents,
  sessions,
  agentById,
  scenarioById,
  type Session,
} from '../data/mock'
import type { ScenarioSummary } from '../types'

type Props = {
  onOpenSession: (session: Session) => void
  onOpenScenario: (id: string | null) => void
}

export default function HomeView({ onOpenSession, onOpenScenario }: Props) {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listScenarios().then(setScenarios).catch((e) => setError(String(e)))
  }, [])

  return (
    <div className="home">
      <header className="home-top">
        <div className="brand">
          <span className="brand-dot" />
          Meridian Bench
        </div>
        <div className="home-top-right">
          <button className="icon-btn" title="Settings">⚙</button>
          <span className="user">sumeet ▾</span>
        </div>
      </header>

      <main className="home-body">
        <Section title="Sessions" action="+ New Session">
          <div className="card-row">
            {sessions.map((s) => {
              const agent = agentById(s.agentId)
              const scenario = scenarioById(s.scenarioId)
              return (
                <button key={s.id} className="card session-card" onClick={() => onOpenSession(s)}>
                  <div className="card-head">
                    <span className="card-title">{s.label}</span>
                    <span className={`status-dot ${s.status}`}>
                      {s.status === 'live' ? '● live' : '○ ended'}
                    </span>
                  </div>
                  <div className="card-sub">{agent?.name}</div>
                  <div className="card-meta">
                    <span className="chip">{scenario?.code}</span>
                    <span className="card-meta-text">{scenario?.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Agents" action="+ New Agent">
          <div className="card-row">
            {agents.map((a) => (
              <div key={a.id} className="card lib-card">
                <div className="card-title">{a.name}</div>
                <div className="card-desc">{a.summary}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Scenarios" action="+ New Scenario" onAction={() => onOpenScenario(null)}>
          {error && <div className="card-desc" style={{ color: 'var(--red)' }}>Backend offline? {error}</div>}
          <div className="card-row">
            {scenarios.map((s) => (
              <button key={s.id} className="card session-card" onClick={() => onOpenScenario(s.id)}>
                <div className="card-head">
                  <span className="card-title">{s.name}</span>
                  <span className="chip">{s.num_states}st · {s.num_transitions}tr</span>
                </div>
                <div className="card-desc">{s.description}</div>
              </button>
            ))}
          </div>
        </Section>
      </main>
    </div>
  )
}

function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string
  action: string
  onAction?: () => void
  children: React.ReactNode
}) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <button className="ghost-btn" onClick={onAction}>{action}</button>
      </div>
      {children}
    </section>
  )
}
