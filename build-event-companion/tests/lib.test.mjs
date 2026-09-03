import assert from "node:assert/strict";
import test from "node:test";
import { parseDelimited, parseTextRows, publicEventPackage, slugify } from "../scripts/lib.mjs";

test("parses quoted CSV fields and newlines", () => {
  const rows = parseDelimited('Name,Bio\n"Lee, Sam","First line\nSecond line"\n');
  assert.deepEqual(rows, [{ Name: "Lee, Sam", Bio: "First line\nSecond line" }]);
});

test("parses a Markdown table", () => {
  const rows = parseTextRows("| Name | Bio |\n| --- | --- |\n| Mei | Builder |\n");
  assert.deepEqual(rows, [{ Name: "Mei", Bio: "Builder" }]);
});

test("creates stable slugs", () => {
  assert.equal(slugify("Créative Systems 2026"), "creative-systems-2026");
});

test("removes private attendee fields from public output", () => {
  const result = publicEventPackage({
    event: { id: "event", title: "Event" },
    attendees: [{ id: "a", name: "A", email: "a@example.invalid", answers: { secret: "x" }, discussion: "private", source: { row: 2 } }],
    modules: [],
  });
  assert.deepEqual(result.attendees, [{ id: "a", name: "A" }]);
  assert.equal("source" in result, false);
});

test("keeps only safe remote-control configuration in public output", () => {
  const result = publicEventPackage({
    event: { id: "event", title: "Event" },
    attendees: [],
    modules: [],
    remoteControl: {
      enabled: true,
      provider: "supabase-broadcast",
      codeLength: 6,
      controls: ["navigation", "lineup-shuffle", "timer"],
      supabaseUrl: "private",
      publishableKey: "private",
    },
  });
  assert.deepEqual(result.remoteControl, {
    enabled: true,
    provider: "supabase-broadcast",
    codeLength: 6,
    controls: ["navigation", "lineup-shuffle", "timer"],
  });
});
