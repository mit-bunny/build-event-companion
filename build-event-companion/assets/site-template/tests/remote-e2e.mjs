import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const suppliedUrl = process.argv.find((argument) => argument.startsWith("http"));
const baseUrl = suppliedUrl || "http://127.0.0.1:4174";
const eventData = JSON.parse(await readFile(path.join(root, "src", "event.json"), "utf8"));
const modules = (eventData.modules || []).filter((module) => module.enabled !== false);
const lineup = modules.find((module) => module.type === "lineup");
const timer = modules.find((module) => module.type === "timer");

if (!eventData.remoteControl?.enabled || !lineup || !timer) {
  throw new Error("Remote E2E requires an enabled remote, lineup module, and timer module.");
}

let preview;
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview did not become ready at ${baseUrl}`);
}

async function waitForText(locator, expected, timeout = 7000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if ((await locator.textContent())?.includes(expected)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Expected "${expected}" in ${await locator.textContent()}`);
}

try {
  if (!suppliedUrl) {
    const vite = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite");
    preview = spawn(vite, ["preview", "--host", "127.0.0.1", "--port", "4174", "--strictPort"], {
      cwd: root,
      stdio: "ignore",
    });
  }
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const remote = await context.newPage();
  const display = await context.newPage();

  await remote.goto(`${baseUrl}/remote`, { waitUntil: "networkidle" });
  const code = (await remote.locator(".remote-code").textContent())?.trim();
  assert.match(code || "", /^\d{6}$/);

  await display.goto(baseUrl, { waitUntil: "networkidle" });
  await display.getByRole("button", { name: "Phone remote" }).click();
  await display.getByLabel("Six-digit remote code").fill(code);
  await display.getByRole("button", { name: "Connect", exact: true }).click();
  await waitForText(remote.locator(".phone-remote section").first(), "Connected to display");
  await waitForText(display.locator(".display-remote"), "Remote connected");

  await remote.getByRole("button", { name: lineup.label, exact: true }).click();
  await waitForText(display.locator(".module-heading h2"), lineup.label);
  const hostCount = lineup.content?.hosts?.length || 0;
  const before = await display.locator(".run-presenter .run-by").allTextContents();
  assert.equal(before.length, hostCount + (lineup.content?.presenters?.length || 0));
  let after = before;
  for (let attempt = 0; attempt < 6 && after.slice(hostCount).join("|") === before.slice(hostCount).join("|"); attempt += 1) {
    await remote.getByRole("button", { name: "Randomize presenters", exact: true }).click();
    await display.waitForTimeout(100);
    after = await display.locator(".run-presenter .run-by").allTextContents();
  }
  assert.deepEqual(after.slice(0, hostCount), before.slice(0, hostCount), "Hosts must stay fixed.");
  assert.notEqual(after.slice(hostCount).join("|"), before.slice(hostCount).join("|"), "Presenters should shuffle.");

  await remote.getByRole("button", { name: timer.label, exact: true }).click();
  await waitForText(display.locator(".module-heading h2"), timer.label);
  await display.clock.install();
  const clock = display.locator(".run-timer > strong");
  const initial = await clock.textContent();
  await remote.getByRole("button", { name: "Start", exact: true }).click();
  await display.getByRole("button", { name: "Pause", exact: true }).waitFor();
  await display.clock.runFor(1000);
  await remote.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await clock.textContent();
  assert.notEqual(paused, initial, "Timer should count down after starting.");
  await display.clock.runFor(2000);
  assert.equal(await clock.textContent(), paused, "Timer should stop while paused.");
  await remote.getByRole("button", { name: "Reset", exact: true }).click();
  await waitForText(clock, initial);

  const segments = timer.settings?.segments || [];
  await remote.getByRole("button", { name: "Start", exact: true }).click();
  await display.clock.runFor(segments[0].seconds * 1000);
  await waitForText(display.locator(".run-timer .eyebrow"), segments[1].label);
  await display.clock.runFor(segments[1].seconds * 1000);
  await display.locator(".run-timer.is-alarm").waitFor();
  await remote.getByRole("button", { name: "Stop alarm", exact: true }).click();
  await display.locator(".run-timer.is-alarm").waitFor({ state: "detached" });
  await context.close();
  console.log("Remote E2E passed: pairing, navigation, host-safe shuffle, timer controls, segment transition, and final alarm.");
} finally {
  await browser?.close();
  preview?.kill("SIGTERM");
}
