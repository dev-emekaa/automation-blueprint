---
name: automation-adopt
description: Bring existing automations under this blueprint — a repo, an n8n or Activepieces instance, or a set of scripts built before it or that I have just joined. Inventories what runs, decides whether each runtime fits, reconstructs the register, the connections registry and a spec and runbook per automation from what exists, with each fact citing its source, and lists where they depart from the rules as issues or a proposed change. Use once; changes no automation.
---

# Automation Adopt

You are a senior engineer taking over automations nobody documented the way this blueprint expects. The other skills assume automations they specced and built: a register, a connections registry, a spec with cases, a runbook, a deployment. This skill gives existing automations those, from what runs today, so every later skill treats them exactly as it treats ones built here.

Two rules hold throughout. **Nothing is invented:** every reconstructed fact cites where it was read from — a file and line, or a node in a workflow. **Nothing that runs changes:** what an automation does wrong becomes an issue or a proposed change, never a fix made here.

## Read first

`CLAUDE.md` if it exists, and the rules: `documentation-conventions`, `tech-stack`, `workflow-standards`, `integrations`, `ai-steps`, `security`, `testing`.

## Step 1 — Inventory → **wait for my approval**

Read the repository, the workflow exports, or the instance I give you access to — one automation at a time, every step of it; never summarise a workflow you have not opened node by node — and present:

- **What runs:** every automation, with its trigger (schedule, webhook, event, manual), the systems it reads and writes, the side effects it causes, whether it has AI steps, where it is deployed, and whether it is on.
- **Shape:** the runtime of each (code, n8n, Activepieces, Zapier or Make), the language and framework for code, how it is deployed and hosted, how secrets are held, what records runs, what alerts.
- **Connections:** every external system, how it is reached, which account acts, and the access it has.
- **What is written down:** any docs, and how far they match what runs.

A credential found in a workflow, an export or the repository is raised to me the moment it is found, not held for the report: `security` says rotate first.

Then the **runtime verdict**, from `tech-stack` → Choosing a runtime, per automation: the runtime it is on, whether that fits its risk and deployment kind, and whether it stays or is converted. A code automation that is neither on Hatchet nor a fit for scheduled-script mode, or on a host other than the blueprint's kinds, keeps the documentation skills — `/automation-spec` in revise mode and the register — and loses `/automation-build`, `/ai-evals`, `/automation-deploy`, `/automation-fix` and `/automation-console` until it is converted with `/automation-convert` or rebuilt. A code automation in the other language from the installed `coding-standards` is said so too: I re-run the installer with the right `--stack`, or it is converted. Say which skills apply to which automation.

I approve the inventory and the verdicts, or correct them. Nothing is written before that.

## Step 2 — Reconstruct the docs

Each document is written to the format of the skill or rule that owns it — with one addition: the line `Reverse-engineered from what runs on {date} — verify` at the top, and a `source:` citation on every step, side effect and connection. Marker and citations both come off when I approve the document in Step 4 — the report keeps each document's citations — so the approved spec is runtime-neutral, as `documentation-conventions` requires.

1. **The register** — `docs/automations.md` in `documentation-conventions`' form, one row per automation, with its real status: `Live` if it runs in production with real side effects, `Paused` if deployed and off, `Built` if it exists but has never run in production. Version is `—` until the first release; Deployed to names the deployment as recorded in `CLAUDE.md`; Updated reads `adopted {date}`, so the register shows the status was observed, not gated. The defaults `/automation-setup` writes are left blank until that skill runs.
2. **The connections registry** — `docs/connections.md`, one entry per system and environment, with the access each actually has; over-broad access is a finding.
3. **A spec per automation** — `docs/automations/{slug}/spec.md` in `/automation-spec`'s form, runtime-neutral, from the steps as they are: goal as far as it can be read, trigger and its contract, systems and side effects, decision rules, human checkpoints if any, failure behaviour, risk by the table in `documentation-conventions`. No cases are invented: the cases folder holds the real inputs and outcomes that logs or records still have, one file each as `testing` → Cases describes, redacted as `security` says and only with my agreement; the spec's open questions say how many more are needed before the automation can reach `Evaluated`.
4. **A runbook per automation** — as `/automation-build` writes it, from what exists: how to trigger and test it, what each alert means, how its side effects are reversed. Where nothing exists for a section, it says so.
5. **Infra** — `docs/infra/infra-setup.md` for what is actually in place, as `/automation-setup` writes it.

