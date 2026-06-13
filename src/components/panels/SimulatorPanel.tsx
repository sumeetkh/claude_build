import type { Scenario } from '../../data/mock'

// Visual stub of the Meridian R7 front panel: five LEDs + a two-glyph display.
// No animation or state machine yet — just a static rendering placeholder so we
// can see the device sitting in the panel.

const LEDS = ['PWR', 'NET', 'WIFI', 'LAN', 'STAT'] as const

// Crude per-scenario colors just so the stub isn't all one color. Real signal
// rendering (solid / slow-blink / fast-blink / count-N) comes when we build it.
const STUB_COLORS: Record<string, Record<string, string>> = {
  '—': { PWR: 'green', NET: 'green', WIFI: 'green', LAN: 'green', STAT: 'off' },
  E1: { PWR: 'green', NET: 'red', WIFI: 'green', LAN: 'green', STAT: 'off' },
  E0: { PWR: 'red', NET: 'off', WIFI: 'off', LAN: 'off', STAT: 'off' },
}

export default function SimulatorPanel({ scenario }: { scenario?: Scenario }) {
  const code = scenario?.code ?? '—'
  const colors = STUB_COLORS[code] ?? STUB_COLORS['—']
  const glyph = code === '—' ? '' : code

  return (
    <div className="sim">
      <div className="device">
        <div className="device-label">Meridian R7</div>
        <div className="led-row">
          {LEDS.map((led) => (
            <div className="led-cell" key={led}>
              <span className={`led ${colors[led] ?? 'off'}`} />
              <span className="led-name">{led}</span>
            </div>
          ))}
          <div className="glyph-display">{glyph || '··'}</div>
        </div>
      </div>

      <div className="sim-footer">
        <span className="stub-note">stub · static rendering</span>
        <div className="sim-actions">
          <button className="ctrl-btn sm" disabled>Set state ▾</button>
        </div>
      </div>
    </div>
  )
}
