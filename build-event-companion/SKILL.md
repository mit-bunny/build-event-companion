---
name: build-event-companion
description: Build modular websites that help organizers prepare and run events from Luma registrations, CSV/TSV files, Excel workbooks, Google Sheets exports, JSON, or pasted text. Use when an agent needs to normalize attendee data, map custom registration questions, choose modules such as attendee prep, room analysis, presenter lineups, randomized introductions, discussion themes, arrival details, agendas, presentation timers, or paired phone remotes, generate a responsive event site, protect attendee overrides during re-imports, or prepare the generated project for Sites, Vercel, Lovable, or another host.
---

# Build Event Companion

Create a new, isolated event project from registration data. Treat the bundled website as a reusable starting point, not as a fixed product: keep modules configurable and preserve event-specific judgment in `event.json`.

## Guided kickoff

Extract any choices the user already supplied before asking questions. If the source, modules, and remote preference are all clear, start work without repeating them. Otherwise, ask only the missing items together in one compact message or structured choice form:

1. **Information source** — Luma event link; CSV, Excel, or JSON export; Google Sheet; pasted text; or multiple sources.
2. **Starting module set** — recommend **Live event kit** (Welcome, Room Analysis, Presenter Lineup, Timer) for an event-day display; offer **Networking kit** (Attendee Directory, Intro Roulette, Discussion Themes), **Full companion** (both sets), or **Custom**. Always say that Agenda, Arrival Info, and new custom modules can be added or any suggested module removed. Accept concise combinations such as “Live event kit + Agenda.”
3. **Phone remote** — yes for navigation, lineup randomization, and timer controls; no; or decide after preview.

Use presets to teach first-time users what is available, not to constrain the result. Keep a free-form path for unusual events and custom modules. Do not turn kickoff into a long interview: defer hosting, custom domains, and provider setup until the preview is approved unless the user already specified a deployment target.

Example opening:

> I can build this from Luma, a spreadsheet/export, Google Sheets, pasted text, or a combination. For a live event, I recommend Welcome + Room Analysis + Presenter Lineup + Timer; you can add Agenda, Arrival Info, Directory, Discussion, or a custom module. Would you also like a phone remote for navigation, lineup randomization, and timer controls?

## Workflow

1. Run the guided kickoff only for missing material choices. Establish the event source, intended audience, desired modules, and editing requirements. Defer deployment questions unless they affect the build or the user supplied a target.
2. Read [references/input-adapters.md](references/input-adapters.md), then acquire the source without exposing private registration data in a public repository.
3. Normalize the source with `scripts/import-event.mjs`. Map arbitrary registration questions explicitly instead of guessing silently.
4. Read [references/event-schema.md](references/event-schema.md), review the private event package, resolve duplicates, and preserve source provenance.
5. Read [references/modules.md](references/modules.md), select and configure modules, and summarize discussion responses when the Discussion module is enabled. For live facilitation, decide whether navigation, lineup randomization, and timers need a paired phone remote.
6. Validate the package with `scripts/validate-event.mjs`.
7. Generate a fresh site with `scripts/build-event-site.mjs`. Never reuse another event's deployment project, database, storage bucket, or attendee overrides.
8. Run the generated site's install and build commands. Preview before publishing. For projector-facing modules, install Chromium once with `npx playwright install chromium`, then run `npm run audit:layout` and resolve every 1280×720 and 1920×1080 overflow failure. When the phone remote, lineup, and timer are enabled together, run `npm run test:remote`; otherwise test pairing and every allowed command in two tabs before configuring the cloud relay.
9. Read [references/deployment.md](references/deployment.md) and deploy only after the user approves the preview or explicitly asks to publish.

## Quick start

Run commands from this skill directory. Install the optional Excel dependency only when importing `.xlsx` files. Convert legacy `.xls` files to `.xlsx` or CSV first.

```bash
npm install
node scripts/import-event.mjs \
  --input /path/to/guests.csv \
  --output /path/to/event.private.json \
  --event-title "Creator Meetup" \
  --map "name=Name,email=Email,bio=Bio,photo=Photo,links=Social links,discussion=Topics"
node scripts/validate-event.mjs /path/to/event.private.json
node scripts/build-event-site.mjs \
  --event /path/to/event.private.json \
  --output /path/to/creator-meetup-site
```

For pasted text, save the exact text to a temporary UTF-8 file, then pass that file to `--input`. Do not rewrite it before import.

## Data rules

- Keep `event.private.json` private. It may contain emails and raw registration answers.
- Generate `src/event.json` with public fields only. The build script removes emails, raw answers, and source records.
- Treat imports as defaults. Store attendee edits as a separate override layer keyed by `eventId` and stable attendee ID; merge overrides over imports at read time.
- Never replace an attendee-authored photo, name, bio, crop, or social link during re-import unless the organizer explicitly requests it.
- Deduplicate primarily by normalized email in private data, then by stable source ID. Do not deduplicate unrelated people by name alone.
- Do not publish private registration answers verbatim unless the organizer has reviewed and approved them.
- If profile editing is requested, use server-side verification and durable storage. Do not simulate authorization with a client-only email comparison.

## Portability rules

- Keep the canonical instructions and scripts vendor-neutral. Use ordinary files, Node.js, JSON, and Git.
- Put provider-specific behavior behind input, storage, and deployment adapters.
- Use the same event package across agents. Add thin installation wrappers for `.codex/skills`, `.claude/skills`, `.agents/skills`, or another agent's discovery path rather than forking the core skill.
- Degrade gracefully when a connector is unavailable: accept a local export instead of blocking the whole workflow.

## Bundled resources

- `scripts/import-event.mjs`: import CSV, TSV, JSON, text, published Google Sheet CSV URLs, and Excel workbooks.
- `scripts/validate-event.mjs`: validate event metadata, attendees, links, modules, and private/public boundaries.
- `scripts/build-event-site.mjs`: copy the generic site template and write a sanitized public event configuration.
- `assets/site-template`: responsive React/Vite site with attendee prep, intro roulette, discussion, projector-fit welcome, room analysis, adaptive presenter lineup, segmented timer, agenda, info, custom modules, an optional paired phone remote, and Playwright layout and remote-control tests.
- `references/event-schema.md`: canonical event package contract.
- `references/input-adapters.md`: acquisition and mapping guidance by source.
- `references/modules.md`: module configuration and behavior.
- `references/deployment.md`: hosting and persistence choices.
