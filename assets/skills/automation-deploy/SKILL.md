---
name: automation-deploy
description: Take an evaluated automation, or a new version of one, to production — generate or update the deployment's Docker Compose bundle, prepare the server, set up credentials, backups, heartbeats and alerts, release it through the deploy pipeline, run a first release in dry-run or shadow mode and a new version under supervision, check every go-live condition, switch on real side effects with your approval, and record the release. Use for a first deployment, every later release, hotfixes, infrastructure and console releases, rollbacks, pausing, resuming and retiring.
---

# Automation Deploy

Gets an automation running in production and keeps a record of every release. The pipeline (`ci-cd` → Deploy) moves code and configuration; this skill does what a pipeline cannot — the server, the credentials, the checks a person must see, and the moment real side effects begin — and stops for my approval at each.

## Read first

The automation's spec, row in the register, `evals.md`, runbook and `releases.md`; the deployment's `deploy/{deployment}/` bundle if it exists; `ci-cd`, `security` and the infra guide. Start from an up-to-date `origin/main` that holds the merged build and evals PRs — for a hotfix, the `hotfix/*` branch holding the merged fix, whose own register row carries its status — and if they are not merged, stop and ask. **Never deploy a version that has not reached `Evaluated`** (`Live · next Evaluated` or `Paused · next Evaluated` for a new version of a deployed automation, including a fix from `/automation-fix`).

## Step 1 — Decide the release → **wait for my approval**

Present: the automation and version; what changed since its last tag, in plain terms; the eval results; the side effects it will make and its risk; the rollout (below), with the agreed bar to end it; the deployment it goes to, and staging first if the spec requires it; the backups and checks that will run; how to roll it back. For a hotfix, the hotfix branch from the live tag (`ci-cd` → Hotfixes).

**Rollout** (`workflow-standards` → Dry run, test runs and supervision):

| Risk | First release | New version of a live automation, or a conversion |
| --- | --- | --- |
| `low` | A smoke check, then live | The checks below, then live |
| `medium` | A dry run on real triggers for an agreed number of runs or days, reviewed, then live | The checks below, then live — supervised for an agreed period when the change alters an AI step's prompt, model or schema, or the runtime |
| `high` | Shadow mode on live traffic, compared with what a person or the old system did, until the agreed agreement rate holds; then live, with approvals as the spec sets them | The checks below, then live — supervised for an agreed period when the change alters a decision rule, an AI step, a side effect or the runtime |

**The checks for a new version**: every case passes end to end; the evals pass where it has AI steps; the integration tests pass on test accounts (or on staging, where it exists); after the deploy, the smoke check's test run completes. A new version replaces the live one; the two never run side by side.

## Step 2 — Prepare the release

- **Version**: a PR that bumps `automations/{slug}/VERSION` and adds the entry to `docs/automations/{slug}/releases.md` — version, date, what changed, the eval results, the rollout; for a hotfix, the `main` PR that carries the same fix. Give me the link; the release continues from the merged commit. For a hotfix, this PR goes to the `hotfix/*` branch. A code automation's first release on a deployment first adds its worker service to `compose.yml` through an infrastructure release (below); the service starts with its own release.
- **Configuration**: `deploy/{deployment}/config/{slug}.json` with the production values (`workflow-standards` → Configuration) — for a first release with `dryRun: true`; for a supervised release with `supervised: true`; otherwise the live file plus any new keys. It goes in the same PR, except for a hotfix: the pipeline reads configuration only from `main`, so a hotfix's configuration change is its own PR to `main`.

## Step 3 — The deployment *(first time, or when it changes)*

By the deployment's kind in `CLAUDE.md` (`tech-stack` → Hosting), confirmed with me on its first deployment. A `vps` follows 3a–3d; a vendor cloud follows Vendor cloud, below.

**3a. Generate** `deploy/{deployment}/`, versioned as `infra-{deployment}`:

- **`compose.yml`**: Caddy, PostgreSQL, and per runtime — Hatchet and one worker service per code automation, each with its config file mounted and its image tag from the server's environment file (`ci-cd` → Packaging); n8n (with Redis and workers in queue mode when the build plan chose it, and the execution-pruning variables from the register's retention); Activepieces with Redis; the console when used. Exact image versions pinned; health checks on every service; restart policies; resource limits per worker; no published ports except Caddy's; volumes for data.
- **Caddy**: a `Dockerfile` that builds Caddy at a pinned version with the pinned `caddy-ratelimit` module (`security` → Supply chain), and a **`Caddyfile`** with one site per subdomain — the hooks domain, the platform editor, the engine dashboard, the console — with automatic HTTPS, rate limits, the access restrictions `security` → Inbound endpoints sets for each, and the import of the route files the pipeline writes (`ci-cd` → Packaging).
- **`config/`**: the config file for each automation on this deployment.
- **`.env.example`**: every variable with a placeholder and a comment; the real `.env` exists only on the server and in my password manager.
- **`backup.sh`** with its schedule: an encrypted `restic` backup of the database dumps to the backup target, and a reminder that the platform's encryption key is kept separately.
- **`README.md`**: how to bring the deployment up, update it, back it up, restore it, and read its logs.

