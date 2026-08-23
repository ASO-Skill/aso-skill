import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildRequest, callApi, parseCliArgs } from "../scripts/aso-skill.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("builds a normalized search request", () => {
  const parsed = parseCliArgs(["search", "--term", " workout planner ", "--storefront", "se"]);
  assert.deepEqual(buildRequest(parsed.command, parsed.options), {
    method: "POST",
    path: "/v1/search",
    body: { term: "workout planner", storefront: "SE", platform: "iphone" },
    requiresAuth: true,
    metered: true,
  });
});

test("deduplicates app IDs into one lookup batch", () => {
  const parsed = parseCliArgs([
    "lookup",
    "--app-id=123456789",
    "--app-id",
    "123456789",
    "--app-id",
    "987654321",
    "--platform",
    "ipad",
  ]);
  assert.deepEqual(buildRequest(parsed.command, parsed.options).body, {
    appIds: ["123456789", "987654321"],
    storefront: "US",
    platform: "ipad",
  });
});

test("rejects invalid inputs before making a request", () => {
  assert.throws(() => buildRequest("search", { term: "test", storefront: "USA" }), /two-letter/);
  assert.throws(() => buildRequest("popularity", { term: "test", platform: "iphone" }), /not valid/);
  assert.throws(() => buildRequest("lookup", { "app-id": ["abc"] }), /digits only/);
});

test("requires explicit checkout confirmation", () => {
  assert.throws(() => buildRequest("checkout", { "pack-id": "credits_1000" }), /--confirm-checkout/);
  assert.deepEqual(
    buildRequest("checkout", { "pack-id": "credits_1000", "confirm-checkout": true }).body,
    { packId: "credits_1000" },
  );
});

test("does not send authentication to public endpoints", async () => {
  let captured;
  const result = await callApi(buildRequest("packs"), {
    apiKey: "must-not-be-sent",
    fetchImpl: async (url, init) => {
      captured = { url: url.toString(), init };
      return new Response(JSON.stringify({ billingEnabled: false, packs: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.equal(captured.url, "https://api.asoskill.com/v1/billing/packs");
  assert.equal(captured.init.headers.Authorization, undefined);
  assert.equal(result.billingEnabled, false);
});

test("sends authenticated JSON requests without putting the key in the URL", async () => {
  let captured;
  const request = buildRequest("popularity", { term: "habit tracker", storefront: "US" });
  await callApi(request, {
    apiKey: "test-secret",
    fetchImpl: async (url, init) => {
      captured = { url: url.toString(), init };
      return new Response(JSON.stringify({ score: 50 }), { status: 200 });
    },
  });
  assert.equal(captured.url, "https://api.asoskill.com/v1/popularity");
  assert.equal(captured.init.headers.Authorization, "Bearer test-secret");
  assert.equal(captured.init.body, JSON.stringify(request.body));
  assert.doesNotMatch(captured.url, /test-secret/);
});

test("warns against automatic retry after an ambiguous metered failure", async () => {
  const request = buildRequest("search", { term: "habit tracker" });
  await assert.rejects(
    callApi(request, {
      apiKey: "test-secret",
      fetchImpl: async () => {
        throw new Error("connection reset");
      },
    }),
    /outcome is unknown; do not retry automatically/,
  );
});

test("skill metadata matches the repository and contains no scaffold placeholders", async () => {
  const skill = await readFile(join(root, "SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: aso-skill\n/);
  assert.match(skill, /description: .+\nlicense: MIT\n/);
  assert.doesNotMatch(skill, /\bTODO\b|\[TODO/);
  assert.ok(skill.split("\n").length < 500);

  const apiReference = await readFile(join(root, "references", "api.md"), "utf8");
  assert.match(apiReference, /https:\/\/www\.asoskill\.com\/openapi\.yaml/);

  const openai = await readFile(join(root, "agents", "openai.yaml"), "utf8");
  assert.match(openai, /\$aso-skill/);
});
