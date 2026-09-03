import fs from "node:fs/promises";
import path from "node:path";

export function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

export function slugify(value, fallback = "item") {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || fallback;
}

export function parseMap(value = "") {
  return Object.fromEntries(
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const split = part.indexOf("=");
        if (split === -1) throw new Error(`Invalid mapping: ${part}`);
        return [part.slice(0, split).trim(), part.slice(split + 1).trim()];
      }),
  );
}

export function parseDelimited(text, delimiter = ",") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header, index) => header || `column_${index + 1}`);
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

export function parseTextRows(text) {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length >= 2 && lines[0].includes("|") && /^\s*\|?\s*:?-+/.test(lines[1])) {
    const markdown = lines.filter((_, index) => index !== 1).map((line) => line.replace(/^\s*\||\|\s*$/g, ""));
    return parseDelimited(markdown.join("\n"), "|");
  }
  if (lines.some((line) => line.includes("\t"))) return parseDelimited(cleaned, "\t");
  if (lines.some((line) => line.includes("|"))) return parseDelimited(cleaned, "|");
  return lines.map((name) => ({ Name: name.trim() }));
}

export async function readRows(input, sheetName) {
  if (/^https?:\/\//i.test(input)) {
    const response = await fetch(input);
    if (!response.ok) throw new Error(`Could not fetch input: ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    if (contentType.includes("json") || text.trim().startsWith("[") || text.trim().startsWith("{")) {
      return rowsFromJson(JSON.parse(text));
    }
    return parseDelimited(text, text.includes("\t") ? "\t" : ",");
  }

  const extension = path.extname(input).toLowerCase();
  if (extension === ".xls") {
    throw new Error("Legacy .xls files are not supported directly. Convert the workbook to .xlsx or CSV first.");
  }
  if (extension === ".xlsx") {
    let readXlsxFile;
    try {
      const module = await import("read-excel-file/node");
      readXlsxFile = module.default;
    } catch {
      throw new Error("Excel import requires the optional read-excel-file package. Run npm install in the skill directory.");
    }
    const matrix = await readXlsxFile(input, sheetName ? { sheet: sheetName } : undefined);
    if (!matrix.length) return [];
    const headers = matrix[0].map((value, index) => cellText(value) || `column_${index + 1}`);
    return matrix.slice(1)
      .filter((values) => values.some((value) => cellText(value).trim()))
      .map((values) => Object.fromEntries(headers.map((header, index) => [header, cellText(values[index])] )));
  }

  const text = await fs.readFile(input, "utf8");
  if (extension === ".json") return rowsFromJson(JSON.parse(text));
  if (extension === ".csv") return parseDelimited(text, ",");
  if (extension === ".tsv") return parseDelimited(text, "\t");
  return parseTextRows(text);
}

function cellText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value) return String(value.text || "");
    if ("result" in value) return String(value.result || "");
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
  }
  return String(value);
}

function rowsFromJson(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.rows)) return value.rows;
  if (value.event && Array.isArray(value.attendees)) return value;
  throw new Error("JSON input must be an array, { rows: [...] }, or a complete event package.");
}

export function firstPresent(row, candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if (row[candidate] !== undefined && String(row[candidate]).trim()) return row[candidate];
    const actual = Object.keys(row).find((key) => key.toLowerCase() === String(candidate).toLowerCase());
    if (actual && String(row[actual]).trim()) return row[actual];
  }
  return "";
}

export function linksFromValue(value) {
  if (Array.isArray(value)) return value;
  const urls = String(value ?? "").match(/https?:\/\/[^\s,;]+/g) || [];
  return urls.map((url) => ({ platform: platformFromUrl(url), url }));
}

function platformFromUrl(url) {
  if (/x\.com|twitter\.com/i.test(url)) return "X";
  if (/linkedin\.com/i.test(url)) return "LinkedIn";
  if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
  if (/xiaohongshu\.com|xhslink\.com/i.test(url)) return "Xiaohongshu";
  if (/instagram\.com/i.test(url)) return "Instagram";
  if (/tiktok\.com/i.test(url)) return "TikTok";
  return "Website";
}

export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function publicEventPackage(value) {
  const remoteControl = value.remoteControl ? {
    enabled: value.remoteControl.enabled !== false,
    provider: value.remoteControl.provider || "supabase-broadcast",
    codeLength: value.remoteControl.codeLength || 6,
    controls: value.remoteControl.controls || ["navigation", "timer"],
  } : undefined;
  return {
    schemaVersion: value.schemaVersion || 1,
    event: value.event,
    theme: value.theme,
    attendees: (value.attendees || []).map(({ email, answers, source, overrides, discussion, ...attendee }) => attendee),
    topics: value.topics || [],
    modules: value.modules || [],
    ...(remoteControl ? { remoteControl } : {}),
  };
}
