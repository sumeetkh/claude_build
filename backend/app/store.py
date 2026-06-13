"""In-memory session store + the real-time clock wrapper.

The engine owns a virtual clock advanced only by explicit `advance_by`. This
store binds a runtime to wall time: every access first syncs the real elapsed
seconds into the runtime (a lazy clock - no background task needed). A live
session therefore tracks real time whenever it's observed or acted on.

`advance(seconds)` adds an extra jump on top of real time, for the editor's
"play machine" and for tests/curl without waiting a real minute.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from uuid import uuid4

from .engine import DeviceRuntime
from .models import Action
from .scenarios import get_scenario


@dataclass
class _Entry:
    rt: DeviceRuntime
    wall_anchor: float  # monotonic time at last sync


class SessionStore:
    def __init__(self) -> None:
        self._entries: dict[str, _Entry] = {}

    def create(self, scenario_id: str, seed: int | None = None) -> tuple[str, DeviceRuntime]:
        scenario = get_scenario(scenario_id)  # raises KeyError if unknown
        rt = DeviceRuntime(scenario, seed=seed)
        sid = uuid4().hex[:8]
        self._entries[sid] = _Entry(rt=rt, wall_anchor=time.monotonic())
        return sid, rt

    def _sync(self, sid: str) -> DeviceRuntime:
        entry = self._entries[sid]  # raises KeyError if unknown
        now = time.monotonic()
        dt = now - entry.wall_anchor
        if dt > 0:
            entry.rt.advance_by(dt)
        entry.wall_anchor = now
        return entry.rt

    def get(self, sid: str) -> DeviceRuntime:
        return self._sync(sid)

    def apply(self, sid: str, action: Action) -> tuple[DeviceRuntime, bool]:
        rt = self._sync(sid)
        applied = rt.apply(action)
        return rt, applied

    def advance(self, sid: str, seconds: float) -> DeviceRuntime:
        rt = self._sync(sid)
        rt.advance_by(seconds)
        return rt
