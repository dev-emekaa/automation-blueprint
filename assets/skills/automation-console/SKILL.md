---
name: automation-console
description: Build the optional ops console for code-runtime automations — runs in business terms, run detail with the side-effect record, an approvals inbox, manual runs, the holding area, owner-editable settings, connection status and users, behind sign-in with viewer, approver, operator and admin roles. Use when non-technical people must approve steps, review results or start runs; engineers use the Hatchet dashboard, and n8n and Activepieces have their own UI and approval steps.
---

# Automation Console

Builds `console/`, a small web app over the deployment's run records and Hatchet, with the fixed screens the `console` rule lists. It is optional: build it only when the people who operate the automations are not the people who built them.

## Read first

The `console` rule, `security`, the register, and the specs of the automations it will show — their checkpoints (what approvers see), their trigger contracts (what a manual run asks for), and the configuration they mark owner-editable. A sibling client's `DESIGN.md`, if `CLAUDE.md` points to one.

## Step 1 — Plan → **wait for my approval**

Which automations it covers; who uses it and with which roles; which screens beyond the fixed set, if any, with why; how people sign in; its subdomain; the brand. Check the current stable versions of Next.js, shadcn/ui and Better Auth against their docs.

## Step 2 — Build

- The app in `console/`, per the `console` rule: the stack, server actions only, the role checks on every action, the screens.
- **Reads** run records, side effects, approvals and the holding area from the deployment's PostgreSQL through the shared core's schema, and run status from Hatchet's API — server side only.
- **Actions** — approve, reject, start (including as a test run), retry, reprocess, resolve an unresolved send, pause, resume, edit a setting — go through the shared core and Hatchet's API, idempotent, each recorded on the run with who did it. A setting edit writes the settings table (`workflow-standards` → Configuration); pause and resume set and clear the automation's pause switch with the reason — the same switch the deploy pipeline's `pause` and `resume` modes use (`workflow-standards` → Pausing) — and resuming opens the holding area's held items for the operator to reprocess or drop. At `medium` and `high` risk the console refuses to resume unless the live configuration has `supervised` on (`/automation-deploy` → Pause and retire); every resume starts a test run and shows its result, and reminds the operator that the register's row is updated through `/automation-deploy`.
- **Approvals** resume the waiting run through the same event the signed links use, so an action approved in the console and one approved from a link are the same path.
- **Personal data** masked where a role does not need it.

## Step 3 — Test and walk

The integration tests and the Playwright journey the `console` rule requires; then walk every screen in the chat, signed in as each role, showing what each can and cannot do — including an approver trying an automation they are not assigned to, and a viewer trying an action.

## Step 4 — Deploy and deliver

Add the console's image build and service to `deploy/{deployment}/compose.yml` and its site to the Caddyfile, list it in the register's inbound endpoints, and release it through `/automation-deploy` → Infrastructure releases. Set `Console` in `CLAUDE.md`. Deliver it as a PR: create a branch off `origin/main`, push, give me the link. Never create the PR yourself.
