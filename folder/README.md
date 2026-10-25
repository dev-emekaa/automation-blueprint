# Automation Blueprint

A spec-first workflow for building AI and workflow automations with Claude Code that run unattended and can be trusted to. Seven skills (eight with the optional console) and the rules they follow take an automation from a rough idea and real examples to a tested, evaluated, deployed and monitored automation — on code, n8n or Activepieces — with every run recorded and every side effect accounted for.

Automations here are standalone: your own operations, or work delivered to a client. An automation that is a feature inside a product with users belongs in that product's backend, built with the **Backend Blueprint**.

---

## What's inside

```
automation-blueprint/
  skills/                8 skills, one folder each (automation-console is optional)
  rules/                 the rules every project uses, plus the optional console rule
    stacks/
      typescript/        coding-standards.md for TypeScript
      python/            coding-standards.md for Python
  templates/
    CLAUDE.md            the blocks to add to your project's CLAUDE.md
    automations.md       the register, to copy to docs/automations.md
    connections.md       the connections registry, to copy to docs/connections.md
```

---

## Install

From your project's root — set `BP` to wherever you unzipped this folder, and `STACK` to `typescript` or `python`:

```bash
BP=~/Downloads/automation-blueprint
STACK=typescript
mkdir -p .claude/rules docs/automations docs/infra
cp -R "$BP/skills" .claude/
cp "$BP"/rules/*.md .claude/rules/
cp "$BP/rules/stacks/$STACK/coding-standards.md" .claude/rules/
[ -f docs/automations.md ] || cp "$BP/templates/automations.md" docs/automations.md
[ -f docs/connections.md ] || cp "$BP/templates/connections.md" docs/connections.md
```

Then:

1. **Remove the console if you don't need it:** delete `.claude/skills/automation-console/` and `.claude/rules/console.md` unless non-technical people will approve steps, review results or start runs of code automations.
2. **Add the CLAUDE.md blocks.** Paste `templates/CLAUDE.md` into your project's `CLAUDE.md`, including its first line (the marker the installer looks for), and fill in the project configuration — the hosting target above all — or leave it; each skill asks for anything missing, once.
3. **Check it worked.** Start Claude Code and run `/context` — the rules appear under Memory files (`ci-cd.md` once a deploy file is touched, `console.md` once a console file is). Type `/` and the skills are listed.

> `.claude` is a hidden folder. To see it in Finder, press **Cmd + Shift + .**

**Commit `.claude/` with your project.** Cloud sessions and scheduled runs only read project skills, and the rules should travel with the code.

---

## Which skill when

**A new automation**

1. `/automation-setup` — once per repository: the shared core, the local stack, the CI, the infra guide.
2. `/automation-spec` — from a rough idea and real examples to an approved spec and its cases. With no idea yet, it runs discovery on your manual processes.
3. `/automation-build` — built for its runtime, tested, every case walked in dry-run mode.
4. `/ai-evals` — when it has AI steps: each scored against thresholds you approve.
5. `/automation-deploy` — to production, through a dry run or shadow mode, live on your approval; later versions under supervision where the risk calls for it.

**Changing one** — `/automation-spec` in revise mode, then build, evals and deploy again; the live version keeps working until the new one replaces it.

**When something goes wrong** — `/automation-fix`.

**Moving to another runtime** — `/automation-convert`.

**Giving non-technical people a place to approve and review** — `/automation-console`.

---

## The skills

**`/automation-setup`** — The foundation every automation stands on: the shared core (run records, the side-effect record with its dry-run switch, budgets reserved before each model call, the model-call wrapper, signed approval links, the holding area), an example automation and integration, the local stack with Hatchet and PostgreSQL and any n8n or Activepieces instance, the register's defaults, the CI workflows, and an infra guide for the steps only you can do.

**`/automation-spec`** — The spec: goal and measure, trigger and its contract, inputs, systems and the narrowest access each needs, steps marked deterministic or AI, decision rules, side effects marked reversible or not, human checkpoints, volume, budget, failure policy, data, risk and runtime — with ten to thirty real examples as its cases, an independent review, and your approval.

**`/automation-build`** — One automation for its runtime: every step, rule, side effect, approval and failure path in the spec and nothing else, its integrations reused or written, every run recorded, tests on recorded responses, every case walked in dry-run mode, and its runbook. On n8n and Activepieces it builds in a pinned local instance and commits the tested JSON; for Zapier or Make it writes an exact build sheet.

**`/ai-evals`** — The quality of each AI step, scored the way its job demands against thresholds you approve, prompts and models compared on quality, cost and latency, and production failures turned into cases. The release gate for every prompt, model or schema change.

**`/automation-deploy`** — The Compose bundle, the server, credentials, backups with a restore test, heartbeats and alerts; the release through the pipeline; a check that the server exposes exactly what the register lists; a dry run or shadow mode for a first release and supervision for a new version, by risk; real side effects only on your approval. Also pause and retire.

**`/automation-convert`** — A move to another runtime, rebuilt from the spec and proven on the same cases, evals and recent production inputs, switched over without a gap or a double run.

**`/automation-fix`** — Contain, reproduce from the run record, classify, failing test first, surgical fix, every automation sharing a changed integration retested, side effects already made handled as you decide, shipped through a release.

**`/automation-console`** *(optional, code automations)* — Runs in business terms, run detail, an approvals inbox, manual runs, the holding area, owner-editable settings, connection status and users, behind sign-in with roles.

---

## The rules

| Rule | What it covers |
| --- | --- |
| `documentation-conventions.md` | The register and its statuses, the connections registry, specs, cases, risk levels, where code and deployments live |
| `tech-stack.md` | Choosing a runtime, each runtime's tools, models, hosting (a VPS by default, or n8n or Activepieces Cloud) and services, and what is deliberately not used |
| `workflow-standards.md` | Triggers, idempotency, steps and retries, partial failure, waits and approvals, run records, dry run, test runs and supervision, configuration, contracts, money, naming, and the n8n and Activepieces conventions |
| `integrations.md` | Connections, integration calls and their shared wrappers, tools for AI steps, MCP servers |
| `ai-steps.md` | When to use AI, budgets, validated output, untrusted content, agents, prompts, models, data sent to models, retrieval, observability |
| `security.md` | Secrets, inbound endpoints, outbound calls, untrusted input, data, the server, supply chain, access, audit |
| `testing.md` | Cases as acceptance criteria, the test layers, recorded responses, testing on n8n and Activepieces |
| `ci-cd.md` | Versions and tags per automation, packaging, PR checks, the release gate, deploy, hotfixes, rollback. Loads only when deploy files are touched |
| `coding-standards.md` | TypeScript or Python — copy the one you use |
| `console.md` *(optional)* | The console's screens, stack, roles and rules. Loads only for `console/` |

---

**Requires** Claude Code; Docker for the local stack; and for production a VPS and a domain — or, for a platform-only client, an n8n Cloud or Activepieces Cloud plan with its API and a managed PostgreSQL — model provider accounts and an S3-compatible bucket for backups. Updating means running the same commands again — and deleting the console skill and rule again if you do not use them: skills and rules are replaced — any edits you made to them are overwritten, so keep your own changes in `CLAUDE.md` or new rule files — while `docs/automations.md` and `docs/connections.md` are only copied when they do not exist yet, because they hold your project's records.

© dev-emeka. All rights reserved. Licensed for use in your own projects; not for redistribution.
