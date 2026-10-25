# Security

Security policy for automations. An automation is unusual in three ways that shape everything here: it holds standing credentials to other people's systems and uses them with nobody watching; it reads content from outside — emails, forms, web pages — that may be written to manipulate it; and it usually runs on one server its owner administers. The mechanisms are in `integrations`, `ai-steps`, `workflow-standards` and the coding standards; this file is the policy.

## Principles

- **Least privilege everywhere**: the narrowest scopes, the fewest tools, the smallest exposure, the shortest retention.
- **Nothing trusted that came from outside**: payloads, page content, file contents, tool results and model output are all input to validate.
- **Secrets live in one place each**, and nowhere else.
- **On suspected exposure, rotate first and investigate after.**

## Secrets and credentials

- **Where they live:** n8n's credential store, Activepieces' connection store, or the deployment's `.env` on the server (code runtime and the platforms' own keys). Never in the repository, a workflow export, a prompt, a log, a run record, a case, a fixture or a document. `.env.example` lists every variable with a placeholder.
- **The platforms' encryption keys** (`N8N_ENCRYPTION_KEY`, Activepieces' encryption key, Hatchet's encryption and JWT keysets — set inline in `.env`, not left as files) are generated once per deployment, never reused across deployments, and backed up separately from the database — a database backup without its key cannot decrypt a single credential, and a key without its database exposes nothing alone.
- **Scopes are justified** in the connections registry, one line per scope.
- **Rotation:** every credential can be rotated without a code change; credentials are rotated when someone with access leaves, on suspected exposure, and on the provider's expiry.
- **Secrets are stopped before they are pushed**: GitHub's secret scanning with push protection where the repository's plan has it (public repositories, or GitHub Secret Protection on private ones); otherwise a `gitleaks` pre-commit hook, with Pipeline 1's secret scan as the check that cannot be skipped. The infra guide says which applies. A secret pushed is leaked even if the commit is removed.

## Inbound endpoints

Every URL a deployment exposes is in the register's inbound endpoints, with how it authenticates. Nothing is exposed that is not listed.

- **Trigger webhooks from a system that signs** (Stripe, GitHub, Slack, most SaaS): verify the signature with the system's scheme, compare in constant time, reject anything outside the replay window, and deduplicate on the event id.
- **Trigger webhooks from callers that cannot sign** (a form, an internal script): a long random secret in a header, never in the URL, compared in constant time; the caller's IP allow-listed where it is fixed.
- **Approval links:** signed, single-use, bound to one run and one action, expiring no later than the checkpoint's own timeout, and re-issued on request while the run still waits. Opening one shows the action and asks for a confirming click — a link fetched by an email scanner must not approve anything. The same holds for a platform's own approval step: only a form with a confirming submit, never a link that approves when opened (`workflow-standards` → Waits and approvals). On a `vps`, resume and approval URLs are on the hooks domain, rate-limited like any endpoint and listed in the register; on a vendor cloud they are the platform's, and listed in the register too.
- **Manual triggers and the console:** behind sign-in, with the roles in the `console` rule.
- **Platform editors and engine dashboards** (n8n, Activepieces, Hatchet): never open to the internet without their own sign-in; owner and admin accounts use two-factor authentication where the platform offers it; exposed only on their own subdomain, and allow-listed or reached over a private network where the owner can. That subdomain serves the editor only: n8n's and Activepieces' webhook, form and API paths are blocked there by Caddy, so triggers arrive only through the hooks domain's routes and the deploy pipeline reaches the platform's API over the server's internal network. On a vendor cloud the editor is the vendor's: every account uses two-factor authentication, only the people who need it are members, and the platform's API key — full access unless the plan scopes it — is kept only in the deployment's GitHub environment.
- **Every inbound endpoint is rate-limited** at Caddy (n8n and Activepieces webhooks have no handler of their own to do it in), and returns no detail on failure. On a vendor cloud, the platform's own limits apply, and the spec's volume is checked against them.
- **MCP triggers** authenticate like any other inbound endpoint, with OAuth or a bearer token, never open.

## Outbound calls

