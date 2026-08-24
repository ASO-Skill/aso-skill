import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("skill metadata and browser-auth instructions are complete", async () => {
  const skill = await readFile(join(root, "SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: aso-skill\n/);
  assert.match(skill, /description: .+\nlicense: MIT\n/);
  assert.match(skill, /github:aso-skill\/cli#v0\.1\.2 login/);
  assert.match(skill, /verifies that the selected store is writable/);
  assert.match(skill, /operating-system credential store/);
  assert.match(skill, /Do not ask the user to paste a key or create `\.env`/);
  assert.doesNotMatch(skill, /scripts\/aso-skill\.mjs|\bTODO\b|\[TODO/);
  assert.ok(skill.split("\n").length < 500);

  const apiReference = await readFile(join(root, "references", "api.md"), "utf8");
  assert.match(apiReference, /`POST \/v1\/auth\/device`/);
  assert.match(apiReference, /https:\/\/www\.asoskill\.com\/openapi\.yaml/);

  const openai = await readFile(join(root, "agents", "openai.yaml"), "utf8");
  assert.match(openai, /\$aso-skill/);
});
