"""Smoke tests for the HTTP surface."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_scenarios():
    r = client.get("/api/scenarios")
    assert r.status_code == 200
    ids = {s["id"] for s in r.json()}
    assert {"nominal", "e1_isp_outage", "firmware_update"} <= ids


def test_session_lifecycle_with_action_and_advance():
    r = client.post("/api/sessions", json={"scenario_id": "e1_loose_cable", "seed": 0})
    assert r.status_code == 200
    sid = r.json()["session_id"]
    assert r.json()["state_id"] == "R7-003"

    r = client.post(f"/api/sessions/{sid}/actions", json={"action": "reseat_wan"})
    assert r.status_code == 200
    body = r.json()
    assert body["applied"] is True
    assert body["session"]["state_id"] == "R7-004"

    r = client.post(f"/api/sessions/{sid}/advance", json={"seconds": 8})
    assert r.json()["state_id"] == "R7-001"

    r = client.get(f"/api/sessions/{sid}/events")
    assert [e["via"] for e in r.json()] == ["reseat_wan", "timer"]


def test_unknown_scenario_is_404():
    r = client.post("/api/sessions", json={"scenario_id": "nope"})
    assert r.status_code == 404


def _authored_scenario(sid: str) -> dict:
    led = {"color": "green", "behavior": {"mode": "solid", "count": None}}
    off = {"color": "off", "behavior": {"mode": "solid", "count": None}}
    panel = {"pwr": led, "net": led, "wifi": off, "lan": led, "stat": off, "glyph": ""}
    return {
        "id": sid, "name": "Authored", "description": "", "root_cause": "",
        "initial_state": "a",
        "states": [
            {"id": "a", "name": "wifi off", "panel": panel, "signal_class": "fault"},
            {"id": "b", "name": "ok", "panel": {**panel, "wifi": led}, "signal_class": "nominal"},
        ],
        "transitions": [
            {"from_state": "a", "to_state": "b", "trigger": {"kind": "action", "action": "toggle_wifi"}, "weight": 1.0},
        ],
    }


def test_author_a_scenario_then_play_it():
    s = _authored_scenario("authored_wifi")
    r = client.post("/api/scenarios", json=s)
    assert r.status_code == 201

    # It shows up in the catalog and can be run like any other.
    assert "authored_wifi" in {x["id"] for x in client.get("/api/scenarios").json()}

    sid = client.post("/api/sessions", json={"scenario_id": "authored_wifi"}).json()["session_id"]
    r = client.post(f"/api/sessions/{sid}/actions", json={"action": "toggle_wifi"})
    assert r.json()["applied"] is True
    assert r.json()["session"]["state_id"] == "b"

    assert client.delete("/api/scenarios/authored_wifi").status_code == 204


def test_duplicate_id_conflicts_and_seed_is_protected():
    assert client.post("/api/scenarios", json=_authored_scenario("nominal")).status_code == 409
    assert client.delete("/api/scenarios/nominal").status_code == 409


def test_invalid_scenario_rejected():
    bad = _authored_scenario("bad_ref")
    bad["initial_state"] = "ghost"  # not a defined state
    assert client.post("/api/scenarios", json=bad).status_code == 422