**3b. The server**, from the infra guide — mine to do, with you guiding each step and checking what I report:

1. A server per `tech-stack` → Services, with SSH by key, the firewall from `security` → The server, automatic security updates, Docker Engine and Compose.
2. DNS records for each subdomain.
3. The `.env` on the server, with every secret generated fresh for this deployment — never reused from development.
4. **The deploy key**: a key pair for this deployment only, its public half allowed on the server for a user limited to the deploy commands, and the `deploy-{deployment}` GitHub environment (or the repository secrets, on a plan without environments — `ci-cd` → Repository rules) holding the server address, its SSH host key and the private key.
5. **The registry token**: a read-only token for the repository's container registry, in the server's `.env`, so the server can pull worker images.

**3c. Bring it up**: the bundle's PR merged; Pipeline 3 run for `infra` on this deployment (`ci-cd` → Deploy); every infrastructure service's health check green. Automation workers start with their own first release (Step 4).

**3d. On the running deployment** — mine to do where it needs an account or a consent screen:

1. **Credentials created in the runtime's store**: each connection's production credential, with the scopes in the registry, and any OAuth consent; the registry's "Stored in" and "Expires" are updated from what I report. On n8n and Activepieces, the credential for the run-record tables too (`workflow-standards` → Run records).
2. **The platform's API key** for the deploy: on n8n, in the server's `.env` — full-access unless the instance is on n8n's Enterprise plan, where its scopes are limited to workflows; on Activepieces Platform or Enterprise, the same. Activepieces Community issues none, so its releases follow the manual path in `ci-cd` → Deploy.
3. The heartbeat checks, one per scheduled automation, and the alert channel wired to the runtime's failure alerts, the heartbeat service and the budget check.
4. **A restore test**: back up, restore to a scratch database, confirm it reads — once now, and after any change to the backup setup.

Add every step to `docs/infra/infra-setup.md` for this deployment, and the deployment to `CLAUDE.md`.

### Vendor cloud *(`n8n-cloud`, `activepieces-cloud`)*

No server and no bundle: `deploy/{deployment}/` holds its `VERSION`, a `README` and `config/`. Mine to do, with you guiding each step and checking what I report:

1. **The account and plan** confirmed against what setup recorded — the API, execution limits, retention, the platform version, the nodes or pieces allowed — and two-factor sign-in for every member.
2. **The managed PostgreSQL** for the run records (`security` → The managed database): TLS, the platform's restricted role and the pipeline's migration role, the platform's outbound addresses allow-listed where the database supports it, and its backups.
3. **The `deploy-{deployment}` GitHub environment** with the platform's URL and API key and the database's migration credential (`ci-cd` → Repository rules). A plan without the API uses the manual import path (`ci-cd` → Deploy).
4. **Pipeline 3 for `infra`**: the database's migrations and roles, and the shared workflows.
5. **Credentials in the platform's store**: each connection's production credential, any OAuth consent, and the run-record database's credential; the registry updated from what I report.
6. The heartbeat checks and the alert channel wired to the platform's failure alerts, the heartbeat service and the budget check.
7. **A restore test** of the managed database.

The automation's webhook URLs are the platform's (or the plan's custom domain); list them in the register's inbound endpoints. Add every step to `docs/infra/infra-setup.md`, and the deployment to `CLAUDE.md`.

### Staging *(when the spec requires it)*

The same Step 3 for a separate deployment, `deploy/{deployment}-staging/`, with its own `deploy-{deployment}-staging` environment, on the test accounts' connections. Every release of that automation runs Steps 4 and 5 there first and passes its checks before the same version, at the same commit, goes to production (`ci-cd` → Versions and tags).

### Infrastructure releases

A change to the bundle, the shared workflows in `automations/_shared/` or the console: a PR that bumps `deploy/{deployment}/VERSION`, then Pipeline 3 for `infra`, then the endpoint check (Step 5). The infra guide's section for the deployment is updated to match.

## Step 4 — Release

Run the deploy pipeline in `release` mode (`ci-cd` → Deploy), or ask me to if I am the release owner. A failure rolls back and stops; the cause goes to `/automation-fix`.

## Step 5 — Endpoint check

Compare the server with the register's inbound endpoints: every URL listed answers with the authentication it should and rejects what it should (an unsigned webhook, an expired approval link, a signed-out request to the editor, a webhook, form or API path on the editor's subdomain); the platforms' resume paths on the hooks domain answer only for a waiting run, and their approvals need a confirming submit; nothing answers that is not listed (`ss -tlnp` on the server shows only Docker's proxy for Caddy's `80` and `443`, and SSH, listening publicly). Anything unlisted is closed before going on. On a vendor cloud there is no server to inspect: check every listed webhook the same way, that each workflow is published only where it should be, and that the editor's members and the API keys are exactly those the infra guide lists.

