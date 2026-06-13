"""Domain model for the Meridian R7 simulator.

These Pydantic types are the single source of truth: they validate authored
scenarios, serialize over the API, and feed the engine. Three layers:

    PanelState   - the atomic frame the panel shows at one instant
    DeviceState  - a named node (a PanelState + identity + class)
    Scenario     - a little state machine over DeviceStates

The engine consumes these; nothing here knows about time, sessions, or the
agent. See engine.py for the reducer/clock.
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field, model_validator


# --------------------------------------------------------------------------
# Layer 1: the panel frame
# --------------------------------------------------------------------------


class Color(str, Enum):
    off = "off"
    green = "green"
    amber = "amber"
    red = "red"


class BehaviorMode(str, Enum):
    solid = "solid"
    slow_blink = "slow_blink"  # 1 Hz, 500/500 ms
    fast_blink = "fast_blink"  # 3 Hz, ~167/167 ms
    count = "count"  # N fast pulses, 2 s pause, loop (phase undefined)


class Behavior(BaseModel):
    """How an indicator renders over time. `count` is required iff mode==count."""

    mode: BehaviorMode = BehaviorMode.solid
    count: Optional[int] = Field(default=None, ge=1, le=9)

    @model_validator(mode="after")
    def _count_consistency(self) -> "Behavior":
        if self.mode is BehaviorMode.count and self.count is None:
            raise ValueError("count behavior requires a `count`")
        if self.mode is not BehaviorMode.count and self.count is not None:
            raise ValueError("`count` is only valid for the count behavior")
        return self


# Display glyphs: blank, the E-codes, or UP. The catalog records the glyph,
# not its meaning.
Glyph = Literal["", "E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "UP"]


class Indicator(BaseModel):
    color: Color
    behavior: Behavior = Field(default_factory=Behavior)

    @model_validator(mode="after")
    def _off_has_no_cadence(self) -> "Indicator":
        # An unlit LED has no meaningful cadence.
        if self.color is Color.off and self.behavior.mode is not BehaviorMode.solid:
            raise ValueError("an `off` indicator must be solid (no cadence)")
        return self


class PanelState(BaseModel):
    """The five LEDs plus the two-glyph display, frozen at one instant."""

    pwr: Indicator
    net: Indicator
    wifi: Indicator
    lan: Indicator
    stat: Indicator
    glyph: Glyph = ""


# --------------------------------------------------------------------------
# Layer 2: a named node
# --------------------------------------------------------------------------


class SignalClass(str, Enum):
    nominal = "nominal"
    in_progress = "in_progress"
    fault = "fault"


class DeviceState(BaseModel):
    id: str
    name: str
    panel: PanelState
    signal_class: SignalClass = SignalClass.fault


# --------------------------------------------------------------------------
# Layer 3: the scenario machine
# --------------------------------------------------------------------------


class Action(str, Enum):
    """The device's physical affordances - the entire boundary between the
    outside world (human or agent) and the simulator. The agent recommends one
    of these; the session realizes it; the engine reduces over it."""

    power_cycle = "power_cycle"
    reseat_power = "reseat_power"
    reseat_wan = "reseat_wan"
    toggle_wifi = "toggle_wifi"
    improve_ventilation = "improve_ventilation"


class TimerTrigger(BaseModel):
    kind: Literal["timer"] = "timer"
    after_seconds: float = Field(gt=0)


class ActionTrigger(BaseModel):
    kind: Literal["action"] = "action"
    action: Action


Trigger = Annotated[Union[TimerTrigger, ActionTrigger], Field(discriminator="kind")]


class Transition(BaseModel):
    """An edge. `weight` lets several transitions share a trigger so an outcome
    is drawn (seeded per session) - the seam for stochasticity. Authored v1
    scenarios use weight 1.0 except where intermittency is the point."""

    from_state: str
    to_state: str
    trigger: Trigger
    weight: float = Field(default=1.0, gt=0)


class Scenario(BaseModel):
    id: str
    name: str
    description: str = ""
    root_cause: str = ""  # the hidden truth - what is actually wrong
    initial_state: str
    states: list[DeviceState]
    transitions: list[Transition] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_references(self) -> "Scenario":
        ids = {s.id for s in self.states}
        if len(ids) != len(self.states):
            raise ValueError("duplicate state ids in scenario")
        if self.initial_state not in ids:
            raise ValueError(f"initial_state {self.initial_state!r} is not a defined state")
        for t in self.transitions:
            if t.from_state not in ids:
                raise ValueError(f"transition from unknown state {t.from_state!r}")
            if t.to_state not in ids:
                raise ValueError(f"transition to unknown state {t.to_state!r}")
        return self