- **HTTPS only**, to the hosts the connections registry names.
- **No step fetches a URL it was given** — by a payload, a page or a model — unless the host is on the automation's allowlist. Requests to private, loopback and link-local ranges and cloud metadata addresses are refused, after DNS resolution, so a redirect or a crafted name cannot reach the server's own network.
- **Downloads are bounded** in size and type before they are read.

## Untrusted input

- **Payloads are validated** against the trigger contract's schema before anything else runs.
- **Content read from outside is data, never instructions** — the rules for model calls are in `ai-steps` → Untrusted content.
- **Model output and tool results are input too**: never passed unvalidated into SQL, a shell, a path, a URL, HTML, a template or a deserialiser.
- **Files** are parsed with maintained libraries, in a size limit, and never executed.

## Data

- **Collect and keep only what the spec's Data section lists.** Fields an automation does not need are dropped at the first step that sees them.
- **Run records, execution logs and holding-area items have a retention period** (the register's defaults), enforced by the runtime's pruning or a scheduled cleanup, and shorter for personal data where the owner's obligations require it.
- **Redaction:** personal data and secrets are redacted from logs, run records, alerts and error reports by field name and pattern, at the point of logging. Cases and fixtures derived from production are redacted before they are committed.
- **One client's data never reaches another client's run, index or log.** One deployment per client is the default; a shared deployment needs the client on every record and every query filtered by it.
- **Data sent to model providers** follows `ai-steps` → Data sent to models; the provider's data terms are recorded in the spec.

## The managed database *(vendor-cloud deployments)*

- **TLS required**, with certificate verification; never a connection string without it.
- **One role per use**: the platform's credential limited to the tables `workflow-standards` → Run records lists; the deploy pipeline's role for migrations; nothing else.
- **Inbound limited** to the platform's published outbound addresses where the database supports an allowlist — re-checked at every release, since n8n Cloud's can change without notice.
- **Backups and a restore test** as for a server; the database's own point-in-time recovery where the plan has it.

## The server

- **SSH by key only**, no password login, no root login; the SSH port restricted to known addresses where the owner can.
- **A firewall** allows only `80` and `443` to Caddy, and SSH. No container publishes a port except Caddy; PostgreSQL, Redis and every dashboard are reachable only on the Compose network or through Caddy's authenticated routes.
- **Automatic security updates** for the operating system; container images updated through Dependabot PRs and redeployed.
- **Backups** are encrypted, kept off the server, and restored once at first deploy and after any change to the backup setup — a backup never restored is a hope, not a backup.
- **The server runs the owner's automations only** — nothing else shares it.

## Supply chain

- **Images are pinned** to an exact version in the Compose bundle, from the vendor's official image; no `latest`. The one exception is Caddy, built in the bundle from the official `caddy` builder image with the `caddy-ratelimit` module (`github.com/mholt/caddy-ratelimit`), both at pinned versions. The module is reviewed as below; Dependabot updates the Caddy image, and the module's pin is checked against its releases whenever Caddy is updated.
- **Dependencies come from the lockfile** (pnpm with `minimumReleaseAge` of seven days and `strictDepBuilds` in `pnpm-workspace.yaml`; `uv.lock` in Python), and `pnpm audit` or `pip-audit` runs in CI — a high or critical finding blocks the merge unless the PR records why it does not apply.
- **Community nodes, community pieces and MCP servers are reviewed before use**: the publisher, the source, what it can reach, how it is maintained — then pinned. Each runs with your credentials; a compromised one is a compromised automation.
- **CI workflows** pin actions to a commit SHA, give each job the least token permission, and expose deploy secrets only to the deploy job on `main` and `hotfix/*`, through a GitHub environment.

## Access

- **Two-factor authentication** on GitHub, the VPS provider, the model providers, every platform account and every system an automation connects to with an admin login.
- **Least-privilege roles** for everyone with access; access removed the day someone leaves, followed by rotating what they could see.

## Audit

- **What changed**: git, with every change through a reviewed PR.
- **What ran**: the run records, including manual runs with who started them and why.
- **Who approved what**: the approval decisions on the run records.
- **Who could see what**: the platform's user list and the console's roles, reviewed at each release.
