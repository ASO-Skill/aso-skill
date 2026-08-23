#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const API_BASE_URL = "https://api.asoskill.com";
const PLATFORMS = new Set(["iphone", "ipad", "mac", "appletv", "watch", "vision"]);
const AUTHENTICATED_COMMANDS = new Set(["search", "popularity", "lookup", "credits", "checkout"]);
const METERED_COMMANDS = new Set(["search", "popularity", "lookup"]);

class UsageError extends Error {}

const usage = `ASO Skill API client

Usage:
  aso-skill.mjs health
  aso-skill.mjs discover
  aso-skill.mjs search --term <text> [--storefront US] [--platform iphone]
  aso-skill.mjs popularity --term <text> [--storefront US]
  aso-skill.mjs lookup --app-id <id> [--app-id <id> ...] [--storefront US] [--platform iphone]
  aso-skill.mjs credits
  aso-skill.mjs packs
  aso-skill.mjs checkout --pack-id <id> --confirm-checkout

Authenticated commands read ASO_SKILL_API_KEY from the environment.
Successful search, popularity, and lookup calls cost one credit each.
The client does not retry requests automatically.`;

const optionNames = new Set([
  "term",
  "storefront",
  "platform",
  "app-id",
  "pack-id",
  "confirm-checkout",
]);

const commandOptions = {
  health: new Set(),
  discover: new Set(),
  search: new Set(["term", "storefront", "platform"]),
  popularity: new Set(["term", "storefront"]),
  lookup: new Set(["app-id", "storefront", "platform"]),
  credits: new Set(),
  packs: new Set(),
  checkout: new Set(["pack-id", "confirm-checkout"]),
};

export function parseCliArgs(argv) {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    return { help: true };
  }

  const [command, ...tokens] = argv;
  if (!Object.hasOwn(commandOptions, command)) {
    throw new UsageError(`Unknown command: ${command}`);
  }

  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--help" || token === "-h") return { help: true };
    if (!token.startsWith("--")) throw new UsageError(`Unexpected argument: ${token}`);

    const separator = token.indexOf("=");
    const key = token.slice(2, separator === -1 ? undefined : separator);
    if (!optionNames.has(key)) throw new UsageError(`Unknown option: --${key}`);

    if (key === "confirm-checkout") {
      if (separator !== -1) throw new UsageError("--confirm-checkout does not accept a value");
      options[key] = true;
      continue;
    }

    let value;
    if (separator !== -1) {
      value = token.slice(separator + 1);
    } else {
      value = tokens[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new UsageError(`Missing value for --${key}`);
      }
      index += 1;
    }

    if (key === "app-id") {
      options[key] ??= [];
      options[key].push(value);
    } else {
      if (Object.hasOwn(options, key)) throw new UsageError(`Option --${key} may be supplied only once`);
      options[key] = value;
    }
  }

  return { command, options };
}

function validateOptions(command, options) {
  const allowed = commandOptions[command];
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) throw new UsageError(`Option --${key} is not valid for ${command}`);
  }
}

function termFrom(options) {
  const term = options.term?.trim();
  if (!term) throw new UsageError("--term is required");
  if (term.length > 100) throw new UsageError("--term must be at most 100 characters");
  return term;
}

function storefrontFrom(options) {
  const storefront = (options.storefront ?? "US").toUpperCase();
  if (!/^[A-Z]{2}$/.test(storefront)) {
    throw new UsageError("--storefront must be a two-letter country code");
  }
  return storefront;
}

function platformFrom(options) {
  const platform = options.platform ?? "iphone";
  if (!PLATFORMS.has(platform)) {
    throw new UsageError(`--platform must be one of: ${[...PLATFORMS].join(", ")}`);
  }
  return platform;
}

export function buildRequest(command, options = {}) {
  if (!Object.hasOwn(commandOptions, command)) throw new UsageError(`Unknown command: ${command}`);
  validateOptions(command, options);

  let method = "GET";
  let path;
  let body;

  switch (command) {
    case "health":
      path = "/health";
      break;
    case "discover":
      path = "/";
      break;
    case "search":
      method = "POST";
      path = "/v1/search";
      body = {
        term: termFrom(options),
        storefront: storefrontFrom(options),
        platform: platformFrom(options),
      };
      break;
    case "popularity":
      method = "POST";
      path = "/v1/popularity";
      body = { term: termFrom(options), storefront: storefrontFrom(options) };
      break;
    case "lookup": {
      method = "POST";
      path = "/v1/apps/lookup";
      const appIds = [...new Set(options["app-id"] ?? [])];
      if (appIds.length === 0) throw new UsageError("Supply at least one --app-id");
      if (appIds.length > 10) throw new UsageError("Supply no more than 10 unique --app-id values");
      if (appIds.some((id) => !/^\d+$/.test(id))) {
        throw new UsageError("Every --app-id must contain digits only");
      }
      body = { appIds, storefront: storefrontFrom(options), platform: platformFrom(options) };
      break;
    }
    case "credits":
      path = "/v1/credits";
      break;
    case "packs":
      path = "/v1/billing/packs";
      break;
    case "checkout":
      method = "POST";
      path = "/v1/billing/checkout";
      if (!options["confirm-checkout"]) {
        throw new UsageError("Checkout requires --confirm-checkout after the user explicitly selects a pack");
      }
      if (!/^[a-z][a-z0-9_]{2,63}$/.test(options["pack-id"] ?? "")) {
        throw new UsageError("--pack-id is required and must be a current pack ID returned by packs");
      }
      body = { packId: options["pack-id"] };
      break;
  }

  return {
    method,
    path,
    body,
    requiresAuth: AUTHENTICATED_COMMANDS.has(command),
    metered: METERED_COMMANDS.has(command),
  };
}

export async function callApi(request, { apiKey = process.env.ASO_SKILL_API_KEY, fetchImpl = fetch } = {}) {
  if (request.requiresAuth && !apiKey) {
    throw new UsageError(
      "ASO_SKILL_API_KEY is not set. Create a key at https://www.asoskill.com/dashboard and store it securely in the environment.",
    );
  }

  const headers = { Accept: "application/json" };
  if (request.requiresAuth) headers.Authorization = `Bearer ${apiKey}`;
  if (request.body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetchImpl(new URL(request.path, API_BASE_URL), {
      method: request.method,
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: AbortSignal.timeout(35_000),
    });
  } catch (error) {
    const suffix = request.metered
      ? " The request outcome is unknown; do not retry automatically because the first attempt may have consumed a credit."
      : "";
    throw new Error(`Unable to reach ASO Skill: ${error instanceof Error ? error.message : String(error)}.${suffix}`);
  }

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text || "The API returned an empty response" };
  }

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const error = new Error(payload?.error?.message ?? payload?.message ?? `ASO Skill returned HTTP ${response.status}`);
    error.details = {
      status: response.status,
      ...(retryAfter ? { retryAfter } : {}),
      ...payload,
    };
    throw error;
  }

  return payload;
}

async function main() {
  try {
    const parsed = parseCliArgs(process.argv.slice(2));
    if (parsed.help) {
      process.stdout.write(`${usage}\n`);
      return;
    }
    const request = buildRequest(parsed.command, parsed.options);
    const result = await callApi(request);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    const details = error?.details ?? { error: { message: error instanceof Error ? error.message : String(error) } };
    process.stderr.write(`${JSON.stringify(details, null, 2)}\n`);
    if (error instanceof UsageError) process.stderr.write(`\n${usage}\n`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
