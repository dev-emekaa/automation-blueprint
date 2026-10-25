---
name: automation-build
description: Build one approved automation for its runtime — code on Hatchet, a scheduled script, an n8n workflow, an Activepieces flow, or a Zapier or Make build sheet — with its integrations, AI steps, idempotency, approvals, holding area and run records, its tests on recorded responses, a dry-run walk of every case, and its runbook, delivered as a PR. Use once an automation's spec is approved; also used by /automation-convert to rebuild for another runtime.
---

# Automation Build

Builds what `/automation-spec` approved, for the runtime the spec names, and nothing else. It ends at `Built`: evals are `/ai-evals`', deploying is `/automation-deploy`'s.

## Project configuration

Read from `CLAUDE.md`, asking once for anything missing and offering to record it: the code stack, the runtimes in use, the dev commands. The default model and budgets come from the register's Defaults.

## Modes

- **New** — the default: the row is `Specced`.
- **Revision** — a new version of a `Live` automation, after `/automation-spec` revise mode: the row reads `Live · next Specced`. The build changes the automation in place; the live version keeps running from its tag until `/automation-deploy` replaces it.
- **Conversion** — called by `/automation-convert` for another runtime: the row is `Live`, and the conversion was approved there. The new build goes in `automations/{slug}/next/`, beside the live one, until the cut-over moves it up. Every path in Step 3 is read with `next/` inserted (`automations/{slug}/next/workflow.json`, a code package at `automations/{slug}/next/`, which the workspace includes as a member).

## Read first

- The spec, its cases, and the automation's row in the register. **Never build from a spec whose version to build is not `Specced`** — a conversion builds the live spec, once `/automation-convert` has my approval — or that still has blocking open questions. Start from an up-to-date `origin/main` that holds the merged spec PR; if it is not merged, stop and ask.
- The connections registry entries for every system the spec names, and the existing wrappers in `integrations/`.
- The rules: `workflow-standards`, `integrations`, `ai-steps`, `security`, `testing`, and the coding standards for code.

## Step 1 — Plan → **wait for my approval**

From the spec, list before building:

- **The runtime and its shape**: for code, Hatchet or scheduled-script mode (`tech-stack`), the workflow's steps as tasks, their retries, concurrency and rate-limit keys; for n8n or Activepieces, the nodes or pieces per step, the sub-workflows, the Config node's values.
- **Integrations**: for each system, the wrapper or node to reuse or create, by the order in `integrations` → Integration calls; the operations needed; the scopes; whether a test account exists. A new system follows Step 2.
- **AI steps**: for each, the prompt's job, the output schema, the model to start with, the token ceiling, the fallback, and — for an agent — its tools, each read or write, and their limits.
- **Idempotency**: the run key, and the key for each side effect.
- **Waits and approvals**: each, with its channel, timeout and timeout outcome.
- **Failure paths**: the holding area, the compensating actions, the alerts.
- **State**: any table or cursor the automation keeps, with its migration.
- **Tests**: the unit and step tests, and how every case will run end to end.
- **New dependencies, nodes, pieces or MCP servers**, each with the reason and its review (`security` → Supply chain), or none.
- **Anything the spec does not settle**, as questions. Unsettled behaviour is not decided here: it goes back to `/automation-spec` in revise mode.

## Step 2 — Integrations

For every system the plan names:

- **Reuse the wrapper** if one exists and has the operations; add operations to it otherwise, with their recordings.
- **A new system:** read its current API reference, auth methods, scopes, rate limits, webhook signing, pagination and versioning — from the vendor's docs, not memory. Create the wrapper (code) or choose the node or piece (platforms) by the order in `integrations`. Record responses from the test account for every operation, failures included, redacted.
- **Update `docs/connections.md`**: kind, auth, scopes with reasons, account, test account, limits, API version, where the credential will be stored, expiry. The credential itself is created by me, in the runtime's store, never pasted into the session.
- **Inbound webhooks from the system:** its signature verification, replay window and event-id deduplication, before anything else.

You may use connectors in this session to look at real data shapes, read-only (`integrations` → While building).

## Step 3 — Build

**`VERSION`**: `0.1.0` for a new automation. A revision leaves it alone — `/automation-deploy` bumps it. A conversion leaves the live build's `VERSION` alone and writes `next/VERSION` as the live version's next minor (next major if the trigger contract changes), which the cut-over moves up.

**The first real build** deletes the examples setup made — `automations/_example/`, `integrations/_example/`, `deploy/local/config/_example.json` and the example's service in `deploy/local/compose.yml` — unless I ask to keep them.

