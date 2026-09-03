import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const suppliedUrl = process.argv.find((argument) => argument.startsWith("http"));
const baseUrl = suppliedUrl || "http://127.0.0.1:4173";
const projectorTypes = new Set(["welcome", "room", "lineup", "timer"]);
const viewports = [
  { name: "720p", width: 1280, height: 720 },
  { name: "1080p", width: 1920, height: 1080 },
];

let preview;
if (!suppliedUrl) {
  const vite = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite");
  preview = spawn(vite, ["preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"], {
    cwd: root,
    stdio: "ignore",
  });
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview did not become ready at ${baseUrl}${lastError ? `: ${lastError.message}` : ""}`);
}

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "module";
let browser;
let failures = 0;

try {
  await waitForServer();
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    if (String(error.message).includes("Executable doesn't exist")) {
      throw new Error("Chromium is not installed. Run `npx playwright install chromium`, then rerun `npm run audit:layout`.");
    }
    throw error;
  }

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const buttons = page.locator("nav button[data-module-type]");
    const count = await buttons.count();

    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index);
      const type = await button.getAttribute("data-module-type");
      if (!projectorTypes.has(type)) continue;
      const label = (await button.innerText()).replace(/\s+/g, " ").trim();
      await button.click();
      await page.waitForTimeout(80);

      const metrics = await page.evaluate(() => {
        const active = document.querySelector(".run-welcome,.run-room,.run-lineup,.run-timer");
        const activeRect = active?.getBoundingClientRect();
        const critical = [...document.querySelectorAll("[data-critical-visible]")]
          .filter((element) => element.getClientRects().length > 0)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              text: element.textContent?.trim() || element.tagName,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left,
            };
          });
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
          activeBottom: activeRect?.bottom ?? 0,
          activeRight: activeRect?.right ?? 0,
          activeOverflowY: active ? active.scrollHeight - active.clientHeight : 0,
          activeOverflowX: active ? active.scrollWidth - active.clientWidth : 0,
          critical,
        };
      });

      const outOfBounds = metrics.critical.filter((item) => item.top < -1 || item.left < -1 || item.right > metrics.viewportWidth + 1 || item.bottom > metrics.viewportHeight + 1);
      const problems = [];
      if (metrics.documentHeight > metrics.viewportHeight + 1) problems.push(`document is ${metrics.documentHeight - metrics.viewportHeight}px too tall`);
      if (metrics.documentWidth > metrics.viewportWidth + 1) problems.push(`document is ${metrics.documentWidth - metrics.viewportWidth}px too wide`);
      if (metrics.activeBottom > metrics.viewportHeight + 1 || metrics.activeRight > metrics.viewportWidth + 1) problems.push("active module extends outside the viewport");
      if (metrics.activeOverflowY > 1 || metrics.activeOverflowX > 1) problems.push("active module clips its own content");
      if (outOfBounds.length) problems.push(`critical content is out of bounds: ${outOfBounds.map((item) => item.text).join(", ")}`);

      if (problems.length) {
        failures += 1;
        await mkdir(path.join(root, "layout-audit"), { recursive: true });
        const screenshot = path.join(root, "layout-audit", `${viewport.name}-${slug(type)}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        console.error(`FAIL ${viewport.name} · ${label}: ${problems.join("; ")} (${screenshot})`);
      } else {
        console.log(`PASS ${viewport.name} · ${label}`);
      }
    }
    await page.close();
  }
} finally {
  await browser?.close();
  preview?.kill("SIGTERM");
}

if (failures) {
  console.error(`Layout audit failed in ${failures} module/viewport combination(s).`);
  process.exitCode = 1;
} else {
  console.log("Layout audit passed for every projector module.");
}
