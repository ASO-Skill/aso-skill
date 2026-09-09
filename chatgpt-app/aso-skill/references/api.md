# ASO Skill MCP reference

Production OpenAI MCP endpoint: <https://api.asoskill.com/mcp/openai>

The server uses OAuth authorization code with S256 PKCE, dynamic client registration, short-lived access tokens, rotating refresh tokens, and revocable connections. The default scopes are `data` and `credits`.

Search and autocomplete accept a 1–100 character term, two-letter storefront, and one of `iphone`, `ipad`, `mac`, `appletv`, `watch`, or `vision`. Popularity accepts a term and storefront. App lookup accepts 1–10 numeric IDs, storefront, and platform.

Successful data responses include current data, cache state, and fetch time. Search, autocomplete, and app lookup are platform-specific. Popularity is storefront-specific and its source is `monthly`, `direct`, `related`, `autocomplete`, or `fallback`. `autocomplete` is a conservative 6–10 estimate for a censored low-volume term and never lowers a stronger score.

Data calls consume one existing account credit on success. Validation and upstream failures do not consume a credit. Retryable MCP errors include the required delay and explicitly confirm the refund. Search is fresh for one hour and its stale fallback is capped at 24 hours; autocomplete is fresh for 30 days per storefront and platform; optional app-summary enrichment is cached for eight hours and may be omitted during throttling. Balance reads are free. If no credits are available, explain that the feature is unavailable and stop.
