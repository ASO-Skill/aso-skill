# ASO Skill MCP reference

Production MCP endpoint: <https://api.asoskill.com/mcp>

The server uses OAuth authorization code with S256 PKCE, dynamic client registration, short-lived access tokens, rotating refresh tokens, and revocable connections. The default scopes are `data` and `credits`.

Search accepts a 1–100 character term, two-letter storefront, and one of `iphone`, `ipad`, `mac`, `appletv`, `watch`, or `vision`. Popularity accepts a term and storefront. App lookup accepts 1–10 numeric IDs, storefront, and platform.

Successful data responses include current data, cache state, fetch time, and a request ID. Search and app lookup are platform-specific. Popularity is storefront-specific and its source is `monthly`, `direct`, `related`, or `fallback`.

Data calls cost one credit on success. Validation and upstream failures do not consume a credit. Retryable MCP errors include the required delay and explicitly confirm the refund. Search is fresh for one hour and its stale fallback is capped at 24 hours; optional app-summary enrichment is cached for eight hours and may be omitted during throttling. Pack discovery and balance reads are free. MCP deliberately does not expose checkout: payment remains an explicit human action on the ASO Skill website.

The canonical public contract is <https://www.asoskill.com/openapi.yaml> and product guidance is at <https://www.asoskill.com/mcp>.
