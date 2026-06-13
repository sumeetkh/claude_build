import { useEffect, useRef, useState } from 'react'
import * as api from '../api'
import DevicePanel from './DevicePanel'
import {
  ACTIONS,
  GLYPHS,
  INDICATOR_KEYS,
  type Action,
  type BehaviorMode,
  type Color,
  type DeviceState,
  type Glyph,
  type IndicatorKey,
  type Scenario,
  type SessionView,
  type SignalClass,
  type Trigger,
} from '../types'

const COLORS: Color[] = ['off', 'green', 'amber', 'red']
const MODES: BehaviorMode[] = ['solid', 'slow_blink', 'fast_blink', 'count']
const CLASSES: SignalClass[] = ['nominal', 'in_progress', 'fault']

const blankPanel = () => ({
  pwr: { color: 'green' as Color, behavior: { mode: 'solid' as BehaviorMode, count: null } },
  net: { color: 'green' as Color, behavior: { mode: 'solid' as BehaviorMode, count: null } },
  wifi: { color: 'green' as Color, behavior: { mode: 'solid' as BehaviorMode, count: null } },
  lan: { color: 'green' as Color, behavior: { mode: 'solid' as BehaviorMode, count: null } },
  stat: { color: 'off' as Color, behavior: { mode: 'solid' as BehaviorMode, count: null } },
  glyph: '' as Glyph,
})

const blankScenario = (): Scenario => ({
  id: '',
  name: 'New scenario',
  description: '',
  root_cause: '',
  initial_state: 's1',
  states: [{ id: 's1', name: 'Initial state', panel: blankPanel(), signal_class: 'fault' }],
  transitions: [],
})

type Props = { scenarioId: string | null; onBack: () => void }

