import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("validator rejects malformed timer and room module settings without crashing", async (context) => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "event-validator-"));
  context.after(() => fs.rm(temporary, { recursive: true, force: true }));
  const input = path.join(temporary, "event.private.json");
  await fs.writeFile(input, JSON.stringify({
    schemaVersion: 1,
    event: { id: "event", title: "Event" },
    attendees: [{ id: "guest", name: "Guest" }],
    modules: [
      { id: "timer", type: "timer", label: "Timer", settings: { segments: { label: "Demo", seconds: 0 } } },
      { id: "room", type: "room", label: "Room", content: { total: 1, categories: {} } },
    ],
  }));
  const result = spawnSync(process.execPath, ["scripts/validate-event.mjs", input], { cwd: path.resolve("."), encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /settings\.segments must be a non-empty array/);
  assert.match(result.stderr, /content\.categories must be an array/);
  assert.doesNotMatch(result.stderr, /TypeError/);
});
