# Meridian R7 — Device Catalog

A reference for the Meridian R7 home router: the device, its front-panel indicators, the exact signals those indicators can produce, and the complete set of states the panel can display. This catalog records what the device *shows* — including how a state looks over time — not what any state means.

---

## 1. Device

The Meridian R7 is a single-unit consumer home router. It exposes operating state only through a front panel; there is no field-accessible console or external query interface. The panel is the device's sole status output.

Panel, left to right: five single indicator LEDs and one two-character glyph display.

```
[ PWR ]   [ NET ]   [ WIFI ]   [ LAN ]   [ STAT ]      [ ▢▢ ]
```

| Indicator | Field |
|-----------|-------|
| PWR | Power |
| NET | Internet / WAN |
| WIFI | Wireless radio |
| LAN | Wired clients |
| STAT | General status |
| Display | Two glyphs; blank in most states |

---

## 2. Signal Vocabulary

Every state is a per-indicator combination of **color** and **behavior**, optionally with a glyph on the display. These are the exact parameters that define a state's appearance, including its appearance over time.

### Colors

| Token | Render |
|-------|--------|
| off | unlit |
| green | ~#2FBF4F |
| amber | ~#F0A020 |
| red | ~#E23B3B |

### Behaviors

| Token | Timing |
|-------|--------|
| solid | continuous on |
| slow-blink | 1 Hz — 500 ms on / 500 ms off |
| fast-blink | 3 Hz — ~167 ms on / ~167 ms off |
| count-N | N fast-blink pulses, then 2000 ms off, repeat indefinitely |

> The count-N behavior is a continuous loop with an internal phase. It is a single state's own cadence, and the loop has no defined start point — it can be displaying any pulse, or the pause, at any given moment.

### Display glyphs

A two-character display. Blank in the nominal state and most in-progress states. When populated, it shows one of `E0`–`E9` or `UP`. The glyph is part of what the panel displays; this catalog records the glyph, not its significance.

---

## 3. Code Catalog

The ten states the panel can display — the device's complete display vocabulary. Each entry gives the exact rendering of every indicator. Unlisted indicators are **off**.

Notation: `INDICATOR: color/behavior`.
**Signal type** — *static* (appearance is constant) or *temporal* (appearance varies over time, via a blink or a count).
**Signal class** — a coarse tag for the kind of signal: nominal, in-progress, or fault.

| ID | PWR | NET | WIFI | LAN | STAT | Display | Signal type | Signal class |
|----|-----|-----|------|-----|------|---------|-------------|--------------|
| R7-001 | green/solid | green/solid | green/solid | green/solid | off | — | static | nominal |
| R7-002 | green/solid | off | off | off | amber/slow-blink | — | temporal | in-progress |
| R7-003 | green/solid | red/solid | green/solid | green/solid | off | `E1` | static | fault |
| R7-004 | green/solid | amber/slow-blink | green/solid | green/solid | off | — | temporal | in-progress |
| R7-005 | green/solid | green/solid | off | green/solid | off | — | static | fault |
| R7-006 | green/solid | green/solid | green/solid | green/solid | red/fast-blink | `E4` | temporal | fault |
| R7-007 | green/solid | off | off | off | amber/fast-blink | `UP` | temporal | in-progress |
| R7-008 | green/solid | green/solid | green/solid | green/solid | red/count-3 | `E7` | temporal | fault |
| R7-009 | green/solid | green/solid | green/solid | green/solid | red/solid | `E5` | static | fault |
| R7-010 | red/solid | off | off | off | off | `E0` | static | fault |

The STAT indicator alone carries five distinct states (R7-002, R7-006, R7-007, R7-008, R7-009), separated only by color and behavior.
