import type { Agent } from '../../data/mock'

// Stub of the agent authoring surface: a slot for instructions and a slot for
// capabilities. Non-functional — just laying out where things live.

export default function AgentPanel({ agent }: { agent?: Agent }) {
  return (
    <div className="agent">
      <div className="field">
        <label className="field-label">Instructions</label>
        <textarea
          className="instructions"
          placeholder="Who is this agent and how should it behave?"
          defaultValue={agent?.summary ?? ''}
          readOnly
        />
      </div>

      <div className="field">
        <label className="field-label">Capabilities</label>
        <div className="tool-list">
          <div className="tool-row stub-tool">
            <span className="tool-name">— no tools defined —</span>
          </div>
          <button className="ghost-btn sm" disabled>+ Add capability</button>
        </div>
      </div>

      <div className="agent-footer">
        <span className="stub-note">stub · authoring not wired</span>
        <div className="model-pill">claude-opus-4-8</div>
      </div>
    </div>
  )
}
