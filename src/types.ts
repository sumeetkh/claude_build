// Mirrors the backend Pydantic models (app/models.py). One scenario object
// round-trips between the editor, the API, and the simulator engine.

export type Color = 'off' | 'green' | 'amber' | 'red'
export type BehaviorMode = 'solid' | 'slow_blink' | 'fast_blink' | 'count'
export type SignalClass = 'nominal' | 'in_progress' | 'fault'

export type Glyph =
  | '' | 'E0' | 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9' | 'UP'

export interface Behavior {
  mode: BehaviorMode
  count: number | null
}

export interface Indicator {
  color: Color
  behavior: Behavior
}

export interface PanelState {
  pwr: Indicator
  net: Indicator
  wifi: Indicator
  lan: Indicator
  stat: Indicator
  glyph: Glyph
}

export interface DeviceState {
  id: string
  name: string
  panel: PanelState
  signal_class: SignalClass
}

export type Action =
  | 'power_cycle' | 'reseat_power' | 'reseat_wan' | 'toggle_wifi' | 'improve_ventilation'

export type Trigger =
  | { kind: 'timer'; after_seconds: number }
  | { kind: 'action'; action: Action }

export interface Transition {
  from_state: string
  to_state: string
  trigger: Trigger
  weight: number
}

export interface Scenario {
  id: string
  name: string
  description: string
  root_cause: string
  initial_state: string
  states: DeviceState[]
  transitions: Transition[]
}

export interface ScenarioSummary {
  id: string
  name: string
  description: string
  initial_state: string
  num_states: number
  num_transitions: number
}

export interface SessionView {
  session_id: string
  scenario_id: string
  state_id: string
  state_name: string
  signal_class: SignalClass
  panel: PanelState
  now: number
  elapsed_in_state: number
}

export const INDICATOR_KEYS = ['pwr', 'net', 'wifi', 'lan', 'stat'] as const
export type IndicatorKey = (typeof INDICATOR_KEYS)[number]

export const ACTIONS: Action[] = [
  'power_cycle', 'reseat_power', 'reseat_wan', 'toggle_wifi', 'improve_ventilation',
]

export const GLYPHS: Glyph[] = [
  '', 'UP', 'E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9',
]
