import type { Scenario } from '../../data/mock'
import type { Color, PanelState } from '../../types'
import DevicePanel from '../DevicePanel'

// Session canvas still uses mock sessions (the live wiring to a backend session
// comes later). For now it derives a representative panel from the scenario code
// and renders it with the real animated DevicePanel.

const G = (color: Color): PanelState['pwr'] => ({ color, behavior: { mode: 'solid', count: null } })

function panelForCode(code: string): PanelState {
  switch (code) {
    case 'E1':
      return { pwr: G('green'), net: G('red'), wifi: G('green'), lan: G('green'), stat: G('off'), glyph: 'E1' }
    case 'E0':
      return { pwr: G('red'), net: G('off'), wifi: G('off'), lan: G('off'), stat: G('off'), glyph: 'E0' }
    default:
      return { pwr: G('green'), net: G('green'), wifi: G('green'), lan: G('green'), stat: G('off'), glyph: '' }
  }
}

export default function SimulatorPanel({ scenario }: { scenario?: Scenario }) {
  const panel = panelForCode(scenario?.code ?? '—')

  return (
    <div className="sim">
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
        <DevicePanel panel={panel} size="md" />
      </div>
      <div className="sim-footer">
        <span className="stub-note">stub · mock session (not yet wired to a backend session)</span>
      </div>
    </div>
  )
}
