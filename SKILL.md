---
name: aso-skill
description: Query ASO Skill for current Apple App Store search rankings, keyword difficulty and popularity, app metadata, credit balances, and credit-pack checkout discovery. Use for live App Store keyword or competitor research through ASO Skill. Do not use for Android data, download or revenue estimates, historical rankings, or predictions of future ranking performance.
license: MIT
metadata:
  author: ASO Skill
  version: "1.0.0"
---

# Use ASO Skill

Use the bundled client to retrieve current Apple App Store keyword and app data. ASO Skill is independent of Apple.

## Boundaries

- Use this skill for current App Store search results, keyword difficulty (0–100), keyword popularity (1–100), or metadata for known App Store IDs.
- Do not claim that the API supplies Android data, downloads, revenue, historical keyword rankings, or future ranking outcomes.
- A successful `search`, `popularity`, or `lookup` request costs one credit, including a cache hit. `credits`, `packs`, `health`, and `discover` are free.
- Treat `ASO_SKILL_API_KEY` as a secret. Never print it, place it in a URL or command argument, commit it, or include it in a response. The client reads it only from the environment.
- Use only the calls needed for the user's request. Batch as many as 10 App Store IDs into one `lookup` call.
- Do not automatically retry a network failure whose HTTP outcome is unknown: a successful first request may already have consumed a credit.

## Choose calls

| User need | Calls | Cost on success |
| --- | --- | --- |
| Current ranking results and difficulty | `search` | 1 credit |
| Keyword popularity | `popularity` | 1 credit |
| Keyword opportunity using both measures | `search` + `popularity` | 2 credits |
| Metadata for 1–10 known app IDs | one batched `lookup` | 1 credit |
| Search competitors, then inspect up to 10 | `search` + one batched `lookup` | 2 credits |
| Remaining balance | `credits` | Free |
| Available packs | `packs` | Free |

If the user did not specify a storefront or platform, infer them from context. Otherwise use `US` and `iphone`, and state that assumption. Storefronts are two-letter country codes. Search and lookup platforms are `iphone`, `ipad`, `mac`, `appletv`, `watch`, and `vision`; popularity has no platform parameter.

## Authenticate

For authenticated calls, first confirm that `ASO_SKILL_API_KEY` exists without displaying its value. If it is absent, direct the user to <https://www.asoskill.com/dashboard> to create a named key, then ask them to store it in their environment or secret manager. Do not ask them to paste it into chat.

## Run the client

Resolve `scripts/aso-skill.mjs` relative to this `SKILL.md`, then run it with Node.js. Do not copy the script into the user's project.

```bash
node <skill-directory>/scripts/aso-skill.mjs search --term "workout planner" --storefront US --platform iphone
node <skill-directory>/scripts/aso-skill.mjs popularity --term "workout planner" --storefront US
node <skill-directory>/scripts/aso-skill.mjs lookup --app-id 123456789 --app-id 987654321 --storefront US --platform iphone
node <skill-directory>/scripts/aso-skill.mjs credits
node <skill-directory>/scripts/aso-skill.mjs packs
```

Use `node <skill-directory>/scripts/aso-skill.mjs --help` for the complete command syntax.

For durable integrations, unusual response fields, or schema questions, read [references/api.md](references/api.md) and then consult the canonical live contract at <https://www.asoskill.com/openapi.yaml>.

## Interpret results

- Report the storefront, platform when applicable, observation time from `fetchedAt`, and whether `cache` is `hit`, `refresh`, or `stale` when freshness matters.
- Preserve the API's distinction between difficulty and popularity. Do not combine them into a proprietary score unless the user asks for an explicitly labeled heuristic.
- For search results, distinguish rank `position` from optional category rank.
- For app lookup, report `missingAppIds` instead of silently dropping requested IDs.
- Popularity `source` can be `monthly`, `direct`, `related`, or `fallback`. Identify the source when it materially affects the user's interpretation; avoid overstating precision, especially for a fallback.
- Keep `requestId` available for troubleshooting, but omit it from ordinary prose unless useful.

## Handle failures

- `400`: fix the request; no credit was consumed.
- `401`: the key is missing, invalid, expired, or revoked. Do not display the key. Revocation may take up to five minutes to propagate.
- `402`: no credits remain. Call `packs` for free and present the available choices.
- `409`: no credit was consumed. A retry is permitted after a short jittered delay.
- `429`: no credit was consumed. Honor `Retry-After`; otherwise use exponential backoff with jitter.
- `502`, `503`, or `500`: any reserved credit is restored. Honor `Retry-After` when provided. Limit retries and explain persistent failure.

The client never retries automatically. This makes retry decisions visible and avoids duplicating a metered call after an ambiguous network failure.

## Billing

Pack discovery is public and free. Prices exclude applicable tax.

Only create a checkout after the user explicitly selects a current `packId` and asks to continue. Then run:

```bash
node <skill-directory>/scripts/aso-skill.mjs checkout --pack-id <pack-id> --confirm-checkout
```

Return the short-lived Polar URL as an action the account owner must complete. Do not claim a purchase succeeded until the user completes checkout and `credits` shows the new balance. Never automatically repeat checkout creation. If the API returns `legal_acceptance_required`, direct the user to <https://www.asoskill.com/accept-terms>.
