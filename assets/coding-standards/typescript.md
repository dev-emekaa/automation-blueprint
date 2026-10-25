# Coding Standards — TypeScript

How code automations are written in TypeScript. The tools are in `tech-stack`; the design rules every automation follows are in `workflow-standards`, `integrations` and `ai-steps`; this file is how they are expressed in code.

## Project structure

A pnpm workspace. Every automation is its own package and its own worker image; shared code lives in two places only.

```
pnpm-workspace.yaml            workspace packages (`packages/*`, `integrations/*`, `automations/*`, `automations/*/next`),
                               and the supply-chain settings `security` requires
packages/core/                 shared by every automation — nothing automation-specific
  src/
    config.ts                  loadConfig(schema): reads the deployment's config file, the owner-editable settings
                               and the secrets from env, validates with Zod, fails at start-up
    logger.ts                  pino, structured JSON, the redaction list
    db/                        Drizzle schema and migrations for the shared tables: runs, steps, model_calls,
                               tool_calls, side_effects, holding_area, budgets, idempotency_keys, settings,
                               pauses, cursors (the real one, and one for dry runs), deploys
    runs.ts                    the run record: startRun (with its mode and the build version), recordStep (with the
                               step's redacted output), finishRun; check(run): holds the run if the automation is paused
                               (test and correction runs pass) or if it started under another version
    side-effects.ts            effect(key, intent, fn): checks the side-effect record (a result means done; an unresolved
                               claim, by another run or an earlier attempt, means hold); applies the run's mode, the pause switch and any
                               supervised approval (rechecking the pause after it); only then claims the key with a
                               unique insert and calls fn; records the result. A possibly-sent write to a system
                               without keys is held, not retried, unless the wrapper's lookup resolves it;
                               resolveIntent(key, outcome, evidence) records a person's answer when none can
    http.ts                    serve(routes): Hono — signature or secret check, schema validation, test-run marker,
                               start the run in Hatchet with its mode, answer 2xx;
                               while paused, hold the payload instead
    budget.ts                  reserve(runId, worstCase) and settle(reservation, actual), atomic in PostgreSQL
    models.ts                  callModel(step, …): the model layer with timeout, token ceiling, budget, retries, logging;
                               holds the run instead while the automation is paused
    approvals.ts               signed single-use approval links, and the waits that resume on them; in a dry run or
                               test run, records would-have-asked and continues; in a supervised run, asks for every
                               outward or irreversible side effect
    holding-area.ts            hold(item, error), reprocess(id), and holdInFlight(slug, mode?) for removing a build or
                               ending a dry run
integrations/{system}/         one wrapper per system (`integrations` → Integration calls)
  src/client.ts                typed methods; errors mapped; pagination as async iterators
  fixtures/                    recorded responses, failures included
automations/{slug}/
  VERSION
  Dockerfile                   builds this automation with core and the integrations it imports
  src/
    worker.ts                  starts the Hatchet worker, registers this automation's workflow and its triggers, and
                               serves its inbound routes; its first task checks the pause switch
    routes.ts                  its webhook trigger and approval links, through core's serve(); only when it has them
    workflow.ts                the Hatchet workflow: trigger, steps in order, waits, concurrency and rate-limit keys
    steps/{step}.ts            one file per step: typed input → typed output
    prompts/{step}.md          one file per AI step's prompt
    models.json                each AI step's model identifier — part of the build, evaluated with it
    schemas.ts                 Zod: the trigger contract, each step's input and output, each AI step's output
    config.ts                  this automation's configuration schema
  tests/
    fixtures/                  recordings specific to this automation
    *.test.ts
  evals/
    {step}.eval.ts             the eval for each AI step, reading the cases
```

**Dependency direction:** `core` ← `integrations` ← `automations`. An automation never imports another automation; what two share moves into `core` (if it is plumbing) or a wrapper (if it is a system).

## Steps

- **A step is a function from a typed input to a typed output**, registered as a Hatchet task in `workflow.ts`. It reads configuration and clients from its context, never from module-level globals.
- **Every side effect goes through `effect()`** with its idempotency key. Calling a write method on a wrapper outside `effect()` fails review.
- **Every model call goes through `callModel()`**; no step imports a provider package or the AI SDK directly.
- **Durable waits are Hatchet's** (`sleepFor`, `waitFor` an event); approvals use `approvals.ts`, which issues the link and waits for its event.
- **Retries are declared on the task** (attempts and backoff from configuration); a step throws a `NonRetryableError` for a failure that must not be retried.

## Errors

- **Typed errors at the boundary**: wrappers throw the mapped error classes (`TransientError`, `RateLimitedError`, `NotFoundError`, `InvalidError`, `UnauthorisedError`, `ConflictError`), and steps decide per class — retry, hold, or fail.
- **Validation failures are values**: `schema.safeParse` at every boundary (trigger, step output, model output), with the failure going down the step's defined path.
- **No floating promises, no swallowed errors.** An empty `catch` fails lint.

## Configuration and secrets

- **One Zod schema per automation** in `config.ts`, loaded once at start-up by `loadConfig` from the config file the deployment mounts (`workflow-standards` → Configuration); a missing or invalid value stops the worker. Owner-editable settings are read from the settings table at the start of each run.
- **Secrets are environment variables** the schema names, read only by `config.ts` and the wrappers' client constructors; nothing else reads `process.env`.

## State

- **The shared tables in `core/db`** hold run records, side effects, budgets, idempotency keys and the holding area. Polling cursors are in the shared `cursors` table (`workflow-standards` → Triggers). An automation's own other state (a processed-items table) is a Drizzle table in its folder, prefixed with its slug in snake_case (`chase_overdue_invoices_`).
- **Migrations are expand-only per release**: add a column or table, backfill, switch reads, and drop the old one in a later release once nothing reads it. The previous image must still run against the new schema.

## Code style

- **TypeScript strict**, no `any`, no non-null assertions without a comment, no `as` to silence the compiler. Model variants as discriminated unions.
- **ESM, Node's current LTS**, `async`/`await` throughout.
- **Naming:** `camelCase` values and functions, `PascalCase` types, files `kebab-case`, steps named for what they do (`fetch-overdue-invoices.ts`).
- **Imports** in groups: Node built-ins, third-party, `@core/`, `@integrations/`, relative. Type imports with `import type`.
- **Functions are small**; a file over ~300 lines is split by responsibility.
- **Comments explain why.** Dead code is deleted.
- **Formatting and linting pass before commit** (Prettier, ESLint with `@typescript-eslint/no-floating-promises` on), enforced by a pre-commit hook and repeated in CI.

## Tests in this stack

- **Vitest**, with MSW serving the recorded responses (`onUnhandledRequest: 'error'`) and a test database (PostgreSQL in a container, migrated fresh per run).
- **Steps are tested as functions** with a fake context; **the workflow is tested end to end** through Hatchet's test utilities or by running the steps in order with the same context, once per case, in dry-run mode.
- **Model calls are answered by recorded outputs** through a test double of `callModel`; evals in `evals/` call the real model and run only through `/ai-evals` and the release gate.
