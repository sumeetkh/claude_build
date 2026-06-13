import { useEffect, useRef } from 'react'
import type { Behavior, Color, Indicator, PanelState } from '../types'
import { INDICATOR_KEYS } from '../types'

// The Meridian R7 front panel, rendered faithfully. The temporal behaviors
// (slow/fast blink, count-N) are driven per-frame so blink rate and pulse
// counts are real — this surface IS the agent's sensor once we capture it,
// so its timing has to be correct, not approximate.

const COLOR_HEX: Record<Color, string> = {
  off: '#2a313c',
  green: '#2FBF4F',
  amber: '#F0A020',
  red: '#E23B3B',
}
const UNLIT = '#272d38'

// Is the indicator emitting light at elapsed time `t` (ms), given a random
// phase offset? Mirrors the catalog's timing exactly.
function isLit(behavior: Behavior, t: number): boolean {
  switch (behavior.mode) {
    case 'solid':
      return true
    case 'slow_blink': // 1 Hz, 500/500
      return t % 1000 < 500
    case 'fast_blink': // 3 Hz, ~167/167
      return t % 334 < 167
    case 'count': {
      // N fast pulses, then a 2 s pause, looping.
      const n = behavior.count ?? 1
      const pulseWindow = n * 334
      const cycle = pulseWindow + 2000
      const p = t % cycle
      if (p >= pulseWindow) return false
      return p % 334 < 167
    }
  }
}

function Led({ label, ind }: { label: string; ind: Indicator }) {
  const dot = useRef<HTMLSpanElement>(null)
  // The count-N loop "has no defined start point" — randomize the phase so two
  // identical LEDs aren't lockstep, and a capture lands on an arbitrary moment.
  const phase = useRef(Math.random() * 100000)

  useEffect(() => {
    const el = dot.current
    if (!el) return

    const paint = (lit: boolean) => {
      const hex = COLOR_HEX[ind.color]
      el.style.background = lit ? hex : UNLIT
      el.style.boxShadow = lit ? `0 0 9px ${hex}, 0 0 2px ${hex}` : 'inset 0 0 3px rgba(0,0,0,.6)'
    }

    if (ind.color === 'off') {
      paint(false)
      return
    }
    if (ind.behavior.mode === 'solid') {
      paint(true)
      return
    }

    let raf = 0
    const start = performance.now() - phase.current
    const loop = (now: number) => {
      paint(isLit(ind.behavior, now - start))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [ind.color, ind.behavior.mode, ind.behavior.count])

  return (
    <span className="led2-cell">
      <span ref={dot} className="led2" />
      <span className="led2-name">{label}</span>
    </span>
  )
}

const LABELS: Record<string, string> = {
  pwr: 'PWR', net: 'NET', wifi: 'WIFI', lan: 'LAN', stat: 'STAT',
}

export default function DevicePanel({
  panel,
  size = 'md',
}: {
  panel: PanelState
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div className={`device2 device2-${size}`}>
      <div className="device2-brand">MERIDIAN R7</div>
      <div className="device2-row">
        {INDICATOR_KEYS.map((k) => (
          <Led key={k} label={LABELS[k]} ind={panel[k]} />
        ))}
        <div className={`glyph2 ${panel.glyph ? 'on' : ''}`}>{panel.glyph || ''}</div>
      </div>
    </div>
  )
}
