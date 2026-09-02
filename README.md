# ASO Skill for AI agents

The official public integration package for [ASO Skill](https://www.asoskill.com). It combines a portable [Agent Plugin](https://agent-plugins.org/), an installable [Agent Skill](https://agentskills.io/), and declarative configuration for the hosted MCP server.

It supports current search rankings and keyword difficulty, keyword popularity, detailed metadata for up to 10 App Store IDs, credit balance and pack discovery, and human-completed checkout when the account owner asks to top up.

## Install

Install the standalone skill from its public repository:

```bash
npx skills add aso-skill/aso-skill
```

The skill follows the open [Agent Skills specification](https://agentskills.io/specification). Its source is available at [ASO-Skill/aso-skill](https://github.com/ASO-Skill/aso-skill).

Clients that support the open Agent Plugins format can install this repository as a plugin. The root `plugin.json`, `mcp.json`, and `skills/aso-skill/SKILL.md` package the same hosted connection and reviewed workflow without local executable code.

Gemini CLI can install the repository as an extension:

```bash
gemini extensions install https://github.com/ASO-Skill/aso-skill
```

## Hosted MCP

Compatible remote MCP clients can connect to:

```text
https://api.asoskill.com/mcp
```

The connection uses OAuth authorization code with S256 PKCE, dynamic client registration, short-lived access tokens, refresh rotation with reuse detection, and dashboard revocation. It exposes five focused tools plus a hosted snapshot of this Agent Skill for compatible clients. See the [MCP guide](https://www.asoskill.com/mcp), [ChatGPT guide](https://www.asoskill.com/chatgpt), and [Claude guide](https://www.asoskill.com/claude).

Authentication is client-managed. The repository contains no API keys, OAuth client secrets, user credentials, or environment files. Clients discover the authorization server from the protected MCP resource and open ASO Skill's browser-based consent flow.

## CLI authentication

The skill uses the separate [ASO Skill CLI](https://github.com/aso-skill/cli). The agent runs browser-assisted login, the user signs in to ASO Skill and approves the exact scopes, and the CLI saves the credential in the operating-system credential store. Neither the user nor the agent has to copy an API key into `.env` or a conversation.

```bash
npx --yes @aso-skill/cli@0.1.4 login
```

The default credential has `data` and `credits` access and expires after 90 days. Checkout is an explicit additional permission. `ASO_SKILL_API_KEY` remains available as an override for CI when supplied by the CI platform's secret manager.

## Example prompts

```text
Use ASO Skill to compare the difficulty and popularity of "workout planner" in the US App Store.
```

```text
Find the leading iPhone apps for "habit tracker" in Sweden and summarize the top five competitors.
```

Every successful search, popularity, or app-lookup request costs one credit. The skill minimizes paid calls and batches app lookups.

## Repository layout

- `SKILL.md` — agent-facing workflow and safety rules
- `references/api.md` — compact public API and authentication reference
- `plugin.json`, `mcp.json`, and `skills/` — portable Agent Plugin package
- `server.json` — Official MCP Registry metadata for the hosted server
- `gemini-extension.json` — Gemini CLI extension configuration
- `agents/openai.yaml` — optional UI metadata for compatible clients
- `.codex-plugin/plugin.json` and `.mcp.json` — ChatGPT/Codex plugin packaging for the hosted MCP connection
- `assets/icon.png` — public ASO Skill marketplace artwork with metadata stripped

## Develop

Tests are offline and do not call metered API routes.

```bash
npm test
npm run check
npx skills add . --list
```

The canonical API contract is <https://www.asoskill.com/openapi.yaml>.

## Security

The plugin contains instructions and declarative connection metadata only. It does not execute installation scripts, read environment variables, or proxy credentials. Report security concerns through the [ASO Skill contact page](https://www.asoskill.com/contact); do not include secrets in a public issue.

## License

MIT
