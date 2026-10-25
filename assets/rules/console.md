---
paths:
  - "console/**"
---

# Console

Standards for the optional ops console, built by `/automation-console` for code-runtime automations when non-technical people must approve steps, review results or start runs. Engineers use the Hatchet dashboard; the console is for everyone else. Everything in `security` applies; this adds what a small web app needs.

## Scope

The console has a fixed set of screens, and nothing else unless the owner asks for it:

| Screen | Shows and does |
| --- | --- |
| **Runs** | Each automation's recent runs in business terms (what came in, what was done, outcome, cost), filterable by automation, status and date |
| **Run detail** | The steps, the side-effect record with links into the other systems, the approvals, the errors, and — for operators — retry and reprocess |
| **Approvals** | The inbox of waiting approvals — the spec's checkpoints, and every outward or irreversible side effect of a supervised version: the action exactly as it will run, the summary that led to it, approve, edit where the spec allows, or reject |
| **Start a run** | A form per automation that allows manual runs, built from its trigger contract, with a reason field |
| **Holding area** | Held items, with the error, the side effects their run already made and a reprocess action; for a send that may have gone out, a resolve action — marked sent with evidence, or not sent — recorded with who and why (`workflow-standards` → Idempotency) |
| **Settings** | Per-automation configuration the spec marks as owner-editable (thresholds, recipients), and connection status (healthy, expiring, failed) — never the credentials themselves |
| **Users** *(admins)* | Who has access and with what role |

## Stack

Next.js (App Router) with TypeScript strict, Tailwind and shadcn/ui, reading and writing through server-side code only; the browser never talks to PostgreSQL, Hatchet or any integration. It is TypeScript in either stack. Sign-in is email magic links or the owner's Google or Microsoft accounts through Better Auth, with sessions in the deployment's PostgreSQL. The brand comes from a sibling client's `DESIGN.md` where one exists; otherwise shadcn's defaults with the owner's colour and font.

## Roles

| Role | Can |
| --- | --- |
| `viewer` | See runs, run details and the holding area |
| `approver` | Everything a viewer can, plus approve or reject the automations they are assigned |
| `operator` | Everything a viewer can, plus start runs, retry, reprocess, and pause or resume an automation |
| `admin` | Everything, plus settings and users |

Roles are checked on the server for every action, never inferred from what the page shows. An approver approves only the automations they are assigned to, and never an action they started themselves where the spec requires a second person.

## Rules

- **Every action is recorded on the run**: who, when, what, and the reason where one is asked for.
- **Approve, retry and reprocess are idempotent**: a double click or a replayed request does nothing the second time.
- **Personal data is shown only where the screen needs it**, and masked by default where the role does not.
- **Server actions only**, protected against cross-site requests; no API the browser can call outside them.
- **Served behind Caddy** on its own subdomain, listed in the register's inbound endpoints.
- **Tests:** an integration test per screen against a seeded database, and one end-to-end journey (approve a waiting action) with Playwright.
