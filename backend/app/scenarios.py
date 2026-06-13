"""Seed scenario catalog.

The ten canonical panel renderings come straight from router_catalog.md. The
scenarios compose them into little machines that exercise the engine: timer
self-resolution, action recovery, escalation, a stochastic (weighted) outcome,
and the harmful-action case where the right move is to withhold the fix.

`root_cause` records the hidden truth - what is actually wrong - which differs
between scenarios that share the same initial panel (loose cable vs ISP outage).
"""

from __future__ import annotations

from .models import (
    ActionTrigger,
    Behavior,
    BehaviorMode,
    Color,
    DeviceState,
    Indicator,
    PanelState,
    Scenario,
    SignalClass,
    TimerTrigger,
    Transition,
)

# -- indicator shorthands ---------------------------------------------------

OFF = Indicator(color=Color.off)
GREEN = Indicator(color=Color.green)


def _ind(color: Color, mode: BehaviorMode = BehaviorMode.solid, count: int | None = None) -> Indicator:
    return Indicator(color=color, behavior=Behavior(mode=mode, count=count))


def _panel(pwr: Indicator, net: Indicator, wifi: Indicator, lan: Indicator, stat: Indicator, glyph: str = "") -> PanelState:
    return PanelState(pwr=pwr, net=net, wifi=wifi, lan=lan, stat=stat, glyph=glyph)  # type: ignore[arg-type]


# -- the ten canonical states (+ a bricked node) ----------------------------

CANON: dict[str, DeviceState] = {
    "R7-001": DeviceState(
        id="R7-001", name="Nominal", signal_class=SignalClass.nominal,
        panel=_panel(GREEN, GREEN, GREEN, GREEN, OFF),
    ),
    "R7-002": DeviceState(
        id="R7-002", name="Starting up", signal_class=SignalClass.in_progress,
        panel=_panel(GREEN, OFF, OFF, OFF, _ind(Color.amber, BehaviorMode.slow_blink)),
    ),
    "R7-003": DeviceState(
        id="R7-003", name="Internet down (E1)", signal_class=SignalClass.fault,
        panel=_panel(GREEN, _ind(Color.red), GREEN, GREEN, OFF, glyph="E1"),
    ),
    "R7-004": DeviceState(
        id="R7-004", name="Negotiating", signal_class=SignalClass.in_progress,
        panel=_panel(GREEN, _ind(Color.amber, BehaviorMode.slow_blink), GREEN, GREEN, OFF),
    ),
    "R7-005": DeviceState(
        id="R7-005", name="WiFi off", signal_class=SignalClass.fault,
        panel=_panel(GREEN, GREEN, OFF, GREEN, OFF),
    ),
    "R7-006": DeviceState(
        id="R7-006", name="Thermal warning (E4)", signal_class=SignalClass.fault,
        panel=_panel(GREEN, GREEN, GREEN, GREEN, _ind(Color.red, BehaviorMode.fast_blink), glyph="E4"),
    ),
    "R7-007": DeviceState(
        id="R7-007", name="Firmware update (UP)", signal_class=SignalClass.in_progress,
        panel=_panel(GREEN, OFF, OFF, OFF, _ind(Color.amber, BehaviorMode.fast_blink), glyph="UP"),
    ),
    "R7-008": DeviceState(
        id="R7-008", name="Hardware fault (E7)", signal_class=SignalClass.fault,
        panel=_panel(GREEN, GREEN, GREEN, GREEN, _ind(Color.red, BehaviorMode.count, 3), glyph="E7"),
    ),
    "R7-009": DeviceState(
        id="R7-009", name="Thermal critical (E5)", signal_class=SignalClass.fault,
        panel=_panel(GREEN, GREEN, GREEN, GREEN, _ind(Color.red), glyph="E5"),
    ),
    "R7-010": DeviceState(
        id="R7-010", name="Power fault (E0)", signal_class=SignalClass.fault,
        panel=_panel(_ind(Color.red), OFF, OFF, OFF, OFF, glyph="E0"),
    ),
    "BRICKED": DeviceState(
        id="BRICKED", name="Unresponsive", signal_class=SignalClass.fault,
        panel=_panel(_ind(Color.red), OFF, OFF, OFF, _ind(Color.red), glyph="E0"),
    ),
}


def _states(*ids: str) -> list[DeviceState]:
    return [CANON[i] for i in ids]


def _timer(frm: str, to: str, after: float, weight: float = 1.0) -> Transition:
    return Transition(from_state=frm, to_state=to, trigger=TimerTrigger(after_seconds=after), weight=weight)


def _on(frm: str, to: str, action: str, weight: float = 1.0) -> Transition:
    return Transition(from_state=frm, to_state=to, trigger=ActionTrigger(action=action), weight=weight)  # type: ignore[arg-type]


# -- scenarios --------------------------------------------------------------

