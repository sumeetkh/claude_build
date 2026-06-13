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
