---
name: automation-convert
description: Move an automation to another runtime — code, n8n, Activepieces, or a Zapier or Make build sheet — by rebuilding it from its spec and cases, proving the new build gives the same results on every case and eval, switching over by pausing, swapping and resuming so no run is lost or made twice, and supervising it on live traffic where the risk calls for it. Use when the owner wants to see and edit it on a canvas, needs code's control, has a licence reason to change platform, or is moving to or from Zapier or Make.
---

# Automation Convert

A conversion is a rebuild, not a translation. Workflow JSON from one platform is never turned into another's: the runtimes handle credentials, errors, AI and waits differently, and a line-by-line translation carries the old runtime's shape into the new one. The spec and the cases are what is portable; this skill rebuilds from them and proves the result.

## Step 1 — Decide → **wait for my approval**

Read the spec, the cases, `evals.md`, the runbook, the register's row and the current build. Where the live build is on n8n or Activepieces, check it for edits made in production (`ci-cd` → Deploy, step 1); an edit goes through `/automation-fix` or `/automation-spec` revise mode first, so the conversion starts from what is really running. Present:

- **Why**, and whether the target fits by `tech-stack` → Choosing a runtime — say plainly if it does not (an agent-heavy automation moving to a canvas, say), and what would be lost.
- **What changes**: the integrations available on the target (a maintained node, a piece, an SDK, or a wrapper to write), how each AI step, wait, approval and the holding area are expressed there, and anything the target cannot do as well — on n8n and Activepieces, budgets cannot be reserved before a call (`ai-steps` → Budgets).
- **The licence**, where the target is n8n.
- **The hosting**: whether the target runs on the same deployment. Moving to code means a `vps`; moving onto or off a vendor cloud changes the public webhook URL, so every caller the spec names must be repointed during the switch (`tech-stack` → Hosting).
- **The cut-over plan**: when the pause in Step 4 can happen, how long it should last, and the supervision period after it (`/automation-deploy` Step 1's rollout).

If the conversion needs the spec itself to change — a step that exists only because of the old runtime — that goes to `/automation-spec` in revise mode first.

## Step 2 — Rebuild

Run `/automation-build` in conversion mode for the target runtime, from the same spec, into `automations/{slug}/next/` beside the live build, reusing every wrapper and connection that still applies and mapping each connection to the target's store in the registry. The live build, its `VERSION` and its row's status are untouched; the row reads `Live · next Built`. A conversion to Zapier or Make produces the build sheet, and its cut-over is done by me on that platform, with Step 4's order as my checklist.

## Step 3 — Prove parity

- **Every case passes** on the new build, end to end, in dry-run mode — and derives **the same run key and side-effect keys** as the live build for every case (`workflow-standards` → Idempotency), so neither build can repeat what the other did; and, for a polling trigger, reads a copy of the live cursor row and fetches the same next batch the old build would.
- **The evals pass** on the new build at the same thresholds; a lower score is a regression to fix, not a cost of converting.
- **Recent production inputs**, where the old build's run records still hold them: the new build runs a sample of them in dry-run mode against test accounts and recorded responses, and its would-have actions are compared with what the old build did. The agreement and every disagreement go in `releases.md`.

Present the parity result before going on. The new build is never deployed beside the live one; its first contact with live traffic is the switch-over, under supervision where the risk calls for it.

## Step 4 — Switch over → **wait for my approval**

A switch across a caller, Caddy and two runtimes cannot happen in one instant, so the automation is paused around it. While it is paused, every run of either build holds itself at its next check and everything that arrives is held (`workflow-standards` → Pausing), so nothing is lost and the two builds never both act.

1. **Check for production edits again, then pause** the automation (`/automation-deploy` → Pause and retire).
2. **The switch-over PR**: `next/` moves up to replace the old build's files, which are deleted, bringing its `VERSION` with it, with the release entry; when the target is code, the new worker's service is added to the bundle (with its `VERSION` bumped) — the old worker's service stays until the switch is confirmed; the config file sets `supervised: true` where the rollout calls for it. Nothing else in the automation changes in this PR, so what goes live is what was proven in Step 3.
3. **When the conversion moves to another deployment** (onto or off a vendor cloud): copy the automation's rows — the pause switch (still on), cursors, idempotency keys and side-effect records within retention, and the holding area — from the old deployment's run-record database to the new one's, and check the counts match, before anything is released there. The new build then sees everything the old one did, and starts paused. After the release below has held the old build's in-flight runs and the callers are repointed, copy again the rows the old deployment gained since — held items, side-effect records, keys — and check those counts too, before resuming.
4. **Release**, through `/automation-deploy`: first Pipeline 3 for `infra` when the bundle changed — it never starts or removes an automation's worker; then Pipeline 3 in `release` mode, which holds the old build's in-flight runs, deploys and publishes the new build (starting its service, for code), moves any vendor subscription an app trigger needs from the old build to the new one, points the automation's route at it (on the same `vps` the public URL is unchanged, so callers change nothing; when the conversion moves onto or off a vendor cloud, each caller the spec names is repointed to the new URL now, while everything is held), and — once the smoke check passes — removes the old build's service or workflow. When the source was code, a later PR takes its service out of the bundle. Polling cursors are in the shared run-record database (copied in the step before, for a move between deployments), so the new build continues from where the old one stopped. A move between deployments then retires the automation on the old one (`ci-cd` → Deploy).
5. **Resume**, with the supervision the rollout calls for. The held items — runs that held themselves, runs moved there in flight, everything that arrived during the switch — are in the shared holding area with the side effects each already made; they are reprocessed on the new build or dropped, as I decide, and an item that already made a side effect is decided from that list.

Then the register's inbound endpoints are updated, the first live runs watched, and supervision, where it applies, reviewed and ended as `/automation-deploy` Step 6 says.

### Undoing a conversion

If the new build has to go before its supervision ends, convert back the same way: pause; a PR restoring the old build's files from its tag and, where it is code, its worker service in the bundle, and removing the new build's files; Pipeline 3 for `infra`, then in `rollback` mode to the old version, which holds the new build's in-flight runs, deploys the old build, moves any vendor subscription back, and removes the new build once its smoke check passes; a later PR takes the new build's service out of the bundle where it was code; resume. `main`'s `VERSION` is now the old version, below the abandoned build's tag, so the next release bumps above that tag.

## Step 5 — Record

The register's row shows `Live`, the new runtime and the new version; the runbook is rewritten for the new runtime; `releases.md` has the conversion, the parity result and the cut-over; the connections registry shows each connection's new store. Deliver the PRs through the skills that made them.
