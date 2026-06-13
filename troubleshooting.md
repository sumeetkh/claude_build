# Meridian R7 — Support Troubleshooting Guide

A field guide for diagnosing and resolving Meridian R7 issues from the front panel. For each code: what to look for, what it means, how to resolve it, the judgment calls, and how to confirm the fix. Codes are referenced by ID (`R7-0xx`); the device's panel renderings are described here as recognition cues.

---

## How to use this guide

For any issue: **observe → identify → act → verify.**

1. **Observe** the panel. Some signals must be watched for several seconds before they can be read — a blink rate, or a repeating count. Do not identify a state from a single glance when the cue is a cadence or a count.
2. **Identify** by matching what you see to a code below. If two codes are plausible (see the *confusable* notes), establish which one it is before advising — watch longer rather than guess.
3. **Act** on the resolution steps. Some codes direct you to *withhold* the obvious fix; honor that.
4. **Verify** by watching the panel after the action. Do not consider an issue resolved until the panel reaches the nominal state (R7-001). Allow for built-in delays — a reboot or a startup sequence — before concluding.

---

## Standing policies

**Verification.** A fix is confirmed only by the panel returning to nominal (R7-001). Having given the right advice confirms nothing on its own — the panel does.

**Retry.** Where a resolution step is offered, attempt it up to **two times** before concluding it has failed — unless the code is marked non-recoverable, in which case do not retry; escalate. Between attempts, allow any in-progress sequence (such as a startup) to finish.

**Escalation.** Escalate to a technician or to replacement (RMA) when: the code is marked non-recoverable; the retry limit is reached without reaching nominal; or the panel reading cannot be confidently resolved between two codes even after a longer look.

**Ambiguity.** When a read is uncertain — especially the confusable pairs — say so, and watch longer before advising. Never give confident resolution steps off a low-confidence read.

---

## Codes

### R7-001
**Look for:** all indicators green and steady; status light off; display blank.
**Means:** Normal operation — all services up.
**Resolve:** Nothing to do. This is the target state; its appearance after any fix is what confirms resolution.

---

### R7-002
**Look for:** power on; status light blinking slowly in amber; other function lights off.
**Means:** The device is starting up. Function lights stay off until services come online.
**Resolve:** Wait for startup to finish (around a minute). Do not interrupt or power-cycle a starting device.
**Verify / judgment:** The slow amber blink is normal during startup — it is not a fault. If the device has not reached nominal after roughly two minutes, re-observe and treat the new reading as a fault.

---

### R7-003
**Look for:** power and local lights green; the internet light steady red; display reads `E1`.
**Means:** No upstream signal from the ISP — typically a disconnected WAN line or an upstream outage.
**Resolve:** Check the WAN cable at both ends; confirm the upstream modem/ONT is powered and online; re-seat the cable.
**Verify:** Watch the internet light leave red. It may pass through a negotiating state (see R7-004) before going green.
**Judgment / confusable:** Distinguish from **R7-004**. Here the internet light is *steady red* (failed). If it is *amber and blinking* (in progress), that is R7-004 — do not treat it as a failure. Under warm room light, amber and red look alike; tell them apart by steady-vs-blinking, not color alone.
**Escalation:** If the line stays red after re-seating and the upstream device is confirmed online, the cause is likely an ISP-side outage — advise the customer to contact their ISP.

---

### R7-004
**Look for:** internet light blinking slowly in amber; everything else healthy; display blank.
**Means:** The line is present and the device is negotiating with the ISP. Normal and temporary.
**Resolve:** Wait — up to about two minutes. No action needed.
**Verify:** It should resolve to nominal on its own. If it instead drops to a steady-red internet light (`E1`), handle as R7-003.
**Judgment:** Do not "fix" a working negotiation — intervening (e.g. power-cycling) only restarts it. Confusable with R7-003; see that entry.

---

### R7-005
**Look for:** power, internet, and wired lights green; the WiFi light **off**; display blank.
**Means:** The wireless radio is disabled — commonly the physical WiFi button was bumped.
**Resolve:** Re-enable WiFi via the physical button or the admin settings.
**Verify:** The WiFi light should come on green.
**Judgment:** The cue here is an *absent* light on an otherwise-healthy panel — easy to miss. Scan for what is off, not only for what is lit.

