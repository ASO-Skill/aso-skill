# ASO Skill for AI agents

An installable [Agent Skill](https://agentskills.io/) that helps AI agents use the [ASO Skill](https://www.asoskill.com) public API for current Apple App Store keyword and competitor research.

It supports current search rankings and keyword difficulty, keyword popularity, detailed metadata for up to 10 App Store IDs, credit balance and pack discovery, and human-completed checkout when the account owner asks to top up.

## Install

The intended public repository address is:

```bash
npx skills add aso-skill/aso-skill
```

Until that GitHub organization repository is published, install this checkout locally with `npx skills add .`. The skill follows the open [Agent Skills specification](https://agentskills.io/specification).

## Authentication

The skill uses the separate [ASO Skill CLI](https://github.com/hesselbom/aso-skill-cli). The agent runs browser-assisted login, the user signs in to ASO Skill and approves the exact scopes, and the CLI saves the credential in the operating-system credential store. Neither the user nor the agent has to copy an API key into `.env` or a conversation.

```bash
npx --yes github:hesselbom/aso-skill-cli#v0.1.0 login
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
- `agents/openai.yaml` — optional UI metadata for compatible clients

## Develop

Tests are offline and do not call metered API routes.

```bash
npm test
npm run check
npx skills add . --list
```

The canonical API contract is <https://www.asoskill.com/openapi.yaml>.

## License

MIT