## Step 6 — Go live → **wait for my approval**

**A first release**: run the rollout from Step 1 with `dryRun` on. Present the result: the runs, what each would have done, the comparison with what a person or the old system did (shadow mode), the cost per run against the budget, any alert raised. Then the go-live checks:

- [ ] Evals passed for this version and are recorded — or it has no AI steps and every case passed end to end.
- [ ] Every connection authenticates in production with the registry's scopes; every expiry is tracked.
- [ ] The heartbeat for each schedule is pinging; a forced failure reached the alert channel.
- [ ] The backup ran and the restore test passed.
- [ ] The endpoint check passed.
- [ ] The runbook is current, including how to reverse each side effect and how to pause.
- [ ] The dry run or shadow mode met the agreed bar.

On my approval — which includes where each polling cursor starts for real: now, or where the dry run began (`workflow-standards` → Triggers) — a PR setting `dryRun: false` in the config file, merged, then Pipeline 3 in `config` mode, which also holds the dry-run runs still waiting; each is reprocessed for real or dropped, as I decide.

**A supervised release**: present the supervised runs so far — each proposed action, and whether it was approved as proposed, edited or rejected, with the share approved without an edit against the agreed bar, and the cost per run. On my approval: a PR setting `supervised: false`, merged, then a `config` run. If it falls short, the version goes back to `/automation-fix` or `/automation-spec`, and either stays supervised meanwhile or is rolled back, as I decide.

**Any other new version**: the smoke check's test run is the go-live check; present it.

For `medium` and `high` risk, watch the first unsupervised live runs and present them before calling it done.

## Step 7 — Record

- **`releases.md`**: the live date, the rollout's result, the pipeline's summary and the gate's results, the first live runs, anything learned; the gate's results in `evals.md`.
- **The register's row**: `Live` — or still `Paused`, for a fix to a paused automation, until it is resumed — the version, the date, the deployment, and the inbound endpoints confirmed.
- **The release PR** with these docs: create a branch off `origin/main`, push, give me the link. Never create the PR yourself.

## Build sheet *(Zapier, Make)*

Delivered, not operated (`tech-stack` → Choosing a runtime): the pipeline, the run records, the guard and supervision do not reach it, so it is `low` risk only. I build it from the sheet with every action going to test accounts or switched off, and you walk the cases with me as reported by me; then the go-live checks that apply — connections and their scopes, the platform's failure notifications to the alert channel, the runbook — and on my approval I switch it to the real accounts and turn it on. Pausing is the Zap's or scenario's own switch, recorded in the register's row — events that arrive while it is off are not held, which is accepted at `low` risk and noted in the runbook; retiring is turning it off and deleting it once no run is in progress. Each change is recorded in `releases.md` like any release.

## Rollback

Pipeline 3 in `rollback` mode with the previous version (`ci-cd` → Rollback). Present the smoke check and the configuration now on `main` — if it still has `supervised` or `dryRun` on for the version rolled back from, ask whether to clear them in a `config` PR. Record it in `releases.md` and the register's row, and send the cause to `/automation-fix`.

## Pause and retire

- **Pause**: from the console, or Pipeline 3 in `pause` mode with the reason (`workflow-standards` → Pausing). Nothing is stopped or unpublished: every run holds itself at its next check, and whatever arrives meanwhile is held. Record the reason and the date in the register's row as `Paused` (`Paused · next …` while a new version is in progress), and silence its heartbeat so it does not alert.
- **Resume**, on my approval, once the cause is fixed: at `medium` and `high` risk, first a `config` PR setting `supervised: true`, merged and applied, so the runs after the resume are supervised for an agreed period, reviewed and ended as in Step 6 — never `dryRun`, which would let real work finish as dry runs; then Pipeline 3 in `resume` mode, whose smoke check includes the test run. The heartbeat is restored, and the register's row goes back to `Live` (`Live · next …` while a new version is in progress). The holding area's items — runs that held themselves, payloads and scheduled slots that arrived during the pause — are reprocessed or dropped as I decide; nothing held runs on its own.
- **Retire**: pause it; then Pipeline 3 in `retire` mode, which holds what is in flight, stops and removes its worker service or unpublishes and deletes its workflow, and removes its route; then a PR that takes its service out of `deploy/{deployment}/compose.yml` (code) and deletes its config file. The held items are reviewed with me and dropped or kept as a record. Revoke the credentials no other automation uses (and update the registry), remove its inbound endpoints from the register, keep its docs, and mark the row `Retired` with the date.