**Code runtime**, exactly as the coding standards describe: the package in `automations/{slug}/`, the workflow with its triggers and steps, the inbound HTTP routes it needs, each side effect through `effect()`, each model call through the model wrapper, prompts as files, each AI step's model in `models.json`, schemas for the trigger contract and every step's output, the configuration schema, the Dockerfile; the worker service added to `deploy/local/compose.yml` and its development values to `deploy/local/config/{slug}.json`.

**n8n**: the workflow in the pinned local instance, by the conventions in `workflow-standards` → n8n conventions — its fixed id, the Config node setting the run's mode, the shared guard (`automations/_shared/n8n/guard.json`) called first and before every model and side-effect node, the run-record writes, credentials by name, the error workflow, fixed webhook paths, sticky notes; shared sub-workflows in `automations/_shared/n8n/`. Export it, normalise it, save it as `automations/{slug}/workflow.json` with `VERSION`.

**Activepieces**: the flow in the pinned local instance, by its conventions — the config step, the shared guard sub-flow before every model and side-effect step, every piece version pinned; exported, normalised, saved as `automations/{slug}/flow.json` with `VERSION`.

**Build sheet** (Zapier, Make): `docs/automations/{slug}/build-sheet.md` — every step in order with the exact app, event or module, every field mapping, every filter and path, the error handling, the connections to create and their scopes, and a check to run after each section. Written so a person can build it without guessing, and labelled with the platform version it was written against.

On every runtime:

- **Every step from the spec, in order**, with its typed or validated output.
- **Every decision rule implemented** exactly as written, with no thresholds invented.
- **The run record and the side-effect record** for every run (`workflow-standards` → Run records).
- **The holding area and its reprocess path**, and the compensating actions the failure policy names.
- **The budget**: reserved before each model call in code; token ceilings and the daily check on a platform.

## Step 4 — Tests

As `testing` describes: unit tests for the transforms and decision rules, step tests for each wrapper operation and AI step on recorded responses (failures included), and an end-to-end run of **every case** in dry-run mode. For n8n and Activepieces, the cases run against the pinned local instance through the import, run and compare scripts, and the workflow is exported again after they pass. Run every suite, including the other automations' that share a wrapper this build touched.

**Build sheet:** nothing can be run from here. The cases become the checklist I run once I have built it on the platform; I report each result and you record it in the walk as reported by me.

## Step 5 — Walk the cases → present

Run each case in dry-run mode and present the walk in the chat, case by case: the input, the steps that ran, each AI step's output (on its recorded or test-account response), the side effects recorded as would-have, and whether it matched the case's expected outcome. Then the failure cases: the duplicate, a system down, an AI step's invalid output, a budget hit, an approval timing out. End with everything that did not match, and fix it before Step 6.

What you cannot observe yourself — a consent screen, a message arriving in a real inbox, the platform's UI in my browser — is my check: give me the checklist, I report, you record. Mark each item in the walk **verified** or **reported by me**.

## Step 6 — Runbook and register

- **`docs/automations/{slug}/runbook.md`**: what it does in two lines; how to trigger it and a ready-to-run test call; how to run it in dry-run mode; each alert it can raise, what it means and what to do; how to read a run record; how to reprocess from the holding area; how to reverse each side effect; how to pause it.
- **The register's row**: `Built` for a new automation, `Live · next Built` for a revision or a conversion (`Paused · next Built` if it is paused), with the date in Updated; the inbound endpoints it will expose are added with their authentication.

## Step 7 — Report and deliver

The automation in one line; the runtime and shape; the integrations reused or added; the AI steps with their starting models; the tests by layer; the walk's result; the endpoints it will expose; what remains before it can go live (evals, credentials, deploy); open questions. Deliver it as a PR: create a branch off `origin/main`, push, give me the link. Never create the PR yourself.

Next is `/ai-evals` when the automation has AI steps. When it has none and every case passed end to end, the row is marked `Evaluated` (or `Live · next Evaluated`, `Paused · next Evaluated`) in this PR, and `/automation-deploy` is next.

## Definition of done

- [ ] Every step, decision rule, side effect, checkpoint and failure path in the spec is built, and nothing that is not in it.
- [ ] Every system goes through a wrapper or a node chosen by the rule's order, and its registry entry is complete.
- [ ] Every side effect is keyed, recorded and reached only through `effect()` or the shared guard, which apply the run's mode — dry, test, supervised — and the pause switch; every model call is bounded, budgeted and checks the pause switch.
- [ ] The walk included a supervised run (an approval, a rejection that holds the item) and a paused one (held at the next check).
- [ ] Every case runs end to end in dry-run mode, the walk was presented, and everything it caught is fixed.
- [ ] The runbook exists, the register's row shows the build, its endpoints are listed, and the PR link was given.
