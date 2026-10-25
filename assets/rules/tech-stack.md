# Tech Stack

The runtimes automations are built on, the tools each uses, and where they run. Use the current stable release of each; the lockfile and the Compose bundle pin exact versions, not this file. Anything not listed is added only after approval: the build plan names what the automation needs and recommends the most secure, efficient and standard option.

This blueprint builds **standalone automations** — your own operations, or work delivered to a client. An automation that is a feature inside a product with users belongs in that product's backend (the Backend Blueprint's background-jobs and AI services rules), not here.

## Choosing a runtime

Chosen per automation in `/automation-spec`, recorded in the spec and the register. One runtime per automation; `/automation-convert` moves it to another.

| Choose | When |
| --- | --- |
| **Code** (TypeScript or Python on Hatchet) | AI steps carry the value; the logic branches beyond what a canvas stays readable for; volume is high; a system has no maintained node or piece; the automation needs real tests and quality gates in CI; the security bar is high; or it may grow into a product. The default when nothing below applies. |
| **Code, scheduled-script mode** | `low` risk only: one schedule, no waits, no approvals, no webhooks, low volume — a nightly sync, a weekly report. Same code standards, no engine. An automation that needs supervision or approvals runs on Hatchet; a correction is done by hand from the runbook's reversal steps and recorded on the run. |
| **n8n** | The owner wants to see the flow on a canvas and shape it there — in development, reaching production through a PR (`workflow-standards` → n8n conventions); the work is mostly connecting systems n8n has maintained nodes for; AI steps are few and simple. Licence: the Sustainable Use License allows internal use, and building, running and maintaining workflows for clients — on their own instance, or on yours as long as they never use it. Clients using the editor on an instance you host, white-labelling or embedding n8n needs n8n's commercial licence — the spec asks whether the client will use the editor, and where it will run, before choosing it. |
| **Activepieces** | As n8n, when the client will use the editor on an instance you host — its Community edition is MIT, and one project per deployment fits one deployment per client — or when the client already runs it. Its built-in approval links approve when opened, so an automation that needs approvals or supervision has them through a confirming form, or runs on n8n or code (`workflow-standards` → Waits and approvals). Embedding it, several projects on one instance, project team members, custom branding and API keys are its paid editions. Without API keys the deploy pipeline cannot reach the instance, so Community releases include a manual import step (`ci-cd` → Deploy); the spec checks what the client's use needs against Activepieces' current editions. |
| **Build sheet** (Zapier, Make) | Only when the client is on that platform and must stay. Neither platform's export format is documented, Zapier's import is limited to its Team and Enterprise plans, and connections must be recreated after any import — so the blueprint produces an exact manual build guide, not a file it cannot verify. It is **delivered, not operated**: the run records, the guard, supervision and the deploy pipeline do not reach it, so it is for `low` risk only, and going live, pausing (the Zap's or scenario's own switch) and retiring follow `/automation-deploy` → Build sheet. |

## Code runtime

| Need | TypeScript | Python |
| --- | --- | --- |
| Language | TypeScript strict, Node current LTS (22 or later) | Python current stable, managed with `uv` |
| Durable execution | Hatchet (TypeScript SDK): durable tasks and workflows, retries with backoff, cron, durable sleep and event waits, concurrency keys, rate limits, its run dashboard | Hatchet (Python SDK), the same |
| Scheduled-script mode | `supercronic` running the script in its container | The same |
| Model calls | Vercel AI SDK (`ai` and the provider packages): structured output, tool calls, MCP through `@ai-sdk/mcp` | Pydantic AI: structured output, tools, MCP |
| Schemas and validation | Zod | Pydantic |
| HTTP | Native `fetch` through the integration wrappers | `httpx` through the integration wrappers |
| Inbound HTTP *(webhook triggers, approval links)* | Hono on Node, inside the automation's worker | Starlette on Uvicorn, inside the automation's worker |
| State | PostgreSQL through Drizzle, migrations with `drizzle-kit` | PostgreSQL through SQLAlchemy 2, migrations with Alembic |
| Vectors *(when retrieval is needed)* | `pgvector` in the same PostgreSQL | The same |
| Embeddings | Through the model layer, from the step's provider | The same |
| Media *(when needed)* | fal.ai — transcription, speech, image generation | The same |
| Logging | `pino`, structured JSON, redacted | `structlog`, structured JSON, redacted |
| Tests | Vitest, with recorded responses | `pytest`, with recorded responses |
| Lint · format · types | ESLint, Prettier, `tsc` | Ruff (lint and format), `mypy --strict` |

**One model layer per language, never a provider's SDK directly.** Both layers speak to every major provider, so changing a step's model is a one-line change to the build, not a rewrite. The orchestration is Hatchet's; no second agent framework is added by default.

**Hatchet** needs only PostgreSQL. It is MIT-licensed, self-hosts in the Compose bundle, and its dashboard is the operators' view of runs, retries and failures — no custom dashboard is built for that. Check its current self-hosting docs at setup for the image and settings; they move between releases.

## n8n runtime

