---
name: aso-skill
description: Query ASO Skill for current Apple App Store search rankings, keyword difficulty and popularity, app metadata, credit balances, and credit-pack checkout discovery. Use for live App Store keyword or competitor research through ASO Skill. Do not use for Android data, download or revenue estimates, historical rankings, or predictions of future ranking performance.
license: MIT
metadata:
  author: ASO Skill
  version: "1.1.0"
---

# Use ASO Skill

Use the ASO Skill CLI to retrieve current Apple App Store keyword and app data. ASO Skill is independent of Apple.

## Boundaries

- Use this skill for current App Store search results, keyword difficulty (0–100), keyword popularity (1–100), or metadata for known App Store IDs.
- Do not claim that the API supplies Android data, downloads, revenue, historical keyword rankings, or future ranking outcomes.
- A successful `search`, `popularity`, or `apps` request costs one credit, including a cache hit. `credits`, `packs`, `status`, and browser login are free.
- Never print an API key, place it in a URL or command argument, commit it, or include it in a response. Do not ask the user to paste a key or create `.env` for interactive use.
- Use only the paid calls needed for the user's request. Batch as many as 10 App Store IDs into one `apps` call.
- Do not automatically retry a network failure whose HTTP outcome is unknown: a successful first request may already have consumed a credit.

## Choose calls

| User need | Calls | Cost on success |
| --- | --- | --- |
| Current ranking results and difficulty | `search` | 1 credit |
| Keyword popularity | `popularity` | 1 credit |
| Keyword opportunity using both measures | `search` + `popularity` | 2 credits |
| Metadata for 1–10 known app IDs | one batched `apps` | 1 credit |
| Search competitors, then inspect up to 10 | `search` + one batched `apps` | 2 credits |
| Remaining balance | `credits` | Free |
| Available packs | `packs` | Free |

If the user did not specify a storefront or platform, infer them from context. Otherwise use `US` and `iphone`, and state that assumption. Storefronts are two-letter country codes. Search and app lookup platforms are `iphone`, `ipad`, `mac`, `appletv`, `watch`, and `vision`; popularity has no platform parameter.

## Authenticate without handling secrets

Use the official CLI from its public repository:

```bash
npx --yes github:hesselbom/aso-skill-cli#v0.1.0 status
```

If status says the user is not logged in, start browser-assisted login:

```bash
npx --yes github:hesselbom/aso-skill-cli#v0.1.0 login
```

The command normally opens the ASO Skill connection page. Immediately give the user the URL and connection code printed by the command, then keep the command running while they sign in and approve. The default credential requests only `data` and `credits`, expires after 90 days, and is stored in the operating-system credential store. The API-key plaintext must not appear in terminal output or the conversation.

On a trusted headless machine where the system keyring is unavailable, use `--credential-store file --no-open`. Tell the user that this explicit fallback writes the credential with mode `0600`, and give them the printed approval URL. For CI, an operator may inject `ASO_SKILL_API_KEY` from the CI platform's secret manager; do not create or edit a plaintext `.env` file.

Do not request `--allow-checkout` during ordinary research. If the user explicitly asks to purchase credits and the current credential lacks `checkout`, explain that replacing it requires logout and a new browser approval. Do not revoke the existing credential until the user confirms that replacement.

## Run the client

```bash
npx --yes github:hesselbom/aso-skill-cli#v0.1.0 search "workout planner" --storefront US --platform iphone
npx --yes github:hesselbom/aso-skill-cli#v0.1.0 popularity "workout planner" --storefront US
npx --yes github:hesselbom/aso-skill-cli#v0.1.0 apps 123456789 987654321 --storefront US --platform iphone
npx --yes github:hesselbom/aso-skill-cli#v0.1.0 credits
npx --yes github:hesselbom/aso-skill-cli#v0.1.0 packs
```

Use `npx --yes github:hesselbom/aso-skill-cli#v0.1.0 help` for the complete syntax. For durable integrations, unusual response fields, authentication details, or schema questions, read [references/api.md](references/api.md) and then consult the canonical live contract at <https://www.asoskill.com/openapi.yaml>.

## Interpret results

- Report the storefront, platform when applicable, observation time from `fetchedAt`, and whether `cache` is `hit`, `refresh`, or `stale` when freshness matters.
- Preserve the API's distinction between difficulty and popularity. Do not combine them into a proprietary score unless the user asks for an explicitly labeled heuristic.
- For search results, distinguish rank `position` from optional category rank.
- For app lookup, report `missingAppIds` instead of silently dropping requested IDs.
- Popularity `source` can be `monthly`, `direct`, `related`, or `fallback`. Identify it when material; avoid overstating precision, especially for a fallback.
- Keep `requestId` available for troubleshooting, but omit it from ordinary prose unless useful.

## Handle failures

- `400`: fix the request; no credit was consumed.
- `401`: run `status`. If the key expired or was revoked, remove it with `logout` when possible and start browser login again. Never display the key.
- `402`: no credits remain. Call `packs` for free and present the available choices.
- `403`: the account is unavailable or the credential lacks the route's scope. Do not broaden permissions without the user's explicit approval.
- `409`: no credit was consumed. A retry is permitted after a short jittered delay.
- `429`: no credit was consumed. Honor `Retry-After`; otherwise use exponential backoff with jitter.
- `502`, `503`, or `500`: any reserved credit is restored. Honor `Retry-After` when provided. Limit retries and explain persistent failure.

The CLI never retries automatically. This makes retry decisions visible and avoids duplicating a metered call after an ambiguous network failure.

## Billing

Pack discovery is public and free. Prices exclude applicable tax.

Only create a checkout after the user explicitly selects a current `packId` and asks to continue. The credential must include the separately approved `checkout` scope. Then run:

```bash
npx --yes github:hesselbom/aso-skill-cli#v0.1.0 checkout <pack-id> --confirm-checkout
```

Return the short-lived Polar URL as an action the account owner must complete. Do not claim a purchase succeeded until the user completes checkout and `credits` shows the new balance. Never automatically repeat checkout creation. If the API returns `legal_acceptance_required`, direct the user to <https://www.asoskill.com/accept-terms>.

When the user asks to disconnect the agent, run `logout`. It revokes the current key before removing it locally; cached authorization can take up to five minutes to expire.