_SCENARIOS: list[Scenario] = [
    Scenario(
        id="nominal", name="Nominal", description="All green. The target state.",
        root_cause="Nothing wrong.",
        initial_state="R7-001", states=_states("R7-001"),
    ),
    Scenario(
        id="startup", name="Cold startup", description="Boots, then comes up on its own.",
        root_cause="Just powered on; nothing wrong.",
        initial_state="R7-002", states=_states("R7-002", "R7-001"),
        transitions=[_timer("R7-002", "R7-001", 60)],
    ),
    Scenario(
        id="wifi_off", name="WiFi disabled", description="Radio off on an otherwise healthy panel.",
        root_cause="WiFi button was bumped off.",
        initial_state="R7-005", states=_states("R7-005", "R7-001"),
        transitions=[_on("R7-005", "R7-001", "toggle_wifi")],
    ),
    Scenario(
        id="e1_loose_cable", name="E1 - loose WAN cable", description="Internet red (E1); a re-seat recovers it.",
        root_cause="WAN cable was unseated. Re-seating restores the link.",
        initial_state="R7-003", states=_states("R7-003", "R7-004", "R7-001"),
        transitions=[
            _on("R7-003", "R7-004", "reseat_wan"),
            _timer("R7-004", "R7-001", 8),
        ],
    ),
    Scenario(
        id="e1_isp_outage", name="E1 - ISP outage", description="Internet red (E1); re-seating only loops, never recovers.",
        root_cause="Upstream ISP outage. No on-site action recovers it; escalate.",
        initial_state="R7-003", states=_states("R7-003", "R7-004"),
        transitions=[
            _on("R7-003", "R7-004", "reseat_wan"),  # looks like it's trying...
            _timer("R7-004", "R7-003", 8),  # ...then falls back to red.
        ],
    ),
    Scenario(
        id="e0_power_loose", name="E0 - loose adapter", description="Power red (E0); a re-seat brings it back.",
        root_cause="Power adapter was loose. Re-seating restores power.",
        initial_state="R7-010", states=_states("R7-010", "R7-002", "R7-001"),
        transitions=[
            _on("R7-010", "R7-002", "reseat_power"),
            _timer("R7-002", "R7-001", 60),
        ],
    ),
    Scenario(
        id="e0_power_intermittent", name="E0 - intermittent power", description="Power red (E0); a re-seat works only sometimes.",
        root_cause="Failing adapter. A re-seat recovers ~half the time; verify by the panel.",
        initial_state="R7-010", states=_states("R7-010", "R7-002", "R7-001"),
        transitions=[
            _on("R7-010", "R7-002", "reseat_power", weight=1.0),  # recovers
            _on("R7-010", "R7-010", "reseat_power", weight=1.0),  # stays dead
            _timer("R7-002", "R7-001", 60),
        ],
    ),
    Scenario(
        id="e0_power_dead", name="E0 - dead supply", description="Power red (E0); nothing on-site recovers it.",
        root_cause="Internal power-supply failure. Non-recoverable; escalate / RMA.",
        initial_state="R7-010", states=_states("R7-010"),
    ),
    Scenario(
        id="thermal", name="Thermal - warning then critical", description="E4 warning; escalates to E5 if left alone.",
        root_cause="Overheating from blocked ventilation.",
        initial_state="R7-006", states=_states("R7-006", "R7-009", "R7-002", "R7-001"),
        transitions=[
            _on("R7-006", "R7-001", "improve_ventilation"),  # cools at the warning stage
            _timer("R7-006", "R7-009", 30),  # ignored -> goes critical
            _on("R7-009", "R7-002", "power_cycle"),  # shut down + restart once cooled
            _timer("R7-002", "R7-001", 60),
        ],
    ),
    Scenario(
        id="firmware_update", name="Firmware update", description="UP in progress; self-restarts. Power-cycling bricks it.",
        root_cause="A firmware write is in progress. Interrupting it is destructive.",
        initial_state="R7-007", states=_states("R7-007", "R7-002", "R7-001", "BRICKED"),
        transitions=[
            _timer("R7-007", "R7-002", 120),  # completes, self-restarts
            _timer("R7-002", "R7-001", 60),
            _on("R7-007", "BRICKED", "power_cycle"),  # harmful
            _on("R7-007", "BRICKED", "reseat_power"),  # harmful
        ],
    ),
    Scenario(
        id="hardware_fault", name="E7 - hardware fault", description="Repeating count of three; non-recoverable.",
        root_cause="Mainboard/sensor subsystem failure detected by self-test. Non-recoverable.",
        initial_state="R7-008", states=_states("R7-008"),
    ),
]

REGISTRY: dict[str, Scenario] = {s.id: s for s in _SCENARIOS}


def list_scenarios() -> list[Scenario]:
    return list(_SCENARIOS)


def get_scenario(scenario_id: str) -> Scenario:
    return REGISTRY[scenario_id]
