import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  cwd: root,
  encoding: "utf8",
});
const files = output.split("\0").filter(Boolean);
const binaryExtensions = new Set([".gif", ".ico", ".jpeg", ".jpg", ".png", ".webp", ".woff", ".woff2"]);
const failures = [];

const rules = [
  ["private key block", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["OpenAI-style secret key", /\bsk-[A-Za-z0-9_-]{20,}\b/g],
  ["GitHub token", /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/g],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{12,}\b/g],
  ["service-role credential", /(?:SUPABASE_SERVICE_ROLE|service_role)\s*[:=]\s*[^\s"']{8,}/gi],
  ["JWT-like token", /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ["local home path", /(?:\/Users\/[^/\s]+|\/home\/[^/\s]+)/g],
  ["hosted Supabase project URL", /https:\/\/(?!YOUR_PROJECT\.)[a-z0-9-]{8,}\.supabase\.co/gi],
  ["hosted Vercel project URL", /https:\/\/[a-z0-9-]+\.vercel\.app/gi],
  ["CJK text", /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g],
];

const denylist = (process.env.PUBLIC_PRIVACY_DENYLIST || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

for (const relative of files) {
  if (relative.startsWith(".git/") || binaryExtensions.has(path.extname(relative).toLowerCase())) continue;
  if (/(^|\/)\.env(?:\.|$)/.test(relative) && !relative.endsWith(".env.example")) {
    failures.push(`${relative}: tracked environment file`);
  }
  if (relative.endsWith(".private.json")) failures.push(`${relative}: tracked private event package`);
  let text;
  try {
    text = readFileSync(path.join(root, relative), "utf8");
  } catch {
    continue;
  }
  for (const [label, pattern] of rules) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) failures.push(`${relative}: ${label}`);
  }
  for (const match of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    if (!match[0].toLowerCase().endsWith("@example.invalid")) failures.push(`${relative}: non-example email address`);
  }
  const lower = text.toLowerCase();
  for (const value of denylist) {
    if (lower.includes(value.toLowerCase())) failures.push(`${relative}: configured private identifier`);
  }
}

if (failures.length) {
  console.error("Public repository privacy audit failed:");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Public repository privacy audit passed for ${files.length} files.`);