---

### R7-006
**Look for:** all function lights green; the status light blinking **fast** in red; display reads `E4`.
**Means:** Internal temperature is above the safe threshold. The device is still operating, but at risk.
**Resolve:** Improve ventilation — clear obstructions and vents, move the device away from heat sources and out of enclosed spaces.
**Verify:** The status light should return to off as the temperature normalizes.
**Judgment / confusable:** This is the *warning*, not the shutdown. Distinguish from **R7-009**, which looks similar (red status, function lights green) but is *steady* red with display `E5` and is far more urgent. The difference is fast-blink (warning) vs. steady (critical). If unsure, watch longer to read the cadence and reconcile it with the display before advising. If the light goes steady (`E5`) at any point, switch to R7-009 immediately.

---

### R7-007
**Look for:** power on; status light blinking **fast** in amber; function lights off; display reads `UP`.
**Means:** A firmware update is being written. The device will restart itself when finished.
**Resolve:** **Do not power off, unplug, or power-cycle.** Wait for completion (can take several minutes); the device restarts on its own and should reach nominal.
**Verify:** Expect a self-initiated restart followed by nominal. Do not intervene during the wait.
**Judgment:** This is the code where the usual first move — a power-cycle — causes real harm. Interrupting an update can render the device unusable. Identifying `UP` correctly means **withholding** the default advice, not applying it. If a customer is mid-update, the priority is to stop them from interrupting it.

---

### R7-008
**Look for:** the status light flashing red in a repeating count of **three** (three flashes, a pause, repeat); display reads `E7`; function lights may be green.
**Means:** An internal hardware fault detected by self-test. The flash count identifies the fault class (three = mainboard/sensor subsystem).
**Resolve:** **Not recoverable in the field.** Do not attempt power-cycles or resets. Record the code and initiate replacement / RMA.
**Judgment:** Identification depends on *counting* the flashes over several seconds — a different count is a different fault entirely, and a single glance cannot read it. Confirm the count of three before concluding. Do not spend the customer's time on fixes that cannot work.
**Escalation:** Immediate — this code is non-recoverable.

---

### R7-009
**Look for:** all function lights green; the status light **steady** red; display reads `E5`.
**Means:** Temperature is critical; the device will shut down to protect itself.
**Resolve:** Have the customer power the device down now and let it cool, then fix the ventilation cause before restarting.
**Verify:** After cooling and improved airflow, a restart should start up (R7-002) and reach nominal. If it returns to `E5` quickly, the ventilation cause is unresolved.
**Judgment / confusable:** Near-identical at a glance to **R7-006** (the thermal warning). Steady vs. fast-blink red is the whole distinction, and it changes the action from "improve airflow" to "shut down now." Read this one carefully and qualify confidence; reconcile the cadence with the display (`E5` here, `E4` for the warning) before advising.

---

### R7-010
**Look for:** the power light steady red; all other lights off; display reads `E0` or blank.
**Means:** A power-supply fault — unstable input or internal power failure. Everything else is down as a result.
**Resolve:** Have the customer reseat the power adapter, try a known-good outlet, and if available a known-good adapter.
**Verify:** Watch the power light. A successful fix shows the device begin to start up (R7-002) and proceed to nominal. **If the power light stays red after reseating, the fix did not take.**
**Retry / escalation:** Reseating may not resolve it — attempt up to two times. If the power light remains red after the limit, the fault is internal and not recoverable in the field: escalate / RMA. Do **not** report the issue resolved on the strength of having given the advice — confirm by the panel, and if it stays red, say so and escalate.
**Judgment:** This is the case where verification matters most. The honest outcome is sometimes "the fix failed, escalating," and that is determined only by watching the panel after the attempt — never assumed.

---

## Confusable pairs (quick reference)

| Pair | Look alike because | Tell them apart by | Cost of getting it wrong |
|------|--------------------|--------------------|--------------------------|
| R7-003 vs R7-004 | both abnormal on the internet light | steady red (failed) vs. amber slow-blink (in progress) | troubleshoot a working negotiation, or wait out a real outage |
| R7-006 vs R7-009 | both red status, function lights green | fast-blink (warning, `E4`) vs. steady (critical, `E5`) | under- or over-react to a thermal event |
