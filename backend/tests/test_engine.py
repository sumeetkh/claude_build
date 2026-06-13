"""Behaviour tests for the simulator engine and scenario catalog."""

import pytest
from pydantic import ValidationError

from app.engine import DeviceRuntime
from app.models import Action, Behavior, BehaviorMode, Color, Indicator
from app.scenarios import get_scenario


def rt(scenario_id: str, seed: int | None = 0) -> DeviceRuntime:
    return DeviceRuntime(get_scenario(scenario_id), seed=seed)


# -- model validation -------------------------------------------------------


def test_off_indicator_must_be_solid():
    with pytest.raises(ValidationError):
        Indicator(color=Color.off, behavior=Behavior(mode=BehaviorMode.fast_blink))


def test_count_requires_a_count():
    with pytest.raises(ValidationError):
        Behavior(mode=BehaviorMode.count)
    with pytest.raises(ValidationError):
        Behavior(mode=BehaviorMode.solid, count=3)


# -- timer transitions ------------------------------------------------------


def test_startup_self_resolves_only_after_its_timer():
    d = rt("startup")
    assert d.current_id == "R7-002"
    assert d.advance_by(59) is False
    assert d.current_id == "R7-002"
    assert d.advance_by(2) is True
    assert d.current_id == "R7-001"


def test_advance_cascades_through_chained_timers():
    # firmware: UP --120s--> startup --60s--> nominal, in one big jump.
    d = rt("firmware_update")
    d.advance_by(1000)
    assert d.current_id == "R7-001"


# -- action transitions -----------------------------------------------------


def test_wifi_toggle_recovers_then_is_a_noop():
    d = rt("wifi_off")
    assert d.apply(Action.toggle_wifi) is True
    assert d.current_id == "R7-001"
    # nominal has no edges: a further action is a no-op.
    assert d.apply(Action.toggle_wifi) is False


def test_unmatched_action_is_a_noop():
    d = rt("e0_power_dead")
    assert d.apply(Action.reseat_wan) is False
    assert d.current_id == "R7-010"


def test_loose_cable_recovers_via_reseat():
    d = rt("e1_loose_cable")
    assert d.apply(Action.reseat_wan) is True
    assert d.current_id == "R7-004"
    d.advance_by(8)
    assert d.current_id == "R7-001"


def test_isp_outage_loops_and_never_recovers():
    d = rt("e1_isp_outage")
    d.apply(Action.reseat_wan)
    assert d.current_id == "R7-004"
    d.advance_by(8)
    assert d.current_id == "R7-003"  # fell back to red, not nominal


def test_firmware_power_cycle_bricks():
    d = rt("firmware_update")
    assert d.apply(Action.power_cycle) is True
    assert d.current_id == "BRICKED"
    # bricked is terminal.
    assert d.apply(Action.reseat_power) is False


def test_thermal_escalates_when_ignored():
    d = rt("thermal")
    assert d.current_id == "R7-006"
    d.advance_by(30)
    assert d.current_id == "R7-009"


def test_thermal_warning_cooled_in_time():
    d = rt("thermal")
    d.advance_by(10)
    assert d.apply(Action.improve_ventilation) is True
    assert d.current_id == "R7-001"


# -- stochastic outcome (the seam) ------------------------------------------


def test_intermittent_power_is_seed_reproducible():
    a = rt("e0_power_intermittent", seed=42)
    b = rt("e0_power_intermittent", seed=42)
    a.apply(Action.reseat_power)
    b.apply(Action.reseat_power)
    assert a.current_id == b.current_id  # same seed -> same draw


def test_intermittent_power_can_go_both_ways():
    seen = set()
    for s in range(50):
        d = rt("e0_power_intermittent", seed=s)
        d.apply(Action.reseat_power)
        seen.add(d.current_id)
    assert seen == {"R7-002", "R7-010"}  # both outcomes occur across seeds


# -- events -----------------------------------------------------------------


def test_events_record_history():
    d = rt("e1_loose_cable")
    d.apply(Action.reseat_wan)
    d.advance_by(8)
    vias = [e.via for e in d.events]
    assert vias == ["reseat_wan", "timer"]
