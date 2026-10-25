# Documentation Conventions

Where everything about an automation is written down, and how it stays true. Project specifics live in `CLAUDE.md`. One repository holds every automation for one owner — your own operations, or one client's.

## Definitions

- **Automation** — one unit of work that runs unattended: a trigger, a sequence of steps, and the effects those steps have in other systems. Each has a slug (`invoice-chaser`), used for its folders, its tag and its register row.
- **Runtime** — what executes it: `code` (TypeScript or Python on Hatchet, or a scheduled script), `n8n`, `activepieces`, or `build-sheet` (a manual build guide for Zapier or Make). One runtime per automation at a time; `tech-stack` says how to choose.
- **Step** — one unit inside an automation. A step is **deterministic** (code or a node decides) or an **AI step** (a model decides). Every AI step is named as such in the spec.
- **Side effect** — anything a step changes outside the run: an email sent, a record created, a payment made, a file deleted. Side effects are what make an automation risky, and the run record lists every one.
- **Case** — one real input with its expected outcome. Cases are the automation's acceptance criteria and the data its AI quality checks run on.
- **Risk** — `low`, `medium` or `high`, set in the spec by the table below. It decides where a person must approve, whether shadow mode is required before a first release goes live and supervision before a new version runs unattended, and whether a separate staging environment is.

| Risk | When | Requires |
| --- | --- | --- |
| `low` | Reads only, or writes only to systems the owner controls and can undo easily; nothing reaches a customer or outsider | The standard checks |
| `medium` | Writes to a system of record, messages people inside the organisation, or changes data that takes effort to undo | Dry run before going live; approval on any step the spec marks irreversible; supervision for a new version as `/automation-deploy` Step 1 sets |
| `high` | Messages customers or outsiders, moves money, deletes data, acts for a person externally, or touches regulated data | Approval before every irreversible or outward-facing side effect unless the spec justifies an automatic threshold; shadow mode before going live; supervision for a new version as `/automation-deploy` Step 1 sets; a staging environment when volume makes a mistake costly |

An automation's risk is the highest risk of any of its side effects. Money is always `high`.

## The documents

