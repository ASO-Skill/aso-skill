# ASO Skill public API reference

This is a compact working reference for API v1. The canonical live OpenAPI 3.1 contract at <https://www.asoskill.com/openapi.yaml> wins if it differs from this file. The production base URL is `https://api.asoskill.com`.

## Authentication and charging

Agent tools should start browser-assisted login with `POST /v1/auth/device`, open the returned verification URL, and poll `POST /v1/auth/device/token`. The account owner signs in and approves the requested scopes. The token response carries the API key in a verifier-encrypted envelope; the official CLI decrypts it and saves it in the operating-system credential store without printing it. `ASO_SKILL_API_KEY` is an explicit override for CI secret injection, not the interactive default.

Send the resulting long-lived API key as `Authorization: Bearer <key>`. Never put it in client-side browser code, URLs, logs, repositories, `.env` created through an agent conversation, or conversations.

| Endpoint | Auth | Credits on success |
| --- | --- | --- |
| `GET /` | No | 0 |
| `GET /health` | No | 0 |
| `POST /v1/auth/device` | No | 0 |
| `POST /v1/auth/device/token` | Device code + verifier | 0 |
| `DELETE /v1/auth/credential` | API key | 0 |
| `POST /v1/search` | API key | 1 |
| `POST /v1/popularity` | API key | 1 |
| `POST /v1/apps/lookup` | API key | 1 for the whole 1–10 app batch |
| `GET /v1/credits` | API key | 0 |
| `GET /v1/billing/packs` | No | 0 |
| `POST /v1/billing/checkout` | API key | 0 |

Validation errors and failed upstream calls do not consume a credit. Search data is fresh for one hour; popularity and app lookup data are fresh for eight hours. Inspect `cache` and `fetchedAt` on data responses.

Agent credentials support `data`, `credits`, and `checkout` scopes. Default to `data` and `credits`; request `checkout` only with explicit user intent. An authorization request expires after ten minutes. Self-revocation can take up to five minutes to propagate through the authorizer cache.

## Requests

### Search

`POST /v1/search`

```json
{
  "term": "workout planner",
  "storefront": "US",
  "platform": "iphone"
}
```

- `term`: required, 1–100 characters.
- `storefront`: optional two-letter country code, default `US`, normalized to uppercase.
- `platform`: optional; `iphone`, `ipad`, `mac`, `appletv`, `watch`, or `vision`. Default `iphone`.

The response contains the normalized request, `difficulty` from 0–100, `resultCount`, ordered `results`, `cache`, `fetchedAt`, and `requestId`. Each result always has `position`, `appId`, and `name`; it can also include subtitle, developer, rating, rating count, category information, URL, and icon.

### Popularity

`POST /v1/popularity`

```json
{
  "term": "workout planner",
  "storefront": "US"
}
```

The response contains `score` from 1–100 and `source`, which is one of `monthly`, `direct`, `related`, or `fallback`, plus freshness and request metadata. Popularity is storefront-specific and does not accept a platform.

### App lookup

`POST /v1/apps/lookup`

```json
{
  "appIds": ["123456789", "987654321"],
  "storefront": "US",
  "platform": "iphone"
}
```

- Supply 1–10 unique, numeric App Store IDs.
- Storefront and platform use the same rules as search.
- Batch IDs whenever possible: the complete request costs one credit.

The response contains `apps`, `missingAppIds`, `cache`, `fetchedAt`, and `requestId`. App details include name, subtitle, developer, icon, categories, rating distribution, optional category ranking, current version, version history, screenshots, description, and whether the app is paid.

### Credits

`GET /v1/credits` returns paid, promotional, and daily-free buckets; total available credits; credits used; and the daily-free reset time. Production may have no daily-free credits.

### Billing packs and checkout

`GET /v1/billing/packs` returns `billingEnabled`, current packs, and checkout discovery. Each pack has a stable `packId`, credit quantity, price in minor currency units, lowercase currency, and tax behavior. `pricesIncludeTax` is false in v1.

After the account owner explicitly chooses a current pack, `POST /v1/billing/checkout` accepts:

```json
{ "packId": "credits_1000" }
```

The response has `status: "action_required"` and an action with `type: "open_url"`, a short-lived Polar Checkout URL, expiry time, and message. Creating the URL does not complete a purchase. The human completes payment at Polar; only a later credit balance confirms that credits were granted.

## Errors and retries

Errors normally have `error.code`, `error.message`, and sometimes `error.retryAfterSeconds` or a next action. Branch on the stable code rather than parsing the message.

| HTTP | Meaning | Retry guidance |
| --- | --- | --- |
| `400` | Invalid request | Correct it; do not retry unchanged. |
| `401` | Missing, invalid, expired, or revoked key | Fix authentication. |
| `402` | Insufficient credits | Discover packs; do not loop on the data call. |
| `403` | Account unavailable | Ask the account owner to resolve account status. |
| `409` | Concurrent credit reservation conflict | Short jittered retry is allowed. |
| `428` | Legal acceptance required for checkout | Have the account owner review and accept terms. |
| `429` | Rate limited | Honor `Retry-After`, otherwise exponential backoff with jitter. |
| `502` | Upstream App Store failure | Reserved credit is restored; retry sparingly. |
| `503` | Temporarily unavailable | Honor `Retry-After`; reserved credit is restored. |
| `500` | Unexpected failure | Reserved credit is restored; retry sparingly. |

Do not retry a metered request after a connection drop or timeout when the HTTP outcome is unknown without telling the user that the first attempt may already have succeeded and consumed a credit. Never automatically retry checkout creation.

## Versioning

Major versions are part of the path. Compatible additions may appear within v1; breaking replacements use a new major path such as `/v2/`. When practical, deprecated routes remain for at least six months and return standard deprecation and sunset headers.

Public resources:

- Developer guide: <https://www.asoskill.com/developers>
- OpenAPI: <https://www.asoskill.com/openapi.yaml>
- AI guidance: <https://www.asoskill.com/ai-info>
- Pricing: <https://www.asoskill.com/pricing>
- Health: <https://api.asoskill.com/health>
