import { agentById, scenarioById, type Session } from '../data/mock'
import SimulatorPanel from './panels/SimulatorPanel'
import AgentPanel from './panels/AgentPanel'
import DialerPanel from './panels/DialerPanel'

type Props = {
  openSessions: Session[]
  activeId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onHome: () => void
  onNew: () => void
}

export default function SessionView({
  openSessions,
  activeId,
  onSelect,
  onClose,
  onHome,
  onNew,
}: Props) {
  const active = openSessions.find((s) => s.id === activeId) ?? openSessions[0]
  const agent = active ? agentById(active.agentId) : undefined
  const scenario = active ? scenarioById(active.scenarioId) : undefined

  return (
    <div className="session">
      <header className="session-top">
        <button className="home-link" onClick={onHome}>‹ Home</button>

        <div className="tabs">
          {openSessions.map((s) => (
            <div
              key={s.id}
              className={`tab ${s.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(s.id)}
            >
              <span className={`tab-dot ${s.status}`} />
              <span className="tab-label">{s.label}</span>
              <span
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(s.id)
                }}
              >
                ×
              </span>
            </div>
          ))}
          <button className="tab-new" onClick={onNew} title="New session">+</button>
        </div>

        <div className="session-controls">
          <button className="ctrl-btn">⏸ Pause</button>
          <button className="ctrl-btn">↺ Reset</button>
        </div>
      </header>

      <div className="canvas">
        <Panel title="Simulator" subtitle={scenario?.name ?? '—'}>
          <SimulatorPanel scenario={scenario} />
        </Panel>
        <Panel title="Agent" subtitle={agent?.name ?? '—'}>
          <AgentPanel agent={agent} />
        </Panel>
        <Panel title="Dialer" subtitle={active?.label ?? '—'}>
          <DialerPanel session={active} />
        </Panel>
      </div>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">{title}</span>
        <span className="panel-subtitle">{subtitle}</span>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  )
}
