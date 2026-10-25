# Testing

How automations are proven to work before they run unattended. The tools are in `tech-stack`; which pipeline runs what is in `ci-cd`; how AI quality is scored is `/ai-evals`'s.

## Principles

- **The cases are the acceptance criteria.** An automation is done when every case in `docs/automations/{slug}/cases/` produces its expected outcome, end to end.
- **Tests are deterministic; evals are not.** Tests use recorded responses and never call a live model or a production system, so they run on every PR. Evals call live models and measure quality, so they run deliberately and gate releases.
- **Nothing is tested against production.** Builds and tests use test accounts, recorded responses and dry runs; production is reached only by the post-deploy smoke check, as a test run (`workflow-standards` → Dry run, test runs and supervision), which never makes a side effect.
- **A bug gets a test that reproduces it**, at the lowest layer that can, failing before the fix and passing after, in the same PR.

## Layers

| Layer | Proves | Runs against | When |
| --- | --- | --- | --- |
| **Static** | Types, lint, formatting; workflow JSON parses, its nodes' `typeVersion`s exist in the pinned n8n version, and every Activepieces step names an exact piece version; configuration files match their schemas | The source | Before commit, and on every PR |
| **Unit** | Pure logic: transforms, decision rules, schemas, the idempotency-key derivation, the budget arithmetic | Nothing | Every PR |
| **Step** | Each integration wrapper's operations and each AI step's handling — including failure shapes — on recorded responses | Recorded responses | Every PR |
| **End-to-end** | The whole automation on every case, in dry-run mode: the right steps run, the right side effects are recorded as would-have, duplicates are no-ops, failures land in the holding area | Recorded responses for systems and models (code); the pinned local platform instance with test accounts (n8n, Activepieces) | Every PR for code; every PR touching the workflow for n8n and Activepieces |
| **Integration** | The wrappers and connections against the systems' test accounts: auth, scopes, pagination, rate-limit behaviour, real response shapes | Test accounts | On demand, and before a release that changes a wrapper or a connection |
| **Evals** | AI steps meet their thresholds on the cases | Live models | Before every release that changes a prompt, a model, a schema or an AI step, and on demand |
| **Shadow** | The automation's would-have actions match what a person or the old system did, on live traffic | Production inputs, no side effects | Before a first release goes live at `high` risk; optional otherwise. A new version proves itself under supervision instead (`/automation-deploy` Step 1) |
| **Parity** | A converted automation matches the original on every case, every eval, and a sample of recent production inputs | The new build, in dry run | Before a conversion goes live |
| **Smoke** | The deployment works: triggers reach it, connections authenticate, a test run of one case completes, the alert path fires | Production, as a test run | After every deploy |

## Recorded responses

- **Every external call in a test is answered from a recording**: MSW in TypeScript, `respx` in Python, with the recording in the wrapper's `fixtures/` (shared) or the automation's `tests/fixtures/` (specific). An unrecorded call fails the test.
- **Recordings come from the test account**, made once and redacted, and are refreshed when the system's API changes — the refresh is part of the fix (`/automation-fix`).
- **Failure shapes are recorded too**: timeouts, rate limits, `4xx` and `5xx` responses, empty pages, malformed bodies. For model calls: malformed output, refusals, truncation, timeouts.
- **Model calls in tests return recorded outputs**, so an end-to-end test checks the automation's handling of an output, not the model's quality.

## Cases

- **Each case is one file**: the trigger payload or input, the expected outcome (the side effects that should be recorded, the fields that should be extracted, the decision that should be taken), and a one-line note on what it covers.
- **The set covers** the common path, every branch in the spec's decision rules, every failure the failure policy names, the edge inputs (empty, very long, another language, malformed), duplicates, and — for AI steps — the inputs most likely to go wrong, including untrusted content that tries to steer the model.
- **Cases from production** are redacted before they are committed and added only with the owner's agreement.

## Testing on n8n and Activepieces

- **The pinned version runs locally** from `deploy/local/compose.yml` (in CI, as a service container), with test-account credentials. For a vendor-cloud deployment, the pinned version is the one the cloud runs, confirmed at each release; when the vendor upgrades, the end-to-end tests run again on the new version.
- **The workflow is imported** from the repository's JSON and published in that instance with `dryRun` on, then run once per case by posting the case to its production webhook path (`/webhook/{path}` on n8n) or, for other triggers, through the platform's CLI or API — never through the editor's test URL, which only listens while someone is in the editor. A script in `tests/` compares each execution with the case's expected outcome.
- **The dry-run switch** is `dryRun` in the workflow's Config node; every model and side-effect node sits behind the shared guard, which applies it; the committed value is on, and each deployment's config file sets its own. The cases include a supervised run and a paused one, so the guard itself is tested.
- **After a passing run**, the workflow is exported again and normalised (`workflow-standards`), so the committed JSON is the tested one.

## When something breaks

- **A failure in production is reproduced from its run record**: the input and the step outputs it recorded, with recorded responses for the calls, replayed in the test setup until the test fails the way production did.
- **A failure an eval catches** becomes a case, so the next eval checks it too.
- **A third-party API change** is caught by a step test failing on a fresh recording, or by an integration test; every automation using that wrapper is retested before the fix ships.
- **A failing test is never skipped, deleted or loosened** to make a pipeline green unless the PR states why.
