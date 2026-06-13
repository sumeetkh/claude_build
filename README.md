# Meridian Bench

A bench for building and testing a support agent that diagnoses a device it
cannot see — the **Meridian R7** home router — by reading its front panel and
talking to the customer.

The app is one workspace with three panels:

- **Simulator** — the R7 front panel, live and animated (the device under test).
- **Agent** — where the agent's instructions and capabilities are authored.
- **Dialer** — the customer call, with a live transcript.

The agent perceives the device *only* through a screen-captured visual stream of
the Simulator (with delay), and *recommends* actions that the call session
carries out — a faithful "walk into a live support call" loop.

## Layout

```
backend/        FastAPI + Pydantic simulator (engine, scenarios, sessions)
src/            React + Vite frontend (workspace shell + panels)
router_catalog.md      the device's display vocabulary (10 panel codes)
troubleshooting.md     the support guide (agent domain knowledge)
```

## Backend — simulator

A scenario is a small state machine over panel frames:

```
PanelState   five LEDs (color + behavior) + a two-glyph display
DeviceState  a named node (a PanelState + identity)
Scenario     nodes + transitions (timer- or action-triggered, weighted)
```

The engine is a pure reducer with one input port — `apply(action)` — plus a
virtual clock (`advance_by(dt)`). Outcome selection is drawn from a single
seeded RNG (the seam for stochasticity); v1 scenarios are deterministic except
where intermittency is the point.

```bash
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
./.venv/bin/python -m pytest          # tests
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

API: `/api/scenarios`, `/api/sessions`, `/api/sessions/{id}/actions`,
`/api/sessions/{id}/advance`, `/api/sessions/{id}/events`.

## Frontend

```bash
npm install
npm run dev        # http://localhost:5173
```
