---
name: automation-spec
description: Turn a rough idea into an approved automation spec — goal and measure, trigger and its contract, inputs, the systems it touches and the access each needs, deterministic and AI steps, decision rules, side effects, human checkpoints, volume, budget, failure policy, data, risk and runtime — with the real cases that become its acceptance tests. Use before building any automation; in revise mode to change a live one; in discovery mode when the owner does not yet know what to automate.
---

# Automation Spec

Writes `docs/automations/{slug}/spec.md` and its `cases/`, and adds the automation's row to the register. Nothing is built from anything else: `/automation-build` reads only what this approves.

## Modes

- **New** — the default: a new automation from a description.
- **Revise** — a change of behaviour to an existing one. The spec is edited in place, a new version is planned, and the change goes through build, evals and deploy again while the live version keeps running.
- **Discovery** — the owner wants automation but has not chosen what. Step 0 runs first.

## Step 0 — Discovery *(discovery mode only)* → **wait for my choice**

Ask me to walk you through the processes I or my client repeat: what triggers each, who does it, how often, how long it takes, what systems it touches, what goes wrong. For each, estimate the time it costs per month, how well it would automate (rules versus judgement, how clean the inputs are, whether the systems have APIs), and the risk if the automation gets it wrong. Present them as a table, ranked by value against risk, with the two or three to start with and why. I choose; then Step 1.

## Step 1 — Intake

Take whatever I give — a sentence, a document, a recording of the manual process, screenshots — and fill what is missing by asking. Ask in one batch, not one question at a time, and only what the spec needs:

- What it is for, and how we will know it works (time saved, response time, error rate).
- How the work is done today, step by step, by whom — the manual process is the first draft of the steps.
- What starts it, and what it receives.
- Every system it reads from or writes to, and whether each has a test account.
- What it must never do.
- **Real examples**: ten to thirty past inputs, each with what the right outcome was. Without them no AI step can be checked; if I cannot provide them yet, the spec records that and the automation cannot reach `Evaluated` until they exist.

If the answers show the automation is a feature of a product with users, say so and stop: it belongs in that product's backend.

## Step 2 — Write the spec

`docs/automations/{slug}/spec.md`, with these sections and only these. Plain language; precise where a builder needs precision.

| Section | Holds |
| --- | --- |
| **Goal and measure** | One paragraph on what it does and for whom; the measure of success and its target |
| **Trigger and its contract** | The trigger type and detail (`workflow-standards` → Triggers); for a webhook or event, the payload schema, the signature or secret, the responses, who calls it, and whether each caller retries on a `5xx` — a caller that never retries is accepted knowingly, since a payload can be refused during a restart; the overlap and catch-up policy for a schedule |
| **Inputs** | What arrives and what is fetched, with field names and an example, redacted |
| **Systems and access** | Each system, what the automation does there (read, create, update, send, delete), the narrowest access that allows it, the account it should act as, whether a test account exists, and whether the runtime has a maintained connector for it |
| **Steps** | Numbered, each one marked **deterministic** or **AI**, with its input and output; for AI steps, what the model decides and why rules cannot; an agent only with the reason a fixed sequence will not do (`ai-steps` → When to use AI) |
| **Decision rules** | Every branch and threshold, stated so code can implement it: routing, confidence thresholds, limits, what counts as a duplicate |
| **Outputs and side effects** | Every side effect, numbered — system, action, target — marked reversible or not, with how to reverse it. The number is its id in every side-effect key, on every runtime, and never changes |
| **Human checkpoints** | Where a person approves, who, through what, what they see, the timeout and what happens on it (`workflow-standards` → Waits and approvals) |
| **Volume and timing** | Runs per day, items per run, peaks, how fast each run must finish |
| **Budget** | Per-run and per-day ceilings on model spend; time and call limits for agents |
| **Failure policy** | What happens when each system fails, when an AI step fails or is unsure, when the run stops halfway (the compensating actions), and who is alerted |
| **Data** | Which fields contain personal or sensitive data, which go to which model provider and under what terms, how long run records keep them |
| **Risk** | `low`, `medium` or `high` by the table in `documentation-conventions`, with the side effect that sets it, and what that level requires here |
| **Runtime** | The recommendation from `tech-stack` → Choosing a runtime, with the reason, and the deployment it runs on. It must fit that deployment's kind (`tech-stack` → Hosting): code needs a `vps`; on a vendor cloud, the expected runs a month fit the plan's execution limits, its nodes or pieces are allowed there, and its webhooks can use the platform's URL. For n8n and Activepieces, the licence question answered — whose instance it runs on, and whether the client will use the editor there. A misfit is raised here, before anything is built |
| **Out of scope** | What it deliberately does not do |
| **Open questions** | Anything not settled — the spec is not approved while this has entries that block the build |

**The slug** is a verb-led kebab-case name (`workflow-standards` → Naming). Add the automation's row to `docs/automations.md` as `Draft` when writing starts, so the register always shows what is in progress.

## Step 3 — Write the cases

One file per case in `docs/automations/{slug}/cases/`, as `testing` → Cases describes: from my real examples, redacted, plus the cases the spec implies that the examples do not cover — every decision rule's branches, every failure in the failure policy, duplicates, edge inputs, and for AI steps, inputs that try to steer the model. Each case says which part of the spec it proves.

## Step 4 — Review

Before showing me, review the spec as an independent agent would — or have one do it, with only the spec, the cases and the rules as its context:

- Every step has its input from an earlier step or the trigger; every side effect has a step; every branch in the decision rules has a case.
- Every system has its access stated at the narrowest level; every irreversible side effect has a checkpoint or an approved automatic rule.
- The risk matches the side effects; the runtime matches the table; the budget covers the expected volume.
- Nothing in the spec is runtime-specific — it must be buildable on any runtime.

Fix what it finds; list what only I can decide.

## Step 5 — Approval → **wait for my approval**

Present: the goal, the steps in one line each, the side effects and their risk, the checkpoints, the runtime and why, the budget, the open questions, and what the review found. On approval:

1. Add or update the automation's row in `docs/automations.md` — status `Specced`, runtime, trigger, risk, budget, connections, owner.
2. Add each system to `docs/connections.md` that is not there yet, with its access and test account; the credential details arrive at build and deploy.
3. Commit, and deliver it as a PR: create a branch off `origin/main`, push, give me the link. Never create the PR yourself.

In revise mode, the row reads `Live · next Specced` (`documentation-conventions` → The register), and the live version keeps running unchanged.
