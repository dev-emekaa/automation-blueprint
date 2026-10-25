# Automations

> **What this is:** every automation in this repository, where it stands, and every way into the servers that run them. An automation that silently stops produces nothing, and silence looks like success — this register, with each scheduled automation's heartbeat, is what makes that visible.
> **When it changes:** when an automation is specced, built, evaluated, deployed, paused, retired or fixed, and whenever an inbound endpoint is added or removed. Format and statuses: `documentation-conventions` → The register.

## Defaults

<!-- Set once by /automation-setup, and kept only here; an automation's row records only where it differs. -->

| Setting | Value |
| --- | --- |
| Retry attempts and backoff | |
| Run record retention | |
| Failed run and holding-area retention | |
| Alert channel | |
| Default model and provider | |
| Budget per run | |
| Budget per day, per automation | |

## Automations

| Automation | Status | Version | Runtime | Trigger | Risk | Deployed to | Connections | Budget | Owner | Updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

<!-- Statuses: Draft → Specced → Built → Evaluated → Live, and Paused, Retired. A new version of a live automation shows as `Live · next Built`. -->

## Inbound endpoints

| URL | Deployment | Automation | Purpose | Authentication | Rate limit | Exposure |
| --- | --- | --- | --- | --- | --- | --- |

<!-- Every URL any deployment exposes. Nothing is exposed that is not listed here. -->
