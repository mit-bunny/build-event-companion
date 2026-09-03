#!/usr/bin/env node
import path from "node:path";
import { firstPresent, linksFromValue, parseArgs, parseMap, readRows, slugify, writeJson } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.output) {
  console.error("Usage: node scripts/import-event.mjs --input <file-or-url> --output <event.private.json> [--map name=Name,email=Email] [--event-title Title]");
  process.exit(2);
}

const imported = await readRows(args.input, args.sheet);
if (imported.event && imported.attendees) {
  await writeJson(args.output, imported);
  console.log(`Imported complete event package with ${imported.attendees.length} attendees.`);
  process.exit(0);
}

const rows = imported;
const map = parseMap(args.map || "");
const defaults = {
  name: [map.name, "Name", "Full Name", "Guest Name", "Attendee"],
  email: [map.email, "Email", "Email Address"],
  bio: [map.bio, "Bio", "Biography", "About"],
  photo: [map.photo, "Photo", "Profile Photo", "Avatar"],
  links: [map.links, "Social Links", "Social Media", "Website", "Profile"],
  role: [map.role, "Role", "Guest Type"],
  discussion: [map.discussion, "Discussion", "Topics", "What would you like to discuss?"],
};

const usedColumns = new Set(Object.values(defaults).flat().filter(Boolean));
const seenIds = new Map();
const attendees = rows.map((row, index) => {
  const name = String(firstPresent(row, defaults.name)).trim();
  const email = String(firstPresent(row, defaults.email)).trim().toLowerCase();
  const baseId = slugify(email || name, `attendee-${index + 1}`);
  const duplicateIndex = seenIds.get(baseId) || 0;
  seenIds.set(baseId, duplicateIndex + 1);
  const id = duplicateIndex ? `${baseId}-${duplicateIndex + 1}` : baseId;
  const discussion = String(firstPresent(row, defaults.discussion)).trim();
  return {
    id,
    name,
    role: String(firstPresent(row, defaults.role)).trim() || "attendee",
    bio: String(firstPresent(row, defaults.bio)).trim(),
    photo: String(firstPresent(row, defaults.photo)).trim(),
    links: linksFromValue(firstPresent(row, defaults.links)),
    email,
    answers: Object.fromEntries(Object.entries(row).filter(([key, value]) => !usedColumns.has(key) && String(value).trim())),
    discussion,
    source: { provider: args.provider || path.extname(args.input).slice(1) || "text", row: index + 2 },
  };
});

const title = String(args["event-title"] || "Untitled Event");
const eventId = String(args["event-id"] || slugify(title, "event"));
const eventPackage = {
  schemaVersion: 1,
  event: {
    id: eventId,
    title,
    subtitle: String(args["event-subtitle"] || ""),
    start: String(args.start || ""),
    end: String(args.end || ""),
    timezone: String(args.timezone || ""),
    location: String(args.location || ""),
    description: String(args.description || ""),
  },
  theme: { background: "#f4f0e8", ink: "#101010", accent: "#00a8d6", secondary: "#ff6b4a" },
  attendees,
  topics: [],
  modules: [
    { id: "prep", type: "directory", label: "Prep", enabled: true, order: 1 },
    { id: "intro", type: "intro", label: "Intro", enabled: true, order: 2 },
    { id: "discussion", type: "discussion", label: "Discussion", enabled: true, order: 3 },
  ],
  source: { input: args.input, importedAt: new Date().toISOString(), rowCount: rows.length },
};

await writeJson(args.output, eventPackage);
const missingNames = attendees.filter((attendee) => !attendee.name).length;
console.log(`Imported ${attendees.length} attendees to ${args.output}.`);
if (missingNames) console.warn(`Warning: ${missingNames} attendee rows are missing names.`);
console.log(`Detected columns: ${rows[0] ? Object.keys(rows[0]).join(", ") : "none"}`);
