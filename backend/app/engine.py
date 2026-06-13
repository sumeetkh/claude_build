"""The simulator engine: a reducer over a Scenario with a virtual clock.

A `DeviceRuntime` is one live device. It has exactly one input port -
`apply(action)` - plus the passage of time via `advance_by(dt)`. It knows
nothing about wall-clock, sessions, rendering, or the agent; callers own the
clock (see store.py for the real-time wrapper). This keeps it pure and testable.

Outcome selection (which timer fires, which action edge wins when several share
a trigger) is drawn from a single seeded RNG - the one place randomness lives.
"""

from __future__ import annotations

import random
from typing import Optional

from pydantic import BaseModel

from .models import Action, DeviceState, Scenario, Transition


class TransitionEvent(BaseModel):
    """A recorded edge firing - the device's history within a run."""

    at: float
    from_state: str
    to_state: str
    via: str  # "timer" or the action name


class DeviceRuntime:
    def __init__(self, scenario: Scenario, seed: Optional[int] = None) -> None:
        self.scenario = scenario
        self._states: dict[str, DeviceState] = {s.id: s for s in scenario.states}
        self._rng = random.Random(seed)

        self.now: float = 0.0
        self.current_id: str = scenario.initial_state
        self.entered_at: float = 0.0
        self.events: list[TransitionEvent] = []

        # The next timer transition committed for the current state, if any:
        # (transition, absolute fire time).
        self._next_fire: Optional[tuple[Transition, float]] = None
        self._schedule_timer(self.now)

    # -- observation -------------------------------------------------------

    @property
    def current(self) -> DeviceState:
        return self._states[self.current_id]

    @property
    def elapsed_in_state(self) -> float:
        return self.now - self.entered_at

    # -- inputs ------------------------------------------------------------

    def advance_by(self, dt: float) -> bool:
        """Let `dt` seconds pass, firing any due timer transitions in order.
        Returns True if the state changed."""
        if dt < 0:
            raise ValueError("cannot advance time backwards")
        target = self.now + dt
        changed = False
        # Loop: landing in a new state may expose an already-due timer.
        while self._next_fire is not None and self._next_fire[1] <= target:
            transition, fire_at = self._next_fire
            self._enter(transition.to_state, fire_at, via="timer")
            changed = True
        self.now = target
        return changed

    def apply(self, action: Action) -> bool:
        """Apply a realized action at the current time. Returns True if it had
        any effect; an action with no matching edge here is a no-op (e.g.
        reseating the WAN on a power fault)."""
        candidates = [
            t
            for t in self.scenario.transitions
            if t.from_state == self.current_id
            and t.trigger.kind == "action"
            and t.trigger.action is action
        ]
        chosen = self._pick(candidates)
        if chosen is None:
            return False
        self._enter(chosen.to_state, self.now, via=action.value)
        return True

    # -- internals ---------------------------------------------------------

    def _enter(self, to_id: str, at: float, via: str) -> None:
        self.events.append(
            TransitionEvent(at=at, from_state=self.current_id, to_state=to_id, via=via)
        )
        self.current_id = to_id
        self.entered_at = at
        self._schedule_timer(at)

    def _schedule_timer(self, at: float) -> None:
        timers = [
            t
            for t in self.scenario.transitions
            if t.from_state == self.current_id and t.trigger.kind == "timer"
        ]
        chosen = self._pick(timers)
        if chosen is None:
            self._next_fire = None
        else:
            assert chosen.trigger.kind == "timer"
            self._next_fire = (chosen, at + chosen.trigger.after_seconds)

    def _pick(self, candidates: list[Transition]) -> Optional[Transition]:
        if not candidates:
            return None
        if len(candidates) == 1:
            return candidates[0]
        weights = [c.weight for c in candidates]
        return self._rng.choices(candidates, weights=weights, k=1)[0]
