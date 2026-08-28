---
name: aso-skill
description: Query ASO Skill for current Apple App Store search rankings, keyword difficulty and popularity, app metadata, and the connected account's available credit balance. Use for live App Store keyword or competitor research. Do not use for Android data, download or revenue estimates, historical rankings, or predictions.
license: MIT
metadata:
  author: ASO Skill
  version: "1.7.0"
---

# Use ASO Skill

Use the connected ASO Skill MCP tools for current Apple App Store research. ASO Skill is independent of Apple.

## Boundaries

- Use current App Store search results, keyword difficulty (0–100), keyword popularity (1–100), and metadata for known App Store IDs.
- Do not claim Android data, downloads, revenue, historical rankings, or future ranking outcomes.
- Successful search, popularity, and app lookup calls consume one credit already available in the connected account. Balance checks are free.
- Minimize credit-consuming calls and batch up to 10 app IDs in one lookup.
- Never request or expose API keys. The MCP client handles OAuth.

## Choose tools

- `search_app_store`: current ranked results and keyword difficulty; one credit.
- `get_keyword_popularity`: current keyword popularity and source; one credit.
- `lookup_app_store_apps`: metadata for 1–10 numeric app IDs; one credit per batch.
- `get_credit_balance`: available and used credits; free.

If storefront or platform is absent, infer it from context or default to `US` and `iphone`, and state the assumption. Popularity has no platform parameter.

## Interpret results

- Report storefront, platform when relevant, `fetchedAt`, and cache state when freshness matters.
- Search is fresh for one hour; a `stale` search fallback is never older than 24 hours. Optional result fields may be absent when app-summary enrichment is throttled.
- Keep difficulty and popularity distinct unless the user asks for a labeled heuristic.
- Report missing app IDs instead of silently omitting them.
- Identify popularity source when material, especially a fallback.

## Handle failures

- Fix invalid requests instead of retrying them.
- If the account has insufficient credits, explain that the requested feature is unavailable and stop.
- Honor `Retry-After` for throttling or temporary failures.
- Do not automatically retry an ambiguous network failure because a successful first call may have consumed a credit.

Read [references/api.md](references/api.md) for response and retry details.
