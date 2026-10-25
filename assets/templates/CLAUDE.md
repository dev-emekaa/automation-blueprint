## Documentation map

| Type | Location |
| --- | --- |
| Register — every automation, its status, every inbound endpoint, the defaults | `docs/automations.md` |
| Connections registry | `docs/connections.md` |
| Specs, cases, evals, runbooks, releases | `docs/automations/{slug}/` |
| Infra setup | `docs/infra/infra-setup.md` |
| Automations | `automations/{slug}/` |
| Shared integration wrappers *(code)* | `integrations/{system}/` |
| Deployments | `deploy/{deployment}/` |
| Ops console *(optional)* | `console/` |

## Project configuration

<!-- The automation skills read these. Anything missing, they ask for once; /automation-setup and /automation-deploy fill in what they create. -->

| Key | Value |
| --- | --- |
| Owner | who these automations are for — your own operations, or the client's name |
| Code stack | {{STACK}} |
| Runtimes in use | code · n8n · activepieces · build-sheet — whichever automations here use |
| Deployments | each deployment, its kind — `vps` (the default) · `n8n-cloud` · `activepieces-cloud` (`tech-stack` → Hosting) — and its domain or instance URL — `deploy/{deployment}/` |
| Hosting | `vps`: the provider and region. Vendor cloud: the plan, and what setup confirmed it includes (API, custom domain, execution limits, retention, platform version) |
| Heartbeat service | Healthchecks.io project, or a self-hosted Healthchecks URL |
| Backup target | the S3-compatible bucket backups go to |
| Model providers | which providers' accounts exist, and their data terms (training off, retention) |
| Defaults | the alert channel, default model, budgets, retries and retention are kept in the register — `docs/automations.md` → Defaults |
| Release owners | GitHub usernames allowed to run the deploy |
| Console | off · on (`console/`, its domain) |
| Dev commands | test, eval, lint, local stack up and down — `/automation-setup` fills these in |