- **n8n, current stable**, on PostgreSQL — never SQLite in production. One main instance by default; **queue mode** (Redis and one or more workers) when concurrent runs or volume need it, decided in the build plan.
- **AI steps** use n8n's AI nodes (agent, chains, structured output parser) with the model set per node; tools for an agent come from its tool nodes, including the MCP Client Tool node for a vetted MCP server.
- **Code nodes** run in n8n's task runners; heavy logic in a Code node is a sign the automation belongs in code.
- **Community nodes** only when no core node covers the need, reviewed as `security` → Supply chain says.

## Activepieces runtime

- **Activepieces, current stable**, on PostgreSQL and Redis.
- **AI steps** use its AI pieces with the model set per step; tools as its pieces provide them.
- **Community pieces** under the same review as n8n's community nodes.

## Models

- **Providers** through the model layer (or the platform's AI nodes): Anthropic, OpenAI and Google by default, others where a step needs them.
- **The model is chosen per step** — the cheapest that meets the step's accuracy and latency on its cases, from a provider whose data terms fit what the step sends (`ai-steps` → Data sent to models). The identifier is part of the build — `models.json` in code, the AI node on a platform — never inline in a step, and never in a deployment's configuration, so every change goes through `/ai-evals`.
- **Provider accounts are the owner's**, with spending limits set at the provider as a backstop to the budgets in `ai-steps`.

## Hosting

Each deployment — one per owner or client — has one **kind**, chosen in `/automation-setup` and recorded in `CLAUDE.md`:

| Kind | Runs | Choose when |
| --- | --- | --- |
| **`vps`** *(default)* | Everything on one server with Docker Compose: the code workers and Hatchet, n8n or Activepieces, PostgreSQL, Caddy | Any code automation; real volume; sensitive data; one server per client for an agency |
| **`n8n-cloud`** | n8n hosted by n8n | Only n8n automations, low volume, nobody to own a server — or the client already pays for it |
| **`activepieces-cloud`** | Activepieces hosted by Activepieces | The same, for Activepieces |

- **Code always needs a server.** Hatchet Cloud can run the engine, but the workers still need hosting, so a deployment with any code automation is `vps`, and its n8n or Activepieces runs there too: cheaper at volume, no execution limits, one bundle.
- **A vendor cloud is checked before it is chosen**: the plan's execution limits against the expected volume (a schedule every five minutes is about 8,600 runs a month), whether the plan includes the platform's API (n8n Cloud's is locked during the free trial), a custom domain, its execution retention, the platform version it runs, and the nodes or pieces it allows. A plan without the API is deployed by the manual import path (`ci-cd` → Deploy).
- **The run-record database on a vendor cloud** is a managed PostgreSQL (Neon, Supabase, or the provider's managed service), reached over TLS — the platform's own database is not available to it.
- **Mixing kinds for one client** — code on a VPS, n8n on n8n Cloud — is avoided: the VPS's database is never exposed to the internet, so the run records would have to move to a managed database both can reach. Run n8n on the VPS instead, unless the owner insists, and then the run records live in the managed database.
- **Zapier and Make** are their own cloud only, through a build sheet (Choosing a runtime).

## Services

| Need | Choice |
| --- | --- |
| Hosting | By deployment kind (Hosting, above): a VPS with Docker Engine and Compose v2 by default; n8n Cloud or Activepieces Cloud where the rules there choose it |
| HTTPS and routing | Caddy in the Compose bundle, with automatic certificates; nothing else is exposed. Built with the `caddy-ratelimit` module, which standard Caddy lacks (`security` → Supply chain) |
| Database | PostgreSQL in the Compose bundle, never exposed outside the server's private network (`vps`); a managed PostgreSQL over TLS for a vendor-cloud deployment's run records |
| Backups | `vps`: `restic`, encrypted, to S3-compatible object storage off the server — nightly database dumps, the platform's encryption key, and the `.env` file's secrets kept in the owner's password manager. Vendor cloud: the vendor's backups for the platform, the managed database's own, and the workflow JSON in git. Either way, a restore test |
| Missed-run checks | A heartbeat service off the server (Healthchecks.io, or a self-hosted Healthchecks elsewhere): each scheduled run pings it; a missing ping alerts |
| Alerts | The channel the register's defaults name — Slack, email or Telegram — fed by the runtime's failure alerts, the heartbeat service and the budget checks |
| Error tracking *(code runtime, optional)* | Sentry, scrubbed as `security` says |
| LLM tracing | The run record (`workflow-standards` → Run records) by default; Langfuse when an automation needs deeper tracing and the owner accepts its extra services |
| CI/CD | GitHub Actions |
| Dependency updates | Dependabot for packages, GitHub Actions and the Compose bundle's images |

## Deliberately not used

- **Generated Zapier or Make files** — unverifiable, as above.
- **Inngest or Temporal** for the code runtime — Hatchet already covers durable execution on the PostgreSQL the deployment has, and one engine is simpler to run, back up and debug than two; Temporal's server and worker fleet is more than a VPS automation needs.
- **LangChain, CrewAI or other agent frameworks** in code by default — the orchestration is Hatchet's and the model layer covers tool use; a framework is added only when a build plan shows the need.
- **A separate vector database** by default — `pgvector` in the existing PostgreSQL until volume proves otherwise.
- **`latest` image tags**, or any version the Compose bundle does not pin.
