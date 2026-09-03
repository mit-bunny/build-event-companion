#!/usr/bin/env node
import fs from "node:fs/promises";
import { parseArgs } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const file = args._[0] || args.input;
if (!file) {
  console.error("Usage: node scripts/validate-event.mjs <event.json>");
  process.exit(2);
}

const value = JSON.parse(await fs.readFile(file, "utf8"));
const errors = [];
const warnings = [];

if (value.schemaVersion !== 1) warnings.push("schemaVersion should currently be 1.");
if (!value.event?.id) errors.push("event.id is required.");
if (!value.event?.title) errors.push("event.title is required.");
if (!Array.isArray(value.attendees)) errors.push("attendees must be an array.");
if (!Array.isArray(value.modules)) errors.push("modules must be an array.");

const ids = new Set();
for (const [index, attendee] of (value.attendees || []).entries()) {
  if (!attendee.id) errors.push(`attendees[${index}].id is required.`);
  if (!attendee.name) errors.push(`attendees[${index}].name is required.`);
  if (attendee.id && ids.has(attendee.id)) errors.push(`Duplicate attendee id: ${attendee.id}`);
  ids.add(attendee.id);
  for (const link of attendee.links || []) {
    try {
      const url = new URL(link.url);
      if (!/^https?:$/.test(url.protocol)) throw new Error();
    } catch {
      errors.push(`Invalid social URL for ${attendee.name || attendee.id}: ${link.url}`);
    }
  }
}

const moduleIds = new Set();
for (const [index, module] of (value.modules || []).entries()) {
  if (!module.id || !module.type || !module.label) errors.push(`modules[${index}] requires id, type, and label.`);
  if (moduleIds.has(module.id)) errors.push(`Duplicate module id: ${module.id}`);
  moduleIds.add(module.id);

  if (module.type === "timer" && module.settings?.segments !== undefined) {
    const segments = Array.isArray(module.settings.segments) ? module.settings.segments : [];
    if (!segments.length) errors.push(`Timer module ${module.id || index} settings.segments must be a non-empty array.`);
    for (const [segmentIndex, segment] of segments.entries()) {
      if (!segment.label) errors.push(`Timer module ${module.id || index} segment ${segmentIndex + 1} requires a label.`);
      if (!Number.isInteger(segment.seconds) || segment.seconds <= 0) errors.push(`Timer module ${module.id || index} segment ${segmentIndex + 1} seconds must be a positive integer.`);
    }
  }

  if (module.type === "room") {
    const configuredCategories = module.content?.categories;
    const categories = Array.isArray(configuredCategories) ? configuredCategories : [];
    if (configuredCategories !== undefined && !Array.isArray(configuredCategories)) errors.push(`Room module ${module.id || index} content.categories must be an array.`);
    for (const [categoryIndex, category] of categories.entries()) {
      if (!category.label) errors.push(`Room module ${module.id || index} category ${categoryIndex + 1} requires a label.`);
      if (!Number.isInteger(category.count) || category.count < 0) errors.push(`Room module ${module.id || index} category ${categoryIndex + 1} count must be a non-negative integer.`);
      if (category.members !== undefined && !Array.isArray(category.members)) errors.push(`Room module ${module.id || index} category ${categoryIndex + 1} members must be an array.`);
    }
    const assigned = categories.reduce((sum, category) => sum + (Number.isInteger(category.count) ? category.count : 0), 0);
    if (Number.isInteger(module.content?.total) && assigned !== module.content.total) warnings.push(`Room module ${module.id || index} category counts total ${assigned}, not content.total ${module.content.total}.`);
  }
}

if (value.remoteControl) {
  const allowedControls = new Set(["navigation", "lineup-shuffle", "timer"]);
  if (value.remoteControl.provider && value.remoteControl.provider !== "supabase-broadcast") warnings.push(`Unknown remoteControl.provider: ${value.remoteControl.provider}`);
  if (value.remoteControl.codeLength && value.remoteControl.codeLength !== 6) errors.push("remoteControl.codeLength must be 6 for the bundled pairing UI.");
  for (const control of value.remoteControl.controls || []) if (!allowedControls.has(control)) errors.push(`Unknown remote control group: ${control}`);
  for (const key of ["supabaseUrl", "supabaseKey", "publishableKey", "anonKey", "secretKey"]) if (value.remoteControl[key]) errors.push(`remoteControl.${key} must be an environment variable, not event data.`);
}

if (!value.attendees?.length) warnings.push("No attendees were imported.");
if ((value.attendees || []).some((attendee) => attendee.email) && !/private/i.test(file)) {
  warnings.push("This file contains attendee emails. Keep it private and do not place it in the generated public site.");
}

for (const warning of warnings) console.warn(`Warning: ${warning}`);
for (const error of errors) console.error(`Error: ${error}`);
if (errors.length) process.exit(1);
console.log(`Valid event package: ${value.attendees.length} attendees, ${value.modules.filter((module) => module.enabled !== false).length} enabled modules.`);
