---
name: automation-setup
description: Set up an automation repository's foundation once, before the first automation is built — the workspace for the chosen language with the shared core (run records, side effects, budgets, model calls, approvals, holding area), the local stack with Hatchet and PostgreSQL and any n8n or Activepieces instance the automations need, the register's defaults, the CI workflows, and the infra guide. Use at the start of an automation project, or to bring an existing one up to the foundation the other skills assume.
---

# Automation Setup

Builds what every automation in this repository stands on. It runs once, before the first `/automation-build`, and again only to add a runtime the repository did not use before. It builds no automation: each one starts from `/automation-spec`.

## Read first

- **The rules in `.claude/rules/`** — they define what this skill builds, and it does not restate them.
- **`CLAUDE.md`**: the owner, the code stack, the runtimes in use, the hosting, the model providers. If the runtimes in use are not known yet, set up the code runtime and add a platform later when a spec chooses it.

If the repository already has code or workflows, take stock first. Keep what meets the rules, add only what is missing, and list anything that conflicts with them for me to decide. A credential in the repository, a workflow export with secrets in it, or a database or editor open to the internet is the first thing to raise.

## Step 1 — Plan → **wait for my approval**

State what exists, what will be created, and what the rules leave to this project: which runtimes to set up now; **each deployment's kind** — `vps` (recommended), `n8n-cloud` or `activepieces-cloud` — with the reason by `tech-stack` → Hosting, and for a vendor cloud, what its plan includes (the API, a custom domain, execution limits, retention, the platform version it runs, the nodes or pieces it allows), checked in the vendor's current docs or the account itself; the alert channel and heartbeat service, the backup target, the model providers and their data terms, the register's defaults. Check the current stable versions of every tool in `tech-stack` — Hatchet, n8n, Activepieces, the model layer, the database tools — against their docs rather than memory, and the current names of the settings the rules name (pnpm's supply-chain settings, n8n's and Activepieces' environment variables, Hatchet's self-hosting options). Where n8n is in use, confirm on its pinned version how a workflow is written over a fixed id (or, on n8n Cloud, created and found by name) and published while n8n runs (`workflow-standards` → n8n conventions), that `WEBHOOK_URL` puts its resume URLs on the hooks domain, and — on n8n Cloud — whether calls to the shared guard count toward the plan's execution limit, so the spec's limit check counts them; where Activepieces is, the API operations for importing and publishing a flow, how the pinned version sets the base of its webhook and resume URLs apart from the editor's, and whether it offers an approval that needs a confirming form. Confirm that the pinned Caddy retries a request with a body while its upstream restarts (`ci-cd` → Packaging). Say which versions the foundation will pin — for a vendor-cloud deployment, the platform version the cloud runs. Record each deployment and its kind in `CLAUDE.md`.

## Step 2 — The workspace and the shared core

Exactly as the coding standards' project structure describes. The run-record tables are needed on every runtime — n8n and Activepieces automations write their keys and side effects to them too (`workflow-standards` → Run records) — so the workspace, the shared core's database schema and its migrations are set up even when only a platform is in use.

