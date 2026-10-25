---
name: automation-fix
description: Resolve problems with automations that are built or live — failed or stuck runs, wrong outputs, a third-party API that changed, an expired connection, AI quality that slipped, cost or loop spikes, duplicate, missing or late runs, bad incoming data — by reproducing from the run record, classifying, writing a failing test or case first, fixing surgically, deciding with you what to do about side effects that already went out, and shipping the fix through a release. Use for anything that goes wrong; a change of behaviour goes to /automation-spec instead.
---

# Automation Fix

## 1. Scope

Anything wrong with an automation that exists, found by an alert, a run record, an operator, a client, or me. One issue or a list; each follows Section 2.

Not a new behaviour: a change to what the automation should do starts in `/automation-spec` revise mode. Not a new automation: that starts in `/automation-spec`.

**Constraints:**

- **The rules as written** — `workflow-standards`, `integrations`, `ai-steps`, `security`, `testing`, the coding standards — not restated here.
- **Diffs are minimal.** Only what the issue needs.
- **The docs stay true**: the spec only through revise mode; the runbook, the registry, the cases and `evals.md` updated where the fix changes them, describing the corrected behaviour as if it had always been so.
- **Production is not a test bench.** Reproduce locally from the run record; never re-run a failed production run with real side effects to see what happens.

## 2. Per issue

### Step 1 — Contain *(when it is still happening)*

If the automation is causing harm now — sending wrong messages, spending, looping, writing bad data — pause it first — from the console, or the deploy pipeline's `pause` mode (`/automation-deploy` → Pause and retire): every run holds itself at its next check — tell me, and then investigate.

### Step 2 — Reproduce

Start from the run record: the input, each step's output, the model and tool calls, the side effects, the error. Replay it in the test setup with the recorded responses until it fails the way production did. For an issue with no run — a schedule that did not fire, a webhook that never arrived — start from the heartbeat, the trigger's logs and the caller.

An issue that cannot be reproduced is reported as such, with what was tried; it is not fixed by guessing.

### Step 3 — Classify

| Class | Means | Goes |
| --- | --- | --- |
| **Logic bug** | The automation does not do what the spec says | Fixed here |
| **Integration change** | A system's API, response shape, auth or limits changed | Refresh its recordings from the test account, fix the wrapper or node, and retest **every** automation using that connection |
| **Connection failure** | A credential expired, was revoked, or lost a scope | Renewed by me in the runtime's store; the registry updated; the expiry tracking fixed if it missed it |
| **AI quality** | An AI step's output was wrong | The run becomes a case (redacted); the fix goes through `/ai-evals` — prompt, schema, inputs or model — never a prompt edit without the eval |
| **Cost or loop** | Spend or calls far above the run's norm | The budget held or did not; the cause (a loop, a retry storm, a huge input) fixed, and the ceiling that should have stopped it checked |
| **Run delivery** | A duplicate, a missed or late run, a run that never finished | The idempotency key, the trigger, the overlap or catch-up policy, or the worker's capacity |
| **Bad input** | The caller sent what the contract does not allow | The validation rejects it with a clear response, and the caller is told — the contract does not quietly bend |
| **Spec error** | The spec is wrong or silent | Reported to me with the options; never decided here |
| **Change request** | The spec is right and I want different behaviour | `/automation-spec` revise mode |

### Step 4 — Plan → **wait for my approval**

For anything beyond a one-line fix: the root cause, the fix, the files, the tests and cases to add, the docs to update, and **what to do about side effects that already went out**. List them from the side-effect record — every affected run, what it did, to whom — and propose for each: reverse it (the runbook's reversal), correct it (a follow-up message, a corrected record), or leave it, with the reason. That decision is mine, because it touches real systems and real people.

### Step 5 — Failing test first

The lowest layer that reproduces it: a unit test for logic, a step test on the recorded failure for an integration, an end-to-end case for a run-level fault, a case plus an eval for AI quality. Run it; it fails.

### Step 6 — Fix

Make the change; the test passes; every suite of this automation and of every automation sharing a changed wrapper passes; for AI quality, the evals pass at their thresholds.

### Step 7 — Clean up side effects *(when I approved any)*

Carry out exactly what I approved — by hand from the runbook's reversal steps for a scheduled script or a build sheet, recorded on each run — or otherwise as a **correction run** (`workflow-standards` → Dry run, test runs and supervision): a one-off entry point shipped with the fix, started by hand, its keys prefixed `correction:` and the issue, run first as a dry run and then for real, with every action approved as it goes. Correction runs pass the pause switch, so this can happen while the automation is still paused. Record what was done on each affected run. A side effect whose sending cannot be confirmed by any lookup is resolved by a person first (`workflow-standards` → Idempotency).

### Step 8 — Ship and report

In the fix's PR, the register's row reads `Live · next Evaluated` (`Paused · next Evaluated` if Step 1 paused it) once every test, case and eval Section 3 lists passes — which is what `/automation-deploy` requires. When a revision is already in progress on `main`, the fix ships as a hotfix: its status is the hotfix branch's register row, and `main`'s row keeps the revision's stage, with the fix noted in Updated. The fix ships as a release through `/automation-deploy` — a patch version, or, when `main` holds unreleased changes to this automation, a hotfix: the branch `hotfix/{slug}-vX.Y.Z` from the live tag (created by a release owner), the fix by a PR to it, and the same fix by a PR to `main` (`ci-cd` → Hotfixes). Report per issue: what it was, the root cause, what changed, the tests and cases added, the side effects and what was done about them, the docs updated, and how it ships. Deliver it as a PR: create a branch off `origin/main`, or off the hotfix branch for a hotfix, push, give me the link. Never create the PR yourself. If Step 1 paused it, resume it once the fix is live and I approve, as `/automation-deploy` → Pause and retire says — supervised first at `medium` and `high` risk.

## 3. Definition of done

- [ ] Every issue reproduced and classified; spec errors reported, change requests routed.
- [ ] Every fix has a test or case that failed before and passes after; AI fixes passed their evals.
- [ ] Every automation sharing a changed wrapper was retested.
- [ ] Side effects already made were listed, decided with me, and handled as decided.
- [ ] The docs the fix touched are updated; the fix shipped through a release; the PR link was given.