| Document | Path | Created by | Kept current by |
| --- | --- | --- | --- |
| **Register** — every automation, its status, every inbound endpoint, the defaults | `docs/automations.md` | The installer | `/automation-setup` (defaults), `/automation-spec`, `/automation-build`, `/ai-evals`, `/automation-deploy`, `/automation-fix`, `/automation-convert`, `/automation-console` (its endpoint) |
| **Connections registry** — every external system and how it is reached | `docs/connections.md` | The installer | `/automation-spec` (systems needed), `/automation-build` (added or reused), `/automation-deploy` (credentials, expiry), `/automation-fix`, `/automation-convert` (each connection's new store) |
| **Spec** — what the automation does and why, including its trigger contract | `docs/automations/{slug}/spec.md` | `/automation-spec` | `/automation-spec` in revise mode only |
| **Cases** — real inputs and expected outcomes, one file each | `docs/automations/{slug}/cases/` | `/automation-spec` | `/ai-evals`, `/automation-fix` |
| **Evals** — what each AI step is scored on, thresholds, the latest results, comparisons | `docs/automations/{slug}/evals.md` | `/ai-evals` | `/ai-evals`, `/automation-fix` |
| **Runbook** — how to trigger and test it, what each alert means and what to do, how to reverse its side effects | `docs/automations/{slug}/runbook.md` | `/automation-build` | `/automation-deploy`, `/automation-fix`, `/automation-convert` |
| **Releases** — one entry per release | `docs/automations/{slug}/releases.md` | `/automation-deploy` | `/automation-deploy` |
| **Build sheet** — the manual build guide, `build-sheet` runtime only | `docs/automations/{slug}/build-sheet.md` | `/automation-build` or `/automation-convert` | `/automation-fix` |
| **Infra guide** — every step only a person can do | `docs/infra/infra-setup.md` | `/automation-setup` | `/automation-deploy` |
| **Project configuration** | `CLAUDE.md` | The installer | `/automation-setup`, `/automation-deploy`, `/automation-console` |

The spec and its cases are **runtime-neutral**: they describe what the automation must do, never how one runtime does it. That is what makes an automation portable — `/automation-convert` rebuilds from them and proves the new build against the same cases.

## The register

`docs/automations.md` has three sections, and nothing else.

**Defaults** — set once by `/automation-setup` and changed only deliberately: retry attempts and backoff, how long run records and failed runs are kept, the alert channel, the default model and provider, the default budgets. This is the only place they are kept; `CLAUDE.md` points here. An automation's row records only where it differs.

**Automations** — one row per automation:

| Automation | Status | Version | Runtime | Trigger | Risk | Deployed to | Connections | Budget | Owner | Updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

The trigger column gives the type and its detail (`schedule · 0 7 * * 1-5`, `webhook · /invoice-chaser`, `event · new row in Leads`). Version is the live version, or the version being built before the first release. Budget is the per-run and per-day cost ceiling. Connections name rows of the connections registry. Updated is the date of the last change to the row, with the reason when it is paused or retired.

**Statuses**, in order. An automation moves forward only through them — except that `Paused` returns to `Live` on resume — and each move has a gate:

| Status | Means | Gate to reach it |
| --- | --- | --- |
| `Draft` | The spec is being written | — |
| `Specced` | The spec and its cases are approved | Approval of the spec |
| `Built` | Built for its runtime; tests pass; the local walk on the cases was presented | `/automation-build`'s definition of done |
| `Evaluated` | Every case passes end to end, and every AI step meets its thresholds | `/ai-evals` results recorded in `evals.md` — or, with no AI steps, every case passing end to end in `/automation-build`'s walk |
| `Live` | Running in production with real side effects | `/automation-deploy`'s go-live checks and approval |
| `Paused` | Deployed but switched off, with the reason | — |
| `Retired` | Removed from production; its docs stay | Its trigger and inbound endpoints are gone from the server |

A new version of a `Live` automation — a change of behaviour, a conversion to another runtime, or a fix — goes through `Specced` → `Built` → `Evaluated` while the live version keeps running unchanged; a fix or a conversion skips `Specced`, since the spec stands. The Status cell shows both, as `Live · next Built` (or `Paused · next Built` for a paused one), until the new version replaces it (`/automation-deploy` Step 4; the row is updated at Step 7).

**Inbound endpoints** — every URL a deployment exposes, because each is a way in:

| URL | Deployment | Automation | Purpose | Authentication | Rate limit | Exposure |
| --- | --- | --- | --- | --- | --- | --- |

Purpose is one of: trigger webhook, approval link, manual trigger, console, MCP trigger, platform editor (the n8n or Activepieces UI), engine dashboard. Authentication follows `security` → Inbound endpoints. Exposure is public, allow-listed IPs, or private network. Nothing is exposed that is not listed, and `/automation-deploy` checks the server against this table.

## The connections registry

`docs/connections.md` has one entry per system per environment:

```markdown
### {System} — {environment}

- **Used by** — {automations}
- **Kind** — native node or piece · official SDK · HTTP client · MCP server · webhook source
- **Auth** — OAuth (app registration and who owns it) · API key · service account · signing secret
- **Scopes** — {each scope, and why the spec needs it}
- **Account** — {which account the credential belongs to, and its owner}
- **Test account** — {the sandbox or test account builds and tests use, or "none — reads only"}
- **Limits** — {rate limits and quotas that bind}
- **API version** — {the version pinned, where the API has them}
- **Stored in** — {n8n credentials · Activepieces connection · environment secret name}
- **Expires** — {token or key expiry, or the renewal date}
- **Notes** — {only what a builder needs and cannot find in the vendor docs}
```

A secret value never appears here — only where it is stored.

## The spec

`/automation-spec` writes it with these sections, and only these: Goal and measure · Trigger and its contract · Inputs · Systems and access · Steps · Decision rules · Outputs and side effects · Human checkpoints · Volume and timing · Budget · Failure policy · Data · Risk · Runtime · Out of scope · Open questions. The skill says what each holds.

## Code and workflow files

```
automations/{slug}/              the implementation, for its runtime (layout in the coding standards, or `workflow-standards` for n8n and Activepieces)
automations/{slug}/next/         a conversion's new build, until it replaces the live one (/automation-convert)
automations/_shared/             n8n and Activepieces workflows several automations use, released with the infrastructure
integrations/{system}/           shared wrappers, one per system, used by every code automation that reaches it
deploy/local/                    the development stack, from /automation-setup
deploy/{deployment}/             one deployment, generated by /automation-deploy: the Compose bundle for a `vps`,
                                 or, for a vendor cloud, its VERSION and README (`tech-stack` → Hosting)
deploy/{deployment}/config/      each automation's configuration for that deployment
```

## Session rules

- Before working on an automation, read its spec, its cases, its row in the register, and the connections it uses.
- Each skill starts from an up-to-date `origin/main` that holds the PR of the step before it — the spec for a build, the build for evals, the evals for a deploy. If that PR is not merged yet, stop and ask.
- Existing drafts are unvalidated: take stock of what exists first, and fix files rather than regenerating them.
- Docs describe the automation as it is. They never mention issues, fixes, reviews or decisions taken along the way; the release record and git hold the history.
- A doc is never edited to match what the code happens to do. If the code is right and the doc is wrong, the spec changes through revise mode; if the doc is right, the code is fixed.
- No document holds a secret, a token, a personal record, or an unredacted production payload.