- The workspace (pnpm with its supply-chain settings, or `uv`), the lint, format and type-check configuration, a pre-commit hook (with `gitleaks` where the repository's plan lacks push protection — `security` → Secrets and credentials).
- **`packages/core`**: configuration loading from the deployment's config file and the environment, the logger with its redaction list, the database schema and first migration for the shared tables (including the owner-editable settings, the pause switch per automation and the polling cursors), the run record with step outputs and each run's mode, `effect()` honouring the run's mode and the pause switch, the budget's reserve and settle, the model call wrapper (`callModel` / `call_model`) with timeouts, token ceilings, retries, cost and logging, the inbound HTTP server with signature checks, test-run markers and holding while paused, approvals with signed single-use links (and supervision's approve, reject and timeout), and the holding area with `holdInFlight`.
- **An example automation**, `automations/_example/`, that shows a webhook trigger, a scheduled trigger, a deterministic step, an AI step with its prompt file and output schema, a side effect through `effect()`, a durable wait for an approval, a holding-area path, its config file, its tests on recorded responses and one eval. The first real build deletes it.
- **An example integration wrapper**, `integrations/_example/`, with its typed methods, error mapping, pagination, rate limit and fixtures.

## Step 3 — The local stack

A Compose file for development, `deploy/local/compose.yml`, with only what the runtimes in use need:

- **Code:** PostgreSQL and Hatchet; each build adds its automation's worker service, and its development values in `deploy/local/config/{slug}.json`.
- **n8n** *(when in use)*: n8n at the pinned version on PostgreSQL, an encryption key generated for local use only, the import, publish and export scripts `testing` → Testing on n8n and Activepieces relies on, and an example workflow, `automations/_example/workflow.json`, with a webhook trigger, the Config node, a model call and a side effect each behind the shared guard (`automations/_shared/n8n/guard.json`, built here), and a run-record write; and the hold-in-flight script.
- **Activepieces** *(when in use)*: Activepieces at the pinned version on PostgreSQL and Redis, the same scripts, the shared guard sub-flow, and an example flow, `automations/_example/flow.json`, built the same way.
- The dev commands — start and stop the stack, run tests, run evals, import and export a workflow — recorded in `CLAUDE.md`.

## Step 4 — Docs

- **The register's Defaults** from the plan: retries, retention, alert channel, default model, default budgets.
- **`docs/infra/infra-setup.md`**: every step only I can do, numbered — for a `vps`, the server (provider, size, SSH key, firewall), the domain and DNS records; for a vendor cloud, the account and plan, two-factor sign-in for every member, the platform's API key, and the managed PostgreSQL (`security` → The managed database); the heartbeat service, the backup bucket and its credentials, the model provider accounts with their spending limits and data settings, the alert channel's webhook or address, the GitHub environments (`test`, `release`, and `deploy-{deployment}` per deployment) or, on a plan without them, the repository secrets (`ci-cd` → Repository rules), branch protection for `main` and `hotfix/*`, the release owners. `/automation-deploy` adds each deployment's steps.
- The `docs/automations/` folder is ready; specs arrive with `/automation-spec`.

## Step 5 — CI

The three workflows `ci-cd` defines — PR checks, the release gate and the deploy — with actions pinned to commit SHAs, least-privilege tokens, and the environments' secrets used only where `ci-cd` says. Dependabot for packages, actions and images. In the infra guide: turning on secret scanning with push protection where the repository's plan has it, or that the pre-commit hook and Pipeline 1's scan cover it where it does not.

## Step 6 — Verify and report

1. **From a clean clone:** install; the local stack starts; the example automation's tests pass; its webhook trigger runs end to end in dry-run mode and its run record shows every step, the model call (on a recorded output) and the would-have side effect; in that dry run the approval is recorded as would-have-asked and the run continues, and with `dryRun` off on test accounts the approval link resumes the waiting run; a run started in dry run stays a dry run after `dryRun` is switched off; with `supervised` on, every side effect waits for an approval; pausing mid-run holds the run at its next model call or side effect, a payload or a scheduled slot that arrives while paused is held, not lost, and `holdInFlight` moves a waiting run to the holding area; a dry run of an item does not stop the real run of the same item later; a duplicate trigger is recorded as a duplicate and does nothing; a test-marked trigger runs as a test run with every side effect recorded as would-have, even with `dryRun` off; a forced failure lands in the holding area and reprocesses to completion; a budget set to zero stops the run before the model call. Where n8n or Activepieces is set up: the example workflow imports, runs a case through its webhook, and exports back to the same normalised JSON; and through the guard, a dry run records would-have, a supervised run waits for an approval and holds the item on a rejection (if the pinned n8n version does not return from a waiting sub-workflow, the wait moves to the calling workflow, as `workflow-standards` → n8n conventions says), a paused run holds itself, and the hold-in-flight script moves a waiting execution to the holding area.
2. **Report:** what was created, the commands, the versions pinned, what remains for me (the infra guide), and any open decisions.
3. **Deliver it as a PR.** Create a branch off `origin/main`, push to it, and give me the link to create the PR. Never create the PR yourself.
