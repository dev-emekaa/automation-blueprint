---
name: ai-evals
description: Measure and improve the quality of an automation's AI steps — build the evaluation for each step from the automation's cases, score it the way that step's job demands, set the thresholds that gate its release, run it against live models, compare prompts and models on quality, cost and latency, and record the results. Use after building an automation with AI steps, before every release that changes a prompt, model, schema or AI step, when an AI step's output in production goes wrong, or to pick a cheaper model.
---

# AI Evals

Tests prove the automation handles outputs correctly; evals measure whether the outputs are good. They call live models, cost money and vary run to run, so they run deliberately — here, and in the release gate — never on every PR (`testing`).

## Read first

The spec's AI steps and decision rules, the cases, `evals.md` if it exists, the prompts, `ai-steps`, and the automation's row in the register. Start from an up-to-date `origin/main` that holds the merged build PR; if it is not merged, stop and ask.

## Step 1 — Define each step's evaluation → **wait for my approval** *(first run, or a new AI step)*

For each AI step, from what the spec says it decides:

| Kind of step | Scored by | Threshold example |
| --- | --- | --- |
| **Classification or routing** | Exact match on the label; a confusion table; the cost of each kind of error (a missed urgent ticket is worse than a false alarm) | Accuracy ≥ 95%, zero urgent cases missed |
| **Extraction** | Field by field against the expected values, with normalisation (dates, amounts, whitespace) | Every required field correct in ≥ 98% of cases |
| **Decision with a confidence** | Accuracy above the confidence threshold, and how many cases fall below it to a person | ≥ 99% correct above the threshold, ≤ 15% routed to a person |
| **Drafting** (emails, summaries, replies) | Rule checks in code first (recipient, links, length, forbidden content, required facts present); then a rubric scored by a judging model; the judge calibrated against my own scores on a sample | All rule checks pass; rubric average ≥ 4 of 5; judge agrees with me on ≥ 90% of the sample |
| **Agent** | The end state (did it do the right thing), the side effects it proposed, the tool calls it made, the steps and cost it took | Right end state in ≥ 95%; no forbidden tool call ever |
| **Any step facing untrusted content** | The adversarial cases: the output ignored the planted instructions | 100% |

Present the scoring and thresholds per step, with the reasoning; the thresholds are mine to approve. Write them to `docs/automations/{slug}/evals.md`.

## Step 2 — Build the evaluation

- **The eval reads the cases** from `docs/automations/{slug}/cases/` — never a copy — so a case added anywhere is evaluated everywhere.
- **Code:** one eval per AI step in `evals/`, calling the step through the model wrapper with the real model, scoring each case, writing results.
- **n8n and Activepieces:** the eval runs the workflow in the pinned local instance once per case with live models and test accounts, in dry-run mode, and scores the outputs it records.
- **A judging model**, where used, has its own versioned prompt with the rubric, is a different model from the one being judged where practical, and is calibrated before its scores are trusted: I score a sample, the judge scores the same, and the agreement is recorded.
- **Each run records**, per case: the output, the score, the cost, the latency, and the prompt and model versions.

## Step 3 — Run and record

Run every AI step's eval. Write to `evals.md`: the date, the prompt and model versions, the score per step against its threshold, the failures by case with what went wrong, the cost and latency per case and in total. **Present the result in the chat**: pass or fail per step, and the failures that matter.

If every step passes and every case passes end to end, the register's row moves to `Evaluated` — or `Live · next Evaluated` (`Paused · next Evaluated` if paused) for a new version of a deployed automation.

**Results from the release gate** (`ci-cd` → Release gate) are in its run's summary and artifact; when a release brings them, copy them here the same way.

## Step 4 — Improve *(when a step fails, or when asked)* → **wait for my approval before changing**

- **Read the failures before changing anything.** Group them: the prompt is unclear, the schema is too loose, the input is missing information, the model is too weak, or the case's expected outcome is wrong (that last one is a question for me, never a quiet edit to the case).
- **Change one thing at a time** — the prompt, the schema, the model, the inputs the step receives — and re-run, so the effect of each change is known.
- **Compare models** when asked or when cost matters: the same eval on each candidate, presented as a table of score, cost per run and latency, with the cheapest that passes recommended.
- **Never tune on the cases alone until they pass.** When a fix is shaped around specific cases, add new cases of the same kind it has not seen, and check it holds on those too.
- **Production failures become cases**: an output that went wrong in a run is redacted, added as a case with the right outcome, and evaluated from then on.

## Step 5 — Report and deliver

The steps evaluated, the scores against thresholds, what changed and why, the model chosen per step with its cost, the cases added, and whether the automation is now `Evaluated`. Commit `evals.md`, the evals, the prompt or model changes and any new cases, and deliver it as a PR: create a branch off `origin/main`, push, give me the link. Never create the PR yourself.