export default function ScenarioEditor({ scenarioId, onBack }: Props) {
  const [draft, setDraft] = useState<Scenario>(blankScenario)
  const [existsOnServer, setExistsOnServer] = useState(false)
  const [selectedState, setSelectedState] = useState('s1')
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null)

  // Live "play" against the real engine.
  const [session, setSession] = useState<SessionView | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    let alive = true
    if (scenarioId) {
      api.getScenario(scenarioId).then((s) => {
        if (!alive) return
        setDraft(s)
        setExistsOnServer(true)
        setSelectedState(s.initial_state)
      }).catch((e) => setMsg({ text: String(e), err: true }))
    } else {
      const fresh = blankScenario()
      setDraft(fresh)
      setExistsOnServer(false)
      setSelectedState(fresh.initial_state)
    }
    return () => { alive = false }
  }, [scenarioId])

  // Poll the live session so timer transitions show up in the preview.
  useEffect(() => {
    if (!session) return
    pollRef.current = window.setInterval(async () => {
      try { setSession(await api.getSession(session.session_id)) } catch { /* ignore */ }
    }, 500)
    return () => { if (pollRef.current) window.clearInterval(pollRef.current) }
  }, [session?.session_id])

  const playing = session !== null
  const current = draft.states.find((s) => s.id === selectedState) ?? draft.states[0]

  // -- draft mutation helpers ------------------------------------------------

  const patchMeta = (p: Partial<Scenario>) => setDraft((d) => ({ ...d, ...p }))

  const patchState = (id: string, p: Partial<DeviceState>) =>
    setDraft((d) => ({ ...d, states: d.states.map((s) => (s.id === id ? { ...s, ...p } : s)) }))

  const patchIndicator = (id: string, key: IndicatorKey, color: Color, mode: BehaviorMode, count: number | null) => {
    // Honor backend invariants: off => solid; count mode needs a count.
    if (color === 'off') { mode = 'solid'; count = null }
    if (mode === 'count') count = count ?? 1
    else count = null
    setDraft((d) => ({
      ...d,
      states: d.states.map((s) =>
        s.id === id ? { ...s, panel: { ...s.panel, [key]: { color, behavior: { mode, count } } } } : s,
      ),
    }))
  }

  const addState = () => {
    const id = `s${draft.states.length + 1}_${Math.random().toString(36).slice(2, 5)}`
    setDraft((d) => ({ ...d, states: [...d.states, { id, name: 'New state', panel: blankPanel(), signal_class: 'fault' }] }))
    setSelectedState(id)
  }

  const removeState = (id: string) => {
    if (draft.states.length <= 1) return
    setDraft((d) => {
      const states = d.states.filter((s) => s.id !== id)
      const transitions = d.transitions.filter((t) => t.from_state !== id && t.to_state !== id)
      const initial_state = d.initial_state === id ? states[0].id : d.initial_state
      return { ...d, states, transitions, initial_state }
    })
    if (selectedState === id) setSelectedState(draft.states[0].id)
  }

  const addTransition = () =>
    setDraft((d) => ({
      ...d,
      transitions: [...d.transitions, {
        from_state: d.states[0].id,
        to_state: d.states[0].id,
        trigger: { kind: 'timer', after_seconds: 10 },
        weight: 1,
      }],
    }))

  const patchTransition = (i: number, p: Partial<{ from_state: string; to_state: string; trigger: Trigger; weight: number }>) =>
    setDraft((d) => ({ ...d, transitions: d.transitions.map((t, j) => (j === i ? { ...t, ...p } : t)) }))

  const removeTransition = (i: number) =>
    setDraft((d) => ({ ...d, transitions: d.transitions.filter((_, j) => j !== i) }))

  // -- persistence + play ----------------------------------------------------

  const save = async (): Promise<boolean> => {
    if (!draft.id.trim()) { setMsg({ text: 'Give the scenario an id before saving.', err: true }); return false }
    try {
      if (existsOnServer) await api.updateScenario(draft.id, draft)
      else { await api.createScenario(draft); setExistsOnServer(true) }
      setMsg({ text: 'Saved.' })
      return true
    } catch (e) { setMsg({ text: String(e), err: true }); return false }
  }

  const play = async () => {
    if (!(await save())) return
    try {
      setSession(await api.createSession(draft.id))
      setMsg({ text: 'Playing live session.' })
    } catch (e) { setMsg({ text: String(e), err: true }) }
  }

  const stop = () => { setSession(null); setFlash(null) }

  const act = async (action: Action) => {
    if (!session) return
    const r = await api.sendAction(session.session_id, action)
    setSession(r.session)
    setFlash(r.applied ? `${action} → ${r.session.state_name}` : `${action}: no effect`)
    setTimeout(() => setFlash(null), 1800)
  }

  const wait = async () => {
    if (!session) return
    setSession(await api.advanceSession(session.session_id, 5))
  }

  // -- render ----------------------------------------------------------------

  const previewPanel = playing ? session!.panel : current.panel
  const previewCaption = playing
    ? `live · ${session!.state_name} · t+${session!.now.toFixed(0)}s`
    : `editing · ${current.name}`

  return (
    <div className="editor">
      <header className="editor-top">
        <button className="home-link" onClick={onBack}>‹ Home</button>
        <span className="editor-title">{draft.name || 'Untitled'}</span>
        {msg && <span className={`editor-msg ${msg.err ? 'err' : ''}`}>{msg.text}</span>}
        <button className="btn sm" onClick={save} disabled={playing}>Save</button>
        {playing ? (
          <button className="btn sm danger" onClick={stop}>Stop</button>
        ) : (
          <button className="btn sm primary" onClick={play}>▷ Play</button>
        )}
      </header>

      <div className="editor-body">
        <div className="editor-preview">
          <div className="preview-stage">
            <DevicePanel panel={previewPanel} size="lg" />
            <span className="preview-caption">{previewCaption}</span>
          </div>

          {playing ? (
            <div className="play-bar live">
              {ACTIONS.map((a) => (
                <button key={a} className="btn sm" onClick={() => act(a)}>{a}</button>
              ))}
              <button className="btn sm" onClick={wait}>wait 5s ⏵</button>
              {flash && <div className={flash.includes('no effect') ? 'noop-flash' : 'applied-flash'}>{flash}</div>}
            </div>
          ) : (
            <span className="preview-caption">Save then ▷ Play to drive the real engine.</span>
          )}
        </div>

        <div className="editor-form">
          <fieldset disabled={playing} style={{ border: 'none', padding: 0, margin: 0 }}>
            <div className="form-section">
              <h3>Scenario</h3>
              <div className="row"><label>id</label><input className="inp" value={draft.id} placeholder="e.g. e1_loose_cable" disabled={existsOnServer} onChange={(e) => patchMeta({ id: e.target.value })} /></div>
              <div className="row"><label>name</label><input className="inp" value={draft.name} onChange={(e) => patchMeta({ name: e.target.value })} /></div>
              <div className="row"><label>description</label><input className="inp" value={draft.description} onChange={(e) => patchMeta({ description: e.target.value })} /></div>
              <div className="row"><label>root cause</label><input className="inp" value={draft.root_cause} onChange={(e) => patchMeta({ root_cause: e.target.value })} /></div>
              <div className="row"><label>initial</label>
                <select className="sel" value={draft.initial_state} onChange={(e) => patchMeta({ initial_state: e.target.value })}>
                  {draft.states.map((s) => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-section">
              <h3>States</h3>
              <div className="state-tabs">
                {draft.states.map((s) => (
                  <span key={s.id} className={`state-tab ${s.id === selectedState ? 'active' : ''} ${s.id === draft.initial_state ? 'initial' : ''}`} onClick={() => setSelectedState(s.id)}>
                    {s.name}
                    {s.id === draft.initial_state && <span className="badge">init</span>}
                  </span>
                ))}
                <button className="btn sm" onClick={addState}>+ state</button>
              </div>

              <div className="row"><label>name</label><input className="inp" value={current.name} onChange={(e) => patchState(current.id, { name: e.target.value })} /></div>
              <div className="row"><label>id</label><input className="inp compact" style={{ width: 160 }} value={current.id} disabled /></div>
              <div className="row"><label>class</label>
                <select className="sel" value={current.signal_class} onChange={(e) => patchState(current.id, { signal_class: e.target.value as SignalClass })}>
                  {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="row"><label>glyph</label>
                <select className="sel compact" style={{ width: 90 }} value={current.panel.glyph} onChange={(e) => patchState(current.id, { panel: { ...current.panel, glyph: e.target.value as Glyph } })}>
                  {GLYPHS.map((g) => <option key={g} value={g}>{g || '(blank)'}</option>)}
                </select>
              </div>

              <div className="ind-grid">
                {INDICATOR_KEYS.map((k) => {
                  const ind = current.panel[k]
                  return (
                    <div className="ind-row" key={k}>
                      <span className="ind-label">{k.toUpperCase()}</span>
                      <select className="sel" value={ind.color} onChange={(e) => patchIndicator(current.id, k, e.target.value as Color, ind.behavior.mode, ind.behavior.count)}>
                        {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select className="sel" value={ind.behavior.mode} disabled={ind.color === 'off'} onChange={(e) => patchIndicator(current.id, k, ind.color, e.target.value as BehaviorMode, ind.behavior.count)}>
                        {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      {ind.behavior.mode === 'count' ? (
                        <input className="inp" type="number" min={1} max={9} value={ind.behavior.count ?? 1} onChange={(e) => patchIndicator(current.id, k, ind.color, 'count', Number(e.target.value))} />
                      ) : <span />}
                    </div>
                  )
                })}
              </div>
              {draft.states.length > 1 && (
                <button className="btn sm danger" style={{ marginTop: 12 }} onClick={() => removeState(current.id)}>Remove this state</button>
              )}
            </div>

            <div className="form-section">
              <h3>Transitions</h3>
              {draft.transitions.map((t, i) => (
                <div className="trans-row" key={i}>
                  <select className="sel" value={t.from_state} onChange={(e) => patchTransition(i, { from_state: e.target.value })}>
                    {draft.states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select className="sel" value={t.to_state} onChange={(e) => patchTransition(i, { to_state: e.target.value })}>
                    {draft.states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {t.trigger.kind === 'timer' ? (
                    <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <select className="sel compact" style={{ width: 74 }} value="timer" onChange={(e) => patchTransition(i, { trigger: e.target.value === 'timer' ? { kind: 'timer', after_seconds: 10 } : { kind: 'action', action: 'power_cycle' } })}>
                        <option value="timer">timer</option><option value="action">action</option>
                      </select>
                      <input className="inp compact" style={{ width: 56 }} type="number" min={1} value={t.trigger.after_seconds} onChange={(e) => patchTransition(i, { trigger: { kind: 'timer', after_seconds: Number(e.target.value) } })} /><span style={{ color: 'var(--text-faint)', fontSize: 12 }}>s</span>
                    </span>
                  ) : (
                    <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <select className="sel compact" style={{ width: 74 }} value="action" onChange={(e) => patchTransition(i, { trigger: e.target.value === 'timer' ? { kind: 'timer', after_seconds: 10 } : { kind: 'action', action: 'power_cycle' } })}>
                        <option value="timer">timer</option><option value="action">action</option>
                      </select>
                      <select className="sel" value={t.trigger.action} onChange={(e) => patchTransition(i, { trigger: { kind: 'action', action: e.target.value as Action } })}>
                        {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </span>
                  )}
                  <input className="inp compact" type="number" min={0.1} step={0.1} value={t.weight} title="weight" onChange={(e) => patchTransition(i, { weight: Number(e.target.value) })} />
                  <button className="x-btn" onClick={() => removeTransition(i)}>×</button>
                </div>
              ))}
              <button className="btn sm" onClick={addTransition}>+ transition</button>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  )
}
