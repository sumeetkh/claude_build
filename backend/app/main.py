"""FastAPI surface for the simulator.

Scenarios are the authored catalog (read-only here). A session instantiates a
scenario into a live device you can observe and drive by hand - the same input
port (`/actions`) the agent will later feed. No agent, no capture yet.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .engine import DeviceRuntime, TransitionEvent
from .models import Action, PanelState, Scenario, SignalClass
from .scenarios import list_scenarios
from .store import SessionStore

app = FastAPI(title="Meridian R7 Simulator", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = SessionStore()


# -- response/request models -----------------------------------------------


class ScenarioSummary(BaseModel):
    id: str
    name: str
    description: str
    initial_state: str
    num_states: int
    num_transitions: int

    @classmethod
    def of(cls, s: Scenario) -> "ScenarioSummary":
        return cls(
            id=s.id, name=s.name, description=s.description,
            initial_state=s.initial_state,
            num_states=len(s.states), num_transitions=len(s.transitions),
        )


class SessionView(BaseModel):
    session_id: str
    scenario_id: str
    state_id: str
    state_name: str
    signal_class: SignalClass
    panel: PanelState
    now: float
    elapsed_in_state: float


def _view(sid: str, rt: DeviceRuntime) -> SessionView:
    s = rt.current
    return SessionView(
        session_id=sid, scenario_id=rt.scenario.id,
        state_id=s.id, state_name=s.name, signal_class=s.signal_class,
        panel=s.panel, now=rt.now, elapsed_in_state=rt.elapsed_in_state,
    )


class CreateSessionRequest(BaseModel):
    scenario_id: str
    seed: int | None = None


class ActionRequest(BaseModel):
    action: Action


class ActionResult(BaseModel):
    applied: bool  # did the action change anything here?
    session: SessionView


class AdvanceRequest(BaseModel):
    seconds: float = Field(gt=0)


# -- scenarios -------------------------------------------------------------


@app.get("/api/scenarios", response_model=list[ScenarioSummary])
def get_scenarios() -> list[ScenarioSummary]:
    return [ScenarioSummary.of(s) for s in list_scenarios()]


@app.get("/api/scenarios/{scenario_id}", response_model=Scenario)
def get_scenario_detail(scenario_id: str) -> Scenario:
    for s in list_scenarios():
        if s.id == scenario_id:
            return s
    raise HTTPException(404, f"no scenario {scenario_id!r}")


# -- sessions --------------------------------------------------------------


@app.post("/api/sessions", response_model=SessionView)
def create_session(req: CreateSessionRequest) -> SessionView:
    try:
        sid, rt = store.create(req.scenario_id, seed=req.seed)
    except KeyError:
        raise HTTPException(404, f"no scenario {req.scenario_id!r}")
    return _view(sid, rt)


@app.get("/api/sessions/{sid}", response_model=SessionView)
def get_session(sid: str) -> SessionView:
    try:
        return _view(sid, store.get(sid))
    except KeyError:
        raise HTTPException(404, f"no session {sid!r}")


@app.post("/api/sessions/{sid}/actions", response_model=ActionResult)
def post_action(sid: str, req: ActionRequest) -> ActionResult:
    try:
        rt, applied = store.apply(sid, req.action)
    except KeyError:
        raise HTTPException(404, f"no session {sid!r}")
    return ActionResult(applied=applied, session=_view(sid, rt))


@app.post("/api/sessions/{sid}/advance", response_model=SessionView)
def post_advance(sid: str, req: AdvanceRequest) -> SessionView:
    """Fast-forward the device clock (editor 'play machine' / testing)."""
    try:
        return _view(sid, store.advance(sid, req.seconds))
    except KeyError:
        raise HTTPException(404, f"no session {sid!r}")


@app.get("/api/sessions/{sid}/events", response_model=list[TransitionEvent])
def get_events(sid: str) -> list[TransitionEvent]:
    try:
        return store.get(sid).events
    except KeyError:
        raise HTTPException(404, f"no session {sid!r}")
