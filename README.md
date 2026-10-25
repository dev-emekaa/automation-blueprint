# automation-blueprint

**Spec-to-production AI and workflow automation for Claude Code — every automation starts from a spec with real test cases, runs on code, n8n or Activepieces, and ships with its quality checks, alerts and run records.**

Seven Claude Code skills (eight with the optional console) and the rules they depend on, for building automations that run unattended and can be trusted to: specify one from a rough idea with real examples, build it for the runtime that fits, measure its AI steps, deploy it to a server with backups, heartbeats and alerts, and fix it when something changes. It sits beside the [Backend Blueprint](https://github.com/dev-emekaa/backend-blueprint), which builds products with users — an automation inside such a product belongs there; standalone automations, for your own operations or a client's, belong here. The [Ideas Blueprint](https://github.com/dev-emekaa/ideas-blueprint) helps when the automation is itself what you sell.

```bash
npx github:dev-emekaa/automation-blueprint init
```

---

## Install

Run it in your project root. Nothing to install first — `npx` fetches this repo and runs it.

```bash
npx github:dev-emekaa/automation-blueprint init [options]
```

| Option | Effect |
| --- | --- |
| `--stack <s>` | `typescript` (default) or `python` — the language code automations are written in. n8n and Activepieces automations need neither, but the shared tooling is written in it |
| `--console` | Also install the ops console skill and rule, for when non-technical people approve steps, review results or start runs of code automations |
| `--no-console` | Stop installing the console on later runs (remove its skill and rule yourself) |
| `--personal` | Install skills to `~/.claude/skills` instead of the project |
| `--force` | Overwrite existing files. Default is to skip them |
| `--dry-run` | Print what would change, write nothing |

Re-running is safe: existing files are skipped and listed, never clobbered. The stack and console choice are saved in `.claude/automation-blueprint.json`, so later runs reuse them.

### What it writes

```
.claude/
  skills/                          7 skills (8 with --console)
  rules/
    documentation-conventions.md   where everything is written down: the register, the connections registry, specs, cases, risk
    tech-stack.md                  choosing a runtime, each runtime's tools, hosting, services, what is deliberately not used
    workflow-standards.md          triggers, idempotency, retries, partial failure, waits and approvals, run records, dry run and supervision, n8n and Activepieces conventions
    integrations.md                connections, integration calls and their wrappers, tools for AI steps, MCP
    ai-steps.md                    when to use AI, budgets, validated output, untrusted content, agents, prompts, models, retrieval
    security.md                    secrets, inbound endpoints, outbound calls, data, the server, supply chain, access, audit
    testing.md                     cases as acceptance criteria, the test layers, recorded responses, testing on n8n and Activepieces
    ci-cd.md                       versions and tags per automation, packaging, PR checks, the release gate, deploy, hotfixes, rollback — loads only when deploy files are touched
    coding-standards.md            TypeScript or Python, from --stack
    console.md                     --console only — loads only for console/
  automation-blueprint.json        the options this install used, reused by later runs
CLAUDE.md                          documentation map · project configuration
docs/
  automations.md                   the register: every automation, its status, every inbound endpoint, the defaults
  connections.md                   every external system, how it is reached, with what access
  automations/  infra/
```

### After installing

1. Fill in the **project configuration** block in `CLAUDE.md` — the hosting target above all. Anything you leave blank, the skill that needs it asks for once.
2. Run `/automation-setup`. It builds the foundation once.
3. Run `/automation-spec` with a rough description of the first automation — or with no idea yet, and it runs discovery.
4. Then `/automation-build`, `/ai-evals` where it has AI steps, and `/automation-deploy`.

### Skills are project-scoped by default

They install to `.claude/skills/` and are meant to be committed: cloud sessions, scheduled runs and Cowork read only project skills, and rules that travel without the skills that execute them are conventions with no tooling. `--personal` exists for throwaway work.

### Updating

```bash
npx github:dev-emekaa/automation-blueprint init --force
```

It reuses the `--stack` and `--console` choice saved at install. `--force` overwrites skills and rules, including any local edits to them — run it on a clean working tree and read the diff before committing; that diff is the upgrade. `docs/automations.md`, `docs/connections.md` and `CLAUDE.md` are never rewritten, even with `--force`: they hold your project's records and values, so changes to their templates are yours to copy across. Pin a tag for a fixed version: `npx github:dev-emekaa/automation-blueprint#v1.0.0 init`. If an update doesn't seem to have landed, `npm cache clean --force`.

---

## The pipeline

```
/automation-setup    → the foundation, once
/automation-spec     → per automation: goal, trigger, systems, steps, rules, side effects,
                       checkpoints, budget, failure policy, data, risk, runtime — and the real cases   [Specced]
/automation-build    → built for its runtime; tests on recorded responses; every case walked in dry run [Built]
/ai-evals            → each AI step scored on the cases against thresholds you approve                 [Evaluated]
/automation-deploy   → the Compose bundle, the server, credentials, backups, heartbeats, alerts;
                       dry run, shadow mode or supervision by risk; real side effects on your approval  [Live]

/automation-fix      — whenever something goes wrong
/automation-convert  — to move an automation to another runtime
/automation-console  — optional, for non-technical operators
```

---

## Runtimes

One per automation, chosen in the spec; `/automation-convert` moves it later by rebuilding from the spec and proving the result on the same cases.

| Runtime | When |
| --- | --- |
| **Code** — TypeScript or Python on Hatchet | AI steps carry the value, the logic branches, volume is high, a system has no connector, or it needs real tests and quality gates. Hatchet's dashboard is the operators' view of runs. A scheduled-script mode covers the simplest jobs |
| **n8n** | The owner wants to see and adjust the flow on a canvas, and the systems have maintained nodes. Its licence allows internal use and running workflows for clients, on their instance or on yours as long as they never use it; clients using the editor on an instance you host needs n8n's commercial licence |
| **Activepieces** | As n8n, when the client will use the editor on an instance you host — its Community edition is MIT; embedding, several projects per instance, team members and API keys are paid editions, so on Community each release includes a manual import step |
| **Build sheet** — Zapier, Make | Only when the client must stay on that platform: an exact manual build guide, because neither platform's export format can be generated and verified |

**Where it runs.** Each deployment is one of three kinds: a **VPS** (the default — required for code automations, and the cheapest at volume), **n8n Cloud** or **Activepieces Cloud** (for platform-only clients with low volume and nobody to run a server). Setup recommends one per deployment, the spec checks each automation fits it (execution limits, allowed nodes, licence), and deploy follows the matching path — over SSH to the server, or through the platform's API with a managed PostgreSQL for the run records.

Every VPS deployment is a **Docker Compose bundle** — Caddy with automatic HTTPS and rate limits, PostgreSQL, the runtime, pinned image versions, health checks, encrypted off-server backups — with each deployment's configuration committed beside it. A new version of a live automation replaces it after its checks — at higher risk under supervision, with a person approving each outward action for an agreed period — and two builds never act on the same trigger.

---

## The skills

### `/automation-setup`
**The foundation, once.** The workspace for the chosen language and the shared core every code automation uses — run records, the side-effect record with its dry-run switch, budgets reserved before each model call, the model-call wrapper, signed approval links, the holding area — an example automation and integration wrapper, the local stack (Hatchet and PostgreSQL, and n8n or Activepieces at a pinned version when used), the register's defaults, the CI workflows, and an infra guide for the steps only you can do.
**Writes** the foundation, `docs/infra/infra-setup.md`, the register's defaults

### `/automation-spec`
**From a rough idea to an approved spec.** Takes whatever you have — a sentence, a document, a recording of the manual process — asks what is missing in one batch, and writes the spec: goal and measure, the trigger and its contract, inputs, every system with the narrowest access it needs, steps marked deterministic or AI, decision rules, side effects marked reversible or not, human checkpoints, volume, budget, failure policy, data, risk and runtime. Collects ten to thirty real examples as the cases, adds the cases they miss, has the spec reviewed independently, and waits for your approval. Discovery mode ranks your manual processes when you do not know what to automate; revise mode changes a live automation.
**Writes** `spec.md`, `cases/`, the register's row, the connections it needs

### `/automation-build`
**Builds one automation for its runtime.** Plans first; reuses or writes the integration for each system; builds every step, decision rule, side effect, approval and failure path in the spec and nothing else; records every run; tests on recorded responses; walks every case in dry-run mode in the chat; writes the runbook. On n8n and Activepieces it builds in the pinned local instance and commits the tested, normalised JSON; for Zapier or Make it writes the build sheet.
**Writes** the automation, its tests, its runbook, its endpoints in the register

### `/ai-evals`
**Measures the AI steps.** Scores each the way its job demands — exact match for classification, field by field for extraction, rule checks then a calibrated judge for drafting, end state and tool calls for agents, and a perfect score required on the adversarial cases — against thresholds you approve; compares prompts and models on quality, cost and latency; turns production failures into cases. It is the release gate for every prompt, model or schema change.
**Writes** `evals.md`, the evals, prompt and model changes, new cases

### `/automation-deploy`
**To production, safely.** Generates the deployment's Compose bundle, guides you through the server, DNS, credentials and OAuth consent, sets up backups with a restore test, heartbeats for every schedule and alerts for failures and budgets; releases through the pipeline; checks that the server exposes exactly what the register lists; runs a first release in dry run or shadow mode, and a new version under supervision, by risk; checks every go-live condition; and switches on real side effects only with your approval. Also staging, infrastructure releases, rollbacks, pausing and retiring.
**Writes** `deploy/{deployment}/`, `releases.md`, the register's status, the infra guide

### `/automation-convert`
**To another runtime.** Rebuilds from the spec, never by translating one platform's JSON into another's; proves every case and eval passes and compares it on recent production inputs; switches over by pausing the automation, swapping the builds and resuming — supervised where the risk calls for it — so nothing is lost and the two builds never both act.

### `/automation-fix`
**When something goes wrong.** Contains it first if it is still causing harm; reproduces from the run record; classifies — a logic bug, a changed API, an expired connection, slipped AI quality, a cost or loop spike, a missed or duplicate run, bad input, a spec error, a change request; writes the failing test or case first; fixes surgically, retesting every automation that shares a changed integration; lists the side effects already made and handles them as you decide; ships through a release.

### `/automation-console` *(with `--console`)*
**For non-technical operators of code automations.** A small web app over the run records: runs in business terms, run detail with the side-effect record, an approvals inbox, manual runs, the holding area, owner-editable settings, connection status and users — behind sign-in, with viewer, approver, operator and admin roles.

---

## Working with the other blueprints

- **Backend Blueprint** — when an automation calls a product's API built with it, that API is a connection like any other: its api-docs are the reference, its access a credential the backend issues for it, as its own principal in that backend's api-rbac, and anything wrong with it goes to the backend developer through `/automation-fix`'s report. An automation that is a feature *of* that product belongs in its backend instead.
- **Web App Blueprint** — the optional console shares its interface stack (Next.js, Tailwind, shadcn/ui) at a fraction of its scope, but with no separate backend behind it, signs people in itself (Better Auth) and uses server actions; a product-grade interface over automations is a web app built with that blueprint.
- **Ideas Blueprint** — for the business around an automation you sell; every automation still starts from its own spec.

---

## The folder version

The downloadable, manual alternative to the installer. Build it from this repo:

```bash
npm run package
```

It writes `dist/automation-blueprint/` and `dist/automation-blueprint-v{version}.zip`, from the same assets the installer uses. Its guide lives in `folder/README.md`.

### Releasing

```bash
npm version minor        # bumps package.json, commits, and tags v1.1.0 (patch · minor · major)
git push --follow-tags   # pushes the commit and the tag
```

The zip appears under the release's **Assets** as `automation-blueprint-v1.1.0.zip` — that is the file to share. A tag that doesn't match the `package.json` version fails the build.

---

**Requires** Node 22 or later and Claude Code; Docker for the local stack; and for production a VPS and a domain — or, for a platform-only client, an n8n Cloud or Activepieces Cloud plan with its API and a managed PostgreSQL — model provider accounts and an S3-compatible bucket for backups (the setup skill's infra guide walks through them). **License** proprietary — all rights reserved.
