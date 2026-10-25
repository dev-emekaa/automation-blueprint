# Coding Standards — Python

How code automations are written in Python. The tools are in `tech-stack`; the design rules every automation follows are in `workflow-standards`, `integrations` and `ai-steps`; this file is how they are expressed in code.

## Project structure

A `uv` workspace. Every automation is its own package and its own worker image; shared code lives in two places only.

```
pyproject.toml                 the workspace root: members listed one by one — core, each integration, each code
                               automation and a conversion's `next/` while it exists — Ruff and mypy settings
uv.lock
packages/core/                 shared by every automation — nothing automation-specific
  src/core/
    config.py                  load_config(Model): reads the deployment's config file, the owner-editable settings
                               and the secrets from env into a pydantic-settings model, fails at start-up
    logging.py                 structlog, structured JSON, the redaction processor
    db/                        SQLAlchemy models and Alembic migrations for the shared tables: runs, steps,
                               model_calls, tool_calls, side_effects, holding_area, budgets, idempotency_keys, settings,
                               pauses, cursors (the real one, and one for dry runs), deploys
    runs.py                    the run record: start_run (with its mode and the build version), record_step (with the
                               step's redacted output), finish_run; check(run): holds the run if the automation is paused
                               (test and correction runs pass) or if it started under another version
    side_effects.py            effect(key, intent, fn): checks the side-effect record (a result means done; an unresolved
                               claim, by another run or an earlier attempt, means hold); applies the run's mode, the pause switch and any
                               supervised approval (rechecking the pause after it); only then claims the key with a
                               unique insert and calls fn; records the result. A possibly-sent write to a system
                               without keys is held, not retried, unless the wrapper's lookup resolves it;
                               resolve_intent(key, outcome, evidence) records a person's answer when none can
    http.py                    serve(routes): Starlette — signature or secret check, schema validation, test-run marker,
                               start the run in Hatchet with its mode, answer 2xx;
                               while paused, hold the payload instead
    budget.py                  reserve(run_id, worst_case) and settle(reservation, actual), atomic in PostgreSQL
    models.py                  call_model(step, …): Pydantic AI with timeout, token ceiling, budget, retries, logging;
                               holds the run instead while the automation is paused
    approvals.py               signed single-use approval links, and the waits that resume on them; in a dry run or
                               test run, records would-have-asked and continues; in a supervised run, asks for every
                               outward or irreversible side effect
    holding_area.py            hold(item, error), reprocess(id), and hold_in_flight(slug, mode=None) for removing a build or ending
                               a dry run
integrations/{system}/         one wrapper per system (`integrations` → Integration calls)
  src/{system_package}/client.py  the system's name with underscores for hyphens; typed methods; errors mapped;
                               pagination as iterators
  fixtures/                    recorded responses, failures included
automations/{slug}/
  VERSION
  Dockerfile                   builds this automation with core and the integrations it imports
  pyproject.toml
  src/{package}/                the slug with underscores for hyphens (`chase_overdue_invoices`) — a valid package name
    worker.py                  starts the Hatchet worker, registers this automation's workflow and its triggers, and
                               serves its inbound routes; its first task checks the pause switch
    routes.py                  its webhook trigger and approval links, through core's serve(); only when it has them
    workflow.py                the Hatchet workflow: trigger, steps in order, waits, concurrency and rate-limit keys
    steps/{step}.py            one module per step: typed input → typed output
    prompts/{step}.md          one file per AI step's prompt
    models.json                each AI step's model identifier — part of the build, evaluated with it
    schemas.py                 Pydantic: the trigger contract, each step's input and output, each AI step's output
    config.py                  this automation's settings model
  tests/
    fixtures/
    test_*.py
  evals/
    eval_{step}.py             the eval for each AI step, reading the cases
```

**Dependency direction:** `core` ← `integrations` ← `automations`. An automation never imports another automation; what two share moves into `core` (if it is plumbing) or a wrapper (if it is a system).

## Steps

- **A step is a function from a typed input to a typed output** (Pydantic models), registered as a Hatchet task in `workflow.py`. It reads configuration and clients from its context, never from module-level globals.
- **Every side effect goes through `effect()`** with its idempotency key. Calling a write method on a wrapper outside `effect()` fails review.
- **Every model call goes through `call_model()`**; no step imports a provider SDK or constructs a Pydantic AI agent directly.
- **Durable waits are Hatchet's** (durable sleep, waiting for an event); approvals use `approvals.py`, which issues the link and waits for its event.
- **Retries are declared on the task** (attempts and backoff from configuration); a step raises Hatchet's non-retryable error for a failure that must not be retried.

## Errors

- **Typed exceptions at the boundary**: wrappers raise the mapped classes (`TransientError`, `RateLimitedError`, `NotFoundError`, `InvalidError`, `UnauthorisedError`, `ConflictError`), and steps decide per class — retry, hold, or fail.
- **Validation failures are handled**: `Model.model_validate` at every boundary (trigger, step output, model output), with `ValidationError` going down the step's defined path.
- **No bare `except`, no swallowed exceptions.** Ruff's rules for both are on.

## Configuration and secrets

- **One settings model per automation** in `config.py`, loaded once at start-up from the config file the deployment mounts (`workflow-standards` → Configuration); a missing or invalid value stops the worker. Owner-editable settings are read from the settings table at the start of each run.
- **Secrets are environment variables** the model names, read only by `config.py` and the wrappers' client constructors; nothing else reads `os.environ`.

## State

- **The shared tables in `core/db`** hold run records, side effects, budgets, idempotency keys and the holding area. Polling cursors are in the shared `cursors` table (`workflow-standards` → Triggers). An automation's own other state is a SQLAlchemy model in its package, its tables prefixed with its package name (`chase_overdue_invoices_`).
- **Migrations are expand-only per release**: add, backfill, switch reads, and drop the old one in a later release once nothing reads it. The previous image must still run against the new schema.

## Code style

- **Typed throughout**, `mypy --strict` clean; no `Any` without a comment; `TypedDict` or Pydantic models over loose dicts.
- **Async** where the Hatchet SDK and `httpx` are used async; never mix a blocking call into an async step.
- **Naming:** `snake_case` values, functions and modules, `PascalCase` classes, steps named for what they do (`fetch_overdue_invoices.py`).
- **Imports** sorted by Ruff: standard library, third-party, `core`, integrations, local.
- **Functions are small**; a module over ~300 lines is split by responsibility.
- **Comments explain why.** Dead code is deleted.
- **Formatting and linting pass before commit** (Ruff format and check, mypy), enforced by a pre-commit hook and repeated in CI.

## Tests in this stack

- **pytest**, with `respx` serving the recorded responses (unmatched requests fail) and a test database (PostgreSQL in a container, migrated fresh per run).
- **Steps are tested as functions** with a fake context; **the workflow is tested end to end** by running the steps in order with the same context, once per case, in dry-run mode.
- **Model calls are answered by recorded outputs** through a test double of `call_model` (Pydantic AI's `TestModel` or `FunctionModel` where it fits); evals in `evals/` call the real model and run only through `/ai-evals` and the release gate.