## Step 3 — Gaps and deviations

Two lists, with nothing changed:

- **Foundation gaps** — what `/automation-setup` gives a new project and this one lacks: run records, idempotency around side effects, the pause switch, budgets on AI steps, approvals, alerting, backups, the CI workflows, the infra guide.
- **Deviations** — where an automation departs from the rules (`security` first: credentials, inbound endpoints, untrusted content; then `workflow-standards`: idempotency, partial failure, approvals, and the n8n or Activepieces conventions where that is the runtime — the workflow in the repository at its fixed id, the Config node, the guard, the run-record writes, the error workflow, credentials only in the store; then `integrations`; `ai-steps` for AI steps), and where the spec's risk level demands a checkpoint or supervision the automation doesn't have. Each finding: source, the rule it fails, severity, the fix.

Route each item: an **`/automation-fix` item** when it is one change to one automation; a **revision of the spec** through `/automation-spec` in revise mode when the automation should behave differently; a **conversion** through `/automation-convert` when the runtime verdict said so — the report says what the source lacks (run keys, a pause switch, run records), so that skill's parity check runs on the source's own logs and its cut-over is stop the old, start the new, under supervision where the risk calls for it, with me doing the stop.

Every adopted automation on a fitting runtime has one standing item before any other change to it, routed to `/automation-fix` and done once `/automation-setup` has built the foundation: **bring it into the repository as the blueprint lays it out, with no change to what it does** — the export normalised at its fixed id, or the code in its package; the Config node, the guard and the run-record writes; a `VERSION` for the build that is live; and its first release through the pipeline. Until that item is done, `/automation-fix` can reproduce and plan but nothing ships; and until the cases the spec says are missing exist, and `/ai-evals` has run where there are AI steps, no new version can reach `Evaluated`. Say this per automation in the report.

A `high`-risk automation running without the checkpoints its risk requires is the first item. Whether it pauses now is my decision; if I say so, it is paused the way its runtime allows — the workflow deactivated, the cron entry disabled — by me, and its register row reads `Paused` with the reason.

## Step 4 — Approve, per automation → **wait for my approval**

Present each automation's spec, runbook and register row with their citations, lowest risk first, and the two lists. I confirm the docs are true — opening a cited step takes seconds — or correct them; marker and citations come off each approved document. The lists are findings for the skills named in Step 3 to take from the report.

## Step 5 — Record

1. `CLAUDE.md`: the project configuration from the inventory, the deployments, a row for `docs/adoption-report.md` in the documentation map, and a line per automation that is not on the blueprint's runtimes: `Runtime: {what it is} — documentation skills only until converted; see docs/adoption-report.md`.
2. **`docs/adoption-report.md`:** the inventory, the verdicts, what was written and from where (each document's citations), the foundation gaps, the deviations with their routing, the standing item per automation, and what I should still verify by hand. Dated.
3. Commit the docs and the report.

## Report

A few lines: how many automations, which skills apply to which, how many issues and conversions, which automation I should look at first and why, and the next step — `/automation-setup` to add the foundation if it's missing, then `/automation-fix` on each automation's standing item, or `/automation-convert` for the first conversion.

## Rules

- Nothing that runs is changed, paused or redeployed here. Pausing a dangerous automation is my decision.
- No spec says what the automation doesn't do. Intent it doesn't carry is a question to me.
- Existing docs are inputs, not truth: what runs wins, and the disagreement is noted.
