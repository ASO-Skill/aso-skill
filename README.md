# ASO Skill for AI agents

An installable [Agent Skill](https://agentskills.io/) that helps AI agents use the [ASO Skill](https://www.asoskill.com) public API for current Apple App Store keyword and competitor research.

It supports:

- Current App Store search results and keyword difficulty
- Keyword popularity
- Detailed metadata for up to 10 App Store IDs per request
- Credit balance and pack discovery
- Human-completed Polar Checkout when the account owner asks to top up

ASO Skill does not provide Android data, download or revenue estimates, historical rankings, or predictions of future ranking performance.

## Install

```bash
npx skills add aso-skill/aso-skill
```

The skill follows the open [Agent Skills specification](https://agentskills.io/specification) and is discoverable by Codex, Claude Code, Cursor, and other compatible agents supported by the `skills` CLI.

## Set up an API key

Create an account and a named API key at <https://www.asoskill.com/dashboard>. Store the key as `ASO_SKILL_API_KEY` in your environment or secret manager. Do not paste it into chat, put it in a URL, or commit it.

For an interactive shell session, this avoids putting the key in shell history:

```bash
printf 'ASO Skill API key: ' >&2
IFS= read -rs ASO_SKILL_API_KEY
printf '\n' >&2
export ASO_SKILL_API_KEY
```

## Example prompts

```text
Use ASO Skill to compare the difficulty and popularity of "workout planner" in the US App Store.
```

```text
Find the leading iPhone apps for "habit tracker" in Sweden and summarize the top five competitors.
```

```text
Look up these App Store IDs with ASO Skill and compare their ratings, release recency, and positioning: 123456789, 987654321.
```

Every successful search, popularity, or app-lookup request costs one credit. Free endpoints let the agent check the balance and discover current packs. The skill minimizes paid calls and batches app lookups.

## Repository layout

- `SKILL.md` — agent-facing workflow and safety rules
- `references/api.md` — compact public API reference
- `scripts/aso-skill.mjs` — dependency-free Node.js client
- `agents/openai.yaml` — optional UI metadata for compatible clients

## Develop

Requires Node.js 18 or newer. Tests are offline and do not call metered API routes.

```bash
npm test
npm run check
```

To inspect how the skills CLI discovers the local repository:

```bash
npx skills add . --list
```

The canonical API contract is <https://www.asoskill.com/openapi.yaml>.

## License

MIT
