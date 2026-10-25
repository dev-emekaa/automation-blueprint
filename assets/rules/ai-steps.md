# AI Steps

How an automation uses AI models, on any runtime. The model layer is in `tech-stack`; tools and MCP are in `integrations`; quality checks are run by `/ai-evals`. Everything in `workflow-standards` and `security` still applies; this adds what model calls need on top.

## When to use AI

- **The least AI that does the job.** Rules decide what rules can decide. A model is for what they cannot: understanding free text, classifying, extracting fields from documents, judging, drafting. A step that is half rules and half judgement is split into two.
- **A fixed workflow before an agent.** When the steps are known, the automation runs them in order and the model fills in a step. An **agent** — a model that chooses which tools to call and when — is used only when the path genuinely cannot be fixed in advance, and the spec says why.
- **One job per AI step.** A prompt that classifies, extracts and drafts at once is three steps, each checked on its own.

## Model calls are external I/O

- **Every call has a timeout and an output-token ceiling.** A call with no ceiling is an unbounded bill and an unbounded wait.
- **Retry transient failures** — timeouts, rate limits, `5xx` — with backoff and a cap. Malformed output gets at most one repair attempt with the validation error included. A refusal is not retried; it goes down the step's fallback.
- **Cost is recorded per call**, attributed to the automation, the step and the run.

## Budgets

- **Every run has a ceiling** on spend, wall-clock time, model calls and tool calls; every automation has a per-day spend ceiling. The defaults are in the register; the spec sets the automation's own.
- **In code, spend is reserved before the call**: the worst case from the output-token ceiling is reserved atomically against the run's and the day's budget, and settled after. Checking first and spending after lets concurrent runs overshoot.
- **On n8n and Activepieces**, which cannot reserve before a call, every AI node has its token ceiling set, the provider account has a spending limit, and a daily budget check alerts when spend approaches the ceiling. The spec states this is the weaker guarantee.
- **A run that hits a ceiling stops**, records why, and alerts. It never continues on a cheaper model unless the spec defines that fallback.

## Output is validated

- **Structured output against a schema** (Zod, Pydantic, n8n's structured output parser) for every step whose output another step uses. Prefer the provider's structured-output or tool-call mode to parsing prose.
- **A validation failure is a normal path**, not a crash: one repair attempt, then the step's fallback — a default, a holding-area item, or a person.
- **Confidence becomes a rule.** Where a step classifies or decides, it returns a confidence or a reason the spec's decision rules can threshold on, and low confidence routes to a person.

## Untrusted content

Anything the model reads that the owner did not write — an email, a web page, a document, a form field, a tool's result — may carry instructions aimed at the model.

- **Model output is treated like input from an anonymous caller.** Never passed unvalidated into SQL, a shell, a file path, a URL, HTML, a template or a deserialiser; never executed as code.
- **Untrusted content goes in a clearly delimited section** of the prompt, never mixed into the instructions, and the instructions say it is data.
- **What the model may cause is bounded by the step, not by the prompt.** The tools it has, the side effects they can make and the approvals they need come from the spec and the risk table; no text it reads can widen them.
- **Outward-facing output** — an email to a customer, a public post — is checked against the spec's rules (recipient, links, length, forbidden content) by code before it is sent, and is approved where the risk table says.

## Agents

- **Every agent run is bounded** by maximum steps, wall-clock time, tool calls and spend.
- **Every tool call is idempotent or carries an idempotency key** — agents retry and loops re-enter.
- **Actions that write, spend, message someone or cannot be undone need confirmation from outside the model** — the model proposes; a person or a coded rule authorises.
- **One run's context never reaches another's**, and one client's data never reaches another client's run.

## Prompts

- **Prompts are versioned files** in the automation's `prompts/` folder (on n8n and Activepieces, the prompt in the node is the version, and the workflow JSON in the repository is its history). Changing one is a reviewed change with a diff.
- **Each prompt states** the task, the output's schema or format, the rules the output must follow, and how to signal "cannot do this" — so a refusal is a value, not a surprise.
- **A prompt change is a behaviour change** even when no code moves: it goes through `/ai-evals` before release.
- **Examples in a prompt are synthetic or redacted**, never a real customer's data.

## Models

- **Chosen per step**: the cheapest model that meets the step's thresholds on its cases, at an acceptable latency, from a provider whose data terms fit. The choice and its eval results go in `evals.md`.
- **A model change is a behaviour change**, released only through `/ai-evals` — including a provider's silent update behind an unchanged alias, which is why the identifier is a pinned version where the provider offers one.
- **Prompt caching** is used where the provider offers it and the prompt has a long stable prefix.

## Data sent to models

- **Only what the step needs.** Never secrets; personal data only where the provider's terms and the owner's privacy commitments allow it, and the spec's Data section says which fields go.
- **Provider settings match the data:** no training on submitted data, the shortest retention available, and a zero-retention arrangement where the data requires it.

## Retrieval

When a step answers from a body of knowledge (help articles, policies, past tickets):

- **Indexing is its own step**, idempotent and keyed on the source record and its version.
- **The index follows its source**: an updated record is re-indexed, a deleted one is removed. A deleted document that can still be retrieved is a leak.
- **Every vector records the embedding model and chunking** that produced it. Changing either means re-indexing everything, with retrieval switched to the new index only once it is complete.
- **One deployment per client by default.** Where one deployment serves several, every vector carries its client and every search filters on it inside the query.

## Observability

Each model call is logged against the run (`workflow-standards` → Run records) with: the step, the prompt version, the model, input and output tokens, cost, latency, the attempt, and the input and output with secrets and personal data redacted. Each tool call is logged with its arguments, its result summary and whether it caused a side effect.

## Quality

Every AI step has an evaluation before it is released and after every prompt, model or schema change: scored on the automation's cases against thresholds, by `/ai-evals`. `testing` says how evals differ from tests and where each runs.
