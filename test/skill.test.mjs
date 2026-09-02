import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("skill metadata and browser-auth instructions are complete", async () => {
  const skill = await readFile(join(root, "SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: aso-skill\n/);
  assert.match(skill, /description: .+\nlicense: MIT\n/);
  assert.match(skill, /@aso-skill\/cli@0\.1\.4 login/);
  assert.match(skill, /verifies that the selected store is writable/);
  assert.match(skill, /operating-system credential store/);
  assert.match(skill, /https:\/\/api\.asoskill\.com\/mcp/);
  assert.match(skill, /search_app_store/);
  assert.match(skill, /list_credit_packs/);
  assert.match(skill, /version: "1\.6\.1"/);
  assert.match(skill, /never older than 24 hours/);
  assert.match(skill, /Do not ask the user to paste a key or create `\.env`/);
  assert.doesNotMatch(skill, /scripts\/aso-skill\.mjs|\bTODO\b|\[TODO/);
  assert.ok(skill.split("\n").length < 500);

  const apiReference = await readFile(join(root, "references", "api.md"), "utf8");
  assert.match(apiReference, /`POST \/v1\/auth\/device`/);
  assert.match(apiReference, /https:\/\/www\.asoskill\.com\/openapi\.yaml/);

  const openai = await readFile(join(root, "agents", "openai.yaml"), "utf8");
  assert.match(openai, /\$aso-skill/);

  const plugin = JSON.parse(await readFile(join(root, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(plugin.name, "aso-skill");
  assert.equal(plugin.mcpServers, "./.mcp.json");
  const mcp = JSON.parse(await readFile(join(root, ".mcp.json"), "utf8"));
  assert.equal(mcp.mcpServers["aso-skill"].url, "https://api.asoskill.com/mcp");
});

test("portable Agent Plugin manifests use the hosted OAuth MCP server", async () => {
  const plugin = JSON.parse(await readFile(join(root, "plugin.json"), "utf8"));
  assert.equal(plugin.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  assert.equal(plugin.name, "aso-skill");
  assert.equal(plugin.version, "1.6.1");

  const mcp = JSON.parse(await readFile(join(root, "mcp.json"), "utf8"));
  assert.equal(mcp.$schema, "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json");
  assert.deepEqual(mcp.mcpServers["aso-skill"], {
    type: "streamable-http",
    url: "https://api.asoskill.com/mcp",
  });

  const portableSkill = await readFile(join(root, "skills", "aso-skill", "SKILL.md"), "utf8");
  assert.match(portableSkill, /^---\nname: aso-skill\n/);
  assert.match(portableSkill, /The MCP client handles OAuth/);
  assert.doesNotMatch(portableSkill, /ASO_SKILL_API_KEY|clientSecret|accessToken/);
});

test("registry and Gemini manifests expose only public connection metadata", async () => {
  const registry = JSON.parse(await readFile(join(root, "server.json"), "utf8"));
  assert.equal(registry.name, "com.asoskill/aso-skill");
  assert.deepEqual(registry.remotes, [{
    type: "streamable-http",
    url: "https://api.asoskill.com/mcp",
  }]);

  const gemini = JSON.parse(await readFile(join(root, "gemini-extension.json"), "utf8"));
  assert.equal(gemini.name, "aso-skill");
  assert.equal(gemini.mcpServers["aso-skill"].httpUrl, "https://api.asoskill.com/mcp");
  assert.deepEqual(gemini.mcpServers["aso-skill"].oauth, {
    enabled: true,
    scopes: ["data", "credits"],
  });
});

test("tracked text files contain no common secret material", async () => {
  const excluded = new Set([".git", "node_modules", "chatgpt-app", "test"]);
  const files = [];

  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (excluded.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (!entry.name.endsWith(".png")) files.push(path);
    }
  }

  await walk(root);
  const text = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(text, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
  assert.doesNotMatch(text, /\bAKIA[0-9A-Z]{16}\b/);
  assert.doesNotMatch(text, /\b(?:ghp|github_pat|sk_live|sk_test)_[A-Za-z0-9_-]{16,}\b/);
  assert.doesNotMatch(text, /\bBearer\s+[A-Za-z0-9._~-]{24,}\b/);
});
