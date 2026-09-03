#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, publicEventPackage, writeJson } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.event || !args.output) {
  console.error("Usage: node scripts/build-event-site.mjs --event <event.private.json> --output <new-directory>");
  process.exit(2);
}

const output = path.resolve(args.output);
try {
  await fs.access(output);
  throw new Error(`Output already exists: ${output}. Choose a new directory to avoid overwriting work.`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const skillDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const template = path.join(skillDir, "assets", "site-template");
const eventPackage = JSON.parse(await fs.readFile(path.resolve(args.event), "utf8"));
await fs.cp(template, output, { recursive: true });
await writeJson(path.join(output, "src", "event.json"), publicEventPackage(eventPackage));
console.log(`Created event site at ${output}.`);
console.log("Next: npm install, npm run build, preview, then choose a deployment adapter.");
