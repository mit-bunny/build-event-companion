import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("generator creates a public site without private attendee data", async (context) => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "event-companion-"));
  context.after(() => fs.rm(temporary, { recursive: true, force: true }));
  const output = path.join(temporary, "site");
  const result = spawnSync(process.execPath, [
    "scripts/build-event-site.mjs",
    "--event",
    "examples/sample-event.json",
    "--output",
    output,
  ], { cwd: path.resolve("."), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const publicData = JSON.parse(await fs.readFile(path.join(output, "src", "event.json"), "utf8"));
  assert.equal(publicData.attendees.length, 8);
  assert.equal(publicData.attendees.some((attendee) => attendee.email || attendee.answers || attendee.source), false);
  assert.deepEqual(publicData.modules.find((module) => module.type === "timer").settings.segments.map((segment) => segment.seconds), [300, 180]);
  assert.equal(await fs.readFile(path.join(output, "src", "App.jsx"), "utf8").then((text) => text.includes("Introduction")), true);
  assert.equal(await fs.readFile(path.join(output, "src", "RunOfShow.jsx"), "utf8").then((text) => text.includes("settings.segments")), true);
  assert.equal(await fs.readFile(path.join(output, "src", "RunOfShow.jsx"), "utf8").then((text) => text.includes("--lineup-columns")), true);
  assert.equal(await fs.readFile(path.join(output, "src", "styles.css"), "utf8").then((text) => text.includes("Projector mode")), true);
  assert.equal(await fs.readFile(path.join(output, "scripts", "audit-layout.mjs"), "utf8").then((text) => text.includes("1280")), true);
  assert.equal(JSON.parse(await fs.readFile(path.join(output, "package.json"), "utf8")).scripts["audit:layout"].includes("audit-layout.mjs"), true);
  assert.equal(JSON.parse(await fs.readFile(path.join(output, "package.json"), "utf8")).scripts["test:remote"].includes("remote-e2e.mjs"), true);
  assert.equal(await fs.readFile(path.join(output, "tests", "remote-e2e.mjs"), "utf8").then((text) => text.includes("Hosts must stay fixed")), true);
  assert.equal(await fs.readFile(path.join(output, "src", "RemoteControl.jsx"), "utf8").then((text) => text.includes("Enter the six-digit phone code")), true);
  assert.equal(await fs.readFile(path.join(output, ".env.example"), "utf8").then((text) => text.includes("VITE_SUPABASE_PUBLISHABLE_KEY")), true);
  const vercel = JSON.parse(await fs.readFile(path.join(output, "vercel.json"), "utf8"));
  assert.deepEqual(vercel.rewrites, [{ source: "/remote", destination: "/index.html" }]);
});
