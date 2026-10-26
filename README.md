# automation-blueprint

**Build AI and workflow automations with Claude Code that you can trust to run on their own.**

Every automation starts from a written spec and real examples. It is built in code (TypeScript or Python), n8n or Activepieces, tested, and its AI checked before it goes live — then it runs with alerts, backups and a record of everything it does. Eight Claude Code skills (one of them optional) and the rules behind them take you from an idea to a running automation, and help you fix it when something changes.

**Not for** automations that are a feature of an app with users — those belong in that app's backend (see the [Backend Blueprint](https://github.com/dev-emekaa/backend-blueprint)).

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
| `--stack <s>` | `typescript` (default) or `python` — the language for code automations and the shared tooling. Pick one even if you only use n8n or Activepieces |
| `--console` | Also install the optional ops console, for non-technical people who approve steps, review results or start runs |
| `--no-console` | Stop installing the console on later runs (remove its skill and rule yourself) |
| `--personal` | Install skills to `~/.claude/skills` instead of the project |
| `--force` | Overwrite skills and rules. Default is to skip existing files |
| `--dry-run` | Show what would change, write nothing |

Re-running is safe: existing files are skipped and listed. Your `--stack` and `--console` choices are saved in `.claude/automation-blueprint.json` and reused next time.

### What it writes

```
.claude/
  skills/                          7 skills (8 with --console)
  rules/                           8 rules, plus coding-standards.md for your stack (and console.md with --console)
  automation-blueprint.json        the options this install used
CLAUDE.md                          documentation map · project configuration
docs/
  automations.md                   the register: every automation, its status, its endpoints, the defaults
  connections.md                   every outside system, how it's reached, with what access
  automations/  infra/
```

### After installing

1. Fill in the **project configuration** in `CLAUDE.md` — above all, where it will be hosted. Anything you leave blank, the skill that needs it asks for once.
2. Run `/automation-setup` once, to build the foundation.
3. Run `/automation-spec` with a rough description of your first automation — or with no idea yet, and it helps you find one.
4. Then `/automation-build`, `/ai-evals` if it uses AI, and `/automation-deploy`.

Commit `.claude/` with your project: cloud sessions and scheduled runs only read project skills. `--personal` is for throwaway work.

### Updating

```bash
npx github:dev-emekaa/automation-blueprint init --force
```

- It reuses your saved `--stack` and `--console` choices.
- Skills and rules are overwritten, including any edits you made — run it on a clean working tree and read the diff before committing.
- `docs/automations.md`, `docs/connections.md` and `CLAUDE.md` are never overwritten: they hold your project's records.
- To pin a version: `npx github:dev-emekaa/automation-blueprint#v1.0.1 init`. If an update doesn't seem to land: `npm cache clean --force`.

---

## How an automation goes live

```
/automation-setup    the foundation, once
/automation-spec     the spec and its real test cases, approved by you          → Specced
/automation-build    built, tested, every case walked through without side effects → Built
/ai-evals            each AI step scored against thresholds you approve        → Evaluated
/automation-deploy   to production, checked, switched on with your approval    → Live

/automation-fix      whenever something goes wrong
/automation-convert  to move an automation to another runtime
/automation-console  optional, for non-technical operators
```

Nothing makes real changes in other systems until you approve it. A first release runs in dry run — doing everything except the actions — and a new version of a higher-risk automation runs **supervised**, with a person approving each outside action for an agreed period.

---

## Where automations run

**Runtime** — chosen per automation in the spec:

| Runtime | Best when |
| --- | --- |
| **Code** (TypeScript or Python, on Hatchet) | AI does the important work, the logic is complex, volume is high, or a system has no ready-made connector. The default |
| **n8n** | The owner wants to see and adjust the flow on a visual canvas |
| **Activepieces** | As n8n, when its open-source licence fits better or the client already uses it |
| **Zapier or Make** | Only when the client must stay on that platform: you get an exact build guide to follow by hand, for low-risk automations |

The spec checks each platform's licence terms for your case; `tech-stack.md` has the details.

**Hosting** — chosen per deployment in setup:

- **A VPS** (the default): everything on one server with Docker Compose — HTTPS, the database, encrypted off-server backups. Required for code automations, and the cheapest at volume.
- **n8n Cloud or Activepieces Cloud**: for clients with only platform automations, low volume and nobody to run a server. Run records go in a managed PostgreSQL database.

---

## The skills

### `/automation-setup`
Builds the foundation once: the shared code every automation uses (run records, side-effect tracking, AI budgets, approvals, pausing), a working example, the local development stack, the CI workflows, and a guide to the steps only you can do.
**Writes** the foundation, `docs/infra/infra-setup.md`, the register's defaults

### `/automation-spec`
Turns a rough idea into an approved spec: what triggers it, every step, every system it touches and the least access it needs, every action it takes in other systems, where a person approves, the budget, what happens when things fail, and its risk. Collects 10–30 real examples as test cases. Can also help you find what to automate, or change a live automation.
**Writes** the spec, its cases, the register's row, the connections it needs

### `/automation-build`
Builds the automation exactly as specced, for its runtime, with tests on recorded responses, and walks every case with you in dry run before handing over.
**Writes** the automation, its tests, its runbook, its endpoints in the register

### `/ai-evals`
Measures each AI step on the real cases against thresholds you approve, compares prompts and models on quality and cost, and turns production mistakes into new cases. Every prompt or model change must pass it before release.
**Writes** `evals.md`, the evals, prompt and model changes, new cases

### `/automation-deploy`
Takes an automation to production: the server or cloud account, credentials, backups, missed-run checks and alerts; the release; the dry run or supervision its risk calls for; and the go-live checklist. Also staging, rollbacks, pausing, resuming and retiring.
**Writes** `deploy/{deployment}/`, `releases.md`, the register's status, the infra guide

### `/automation-fix`
When something goes wrong: pauses it if it's still causing harm, reproduces the problem from the run record, writes a failing test first, fixes it, and deals with any actions already sent — as you decide.
**Writes** the fix, its tests and cases, the docs it changes

### `/automation-convert`
Moves an automation to another runtime by rebuilding it from the spec, proving it on the same cases, then pausing, swapping and resuming — so nothing is lost or done twice.
**Writes** the new build, the runbook, the register's row

### `/automation-console` *(with `--console`)*
A small web app for non-technical operators of code automations: runs in plain terms, an approvals inbox, manual runs, held items, settings and users, behind sign-in with roles.
**Writes** `console/`

---

## The folder version

A downloadable alternative to the installer, built from the same files:

```bash
npm run package
```

It writes `dist/automation-blueprint/` and `dist/automation-blueprint-v{version}.zip`. Its guide is `folder/README.md`.

### Releasing

```bash
npm version patch        # bumps package.json, commits and tags (patch · minor · major)
git push --follow-tags   # pushes the commit and the tag
```

The zip appears under the release's **Assets** as `automation-blueprint-v{version}.zip` — that is the file to share. A tag that doesn't match `package.json` fails the build.

---

## Requires

- Node 22 or later, and Claude Code
- Docker, for the local development stack
- For production: a VPS and a domain — or, for platform-only clients, an n8n Cloud or Activepieces Cloud plan with API access and a managed PostgreSQL database
- Accounts with your AI model providers, and S3-compatible storage for backups

`/automation-setup`'s infra guide walks you through each one.

**License** proprietary — all rights reserved.
