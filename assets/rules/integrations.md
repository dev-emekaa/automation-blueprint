# Integrations

How automations reach other systems: the connections that hold access, the calls deterministic steps make, and the tools an AI step may be given — MCP included. Secrets, scopes and supply chain are in `security`; how an agent decides to use a tool is in `ai-steps`; the registry format is in `documentation-conventions`.

These are three different things with three different risks, and are never treated as one:

| | What it is | Who decides the call | The risk |
| --- | --- | --- | --- |
| **Connection** | Access to one account in one system, through one credential | — | A leaked or over-broad credential |
| **Integration call** | A step that always makes this call | The automation's code or flow | The other system is unreliable, limited, or changes |
| **Tool** | A capability offered to an AI step | The model | The model calls it when it should not — including because something it read told it to |

## Connections

- **One connection per system per environment**, with the narrowest scopes the spec justifies — read-only where the automation only reads, one mailbox rather than the domain, one folder rather than the drive. A broader scope is a decision in the build plan, with the reason.
- **Owned deliberately.** The account a credential belongs to is named in the registry: a service account or a dedicated integration user where the system supports one, never a person's personal login where it does not have to be. A person leaving must not break production.
- **Every connection has a test account** — the system's sandbox, a test workspace, a separate mailbox — that builds, tests and dry runs use. Where none exists, the registry says so, and tests rely on recorded responses and dry runs only.
- **Stored only in the runtime's credential store**: n8n credentials, Activepieces connections, or the deployment's environment secrets for code. Never in a workflow export, the repository, a prompt, a log or a run record.
- **Expiry is tracked.** Every credential with an expiry or a renewal date is in the registry, a refresh failure alerts at once, and a renewal is due before the date, not after.

## Integration calls

**Choose the integration in this order**, and record the choice in the registry:

1. **The runtime's maintained node or piece** — auth, pagination and errors already handled. In code, a maintained official SDK takes this place.
2. **The vendor's official SDK.**
3. **A typed HTTP client** written against the vendor's API reference.

**In code, each system has one wrapper**, in `integrations/{system}/`, shared by every automation that reaches it. The wrapper owns everything about that system so no automation repeats it:

- the client, created from the connection's stored credential;
- typed methods for the operations the automations use — no automation calls the system's raw API around the wrapper;
- the API version, pinned where the API has versions;
- timeouts, the retry policy, and the rate limit, as a shared limit across automations — a write to a system without idempotency keys is not retried once the request may have been sent (`workflow-standards` → Idempotency);
- pagination to the end, as an iterator;
- the system's errors mapped to ours: transient, rate-limited, not-found, invalid, unauthorised, conflict;
- idempotency keys passed through where the system accepts them, and, where it does not, a lookup that tells whether a write already happened, if the system allows one;
- recorded responses for its operations, including the failures (`testing`).

On n8n and Activepieces the node or piece is the wrapper; the conventions in `workflow-standards` keep its use consistent.

**Inbound webhooks from a system** are verified by its signature scheme, checked for replay, deduplicated on its event id, and acknowledged before processing (`workflow-standards` → Triggers).

**MCP is not used for integration calls.** A step that always makes the same call makes it directly: it is cheaper, faster, deterministic and testable. MCP is for tools an AI step chooses between.

## Tools for AI steps

An AI step gets tools only when `ai-steps` says an agent is the right design. Then:

- **The fewest tools that do the job**, each with a name, a one-line description, and a schema for its arguments. Ten tools where three would do makes the model worse and the attack surface larger.
- **Read tools and write tools are separate.** A tool that reads never writes; a tool that writes does one thing.
- **Every tool is limited to the run.** It acts only on the records the run is about — reply only in the thread being handled, update only the lead being enriched — enforced inside the tool from the run's context, never from what the model asked for.
- **Write tools validate their arguments** against the schema and against the spec's decision rules before acting, and each write is a side effect: keyed, recorded, and approved where the risk table says.
- **What a tool returns is untrusted input** to the model's next step (`ai-steps` → Untrusted content).
- **Tool calls are budgeted**: a maximum number per run, inside the run's spend and time limits.

## MCP servers

Use an MCP server for an AI step's tools when a maintained server exists for the system and the step is an agent. Then:

- **It comes from the vendor or a reviewed source**, at a pinned version — an MCP server is third-party code running with your credentials (`security` → Supply chain).
- **Only the tools the step needs are enabled**, by an explicit allowlist, never the server's whole catalogue.
- **Its tool descriptions are reviewed** before use and on every version change: a description is text the model reads and follows, so it can carry instructions.
- **Its credentials are the same connection** in the registry, with the same scopes and owner — not a second, broader one.
- **Local servers run as a process** inside the deployment (stdio); **remote servers** are reached over HTTPS with OAuth, and their URL is in the registry.
- **Runtime support:** `@ai-sdk/mcp` in TypeScript, Pydantic AI's MCP client in Python, n8n's MCP Client Tool node, and Activepieces where its pieces provide it.

**Exposing an automation as an MCP server**, so an agent can trigger it, is a trigger type (`workflow-standards` → Triggers), listed in the register's inbound endpoints.

## While building

Claude may use connectors available in the session — a CRM's MCP, a database client — to look at real data shapes and API behaviour while building. **Read-only, always**: no write to any production system from a build session, and nothing read is copied into the repository without the redaction `security` requires.
