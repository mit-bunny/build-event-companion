# Module registry

Modules are ordered by `order` and shown only when `enabled` is not `false`.

## Directory (`directory`)

Display a responsive attendee grid with equal-size cards. Recommended settings:

```json
{ "columns": "auto", "showRoles": true, "details": "hover-or-tap" }
```

Use accessible focus behavior as well as hover. Never rely on fixed attendee counts or fixed row positions.

## Introductions (`intro`)

Randomize from the full eligible attendee pool. Show a centered card with up to three neighbors on each side while spinning. Support choosing, removing the chosen person from the remaining pool, rotating again, and resetting. When one person remains, reveal that profile immediately. Keep session progress local unless the organizer requests shared facilitation state.

## Discussion (`discussion`)

Show organizer-reviewed topic clusters, interest counts, keywords, and related threads. Make keywords navigational, not decorative. Do not publish raw private responses or attribute a response to a person without permission.

## Info (`info`)

Use for arrival instructions, parking, venue photos, accessibility, food, or reminders. Store display content in the module's `content.cards` array.

## Agenda (`agenda`)

Use `content.items` with `time`, `title`, and optional `description`.

## Welcome (`welcome`)

Use a full-screen opening module with optional `content.poster`, `content.qr`, bilingual headline/message fields, and `content.stats`. Keep the poster contained. Give the QR image and its label separate layout rows so labels such as “Scan to join” cannot be pushed outside the viewport.

Inspect QR assets before publishing. If the asset is a phone screenshot with large margins, crop only nonessential screenshot chrome or configure `content.qrScale` and `content.qrOffsetY` to focus the displayed image. Preserve the complete code, its four-sided quiet zone, and any organizer-required title. Test the rendered result with a real scanner; visual inspection alone is insufficient.

## Room analysis (`room`)

Normalize submitted job titles before counting. Store reviewed groups in `content.categories` as `{ label, labelAlt, count, color, members? }`. Assign each attendee once, keep an audit outside the public site, and favor a few legible categories over a long taxonomy. Explicitly check for easily missed cohorts such as students, investors, creators, and operators before finalizing the taxonomy. Sort categories by count descending, using a stable reviewed order to break ties. The bundled view also sorts defensively and shows counts and percentages; optional `members` arrays reveal names on click. Use inset bars and large projected labels; omit methodology copy unless requested.

## Presenter lineup (`lineup`)

Reconcile the lineup against the original positive demo responses, current attendance status, organizer cancellations, and any fixed opening presenters. Report the expected count and every exclusion before publishing; never silently drop a submission. Store fixed opening presenters in `content.hosts` and the randomizable pool in `content.presenters`. Preserve the host order and randomize only `content.presenters` on every click or remote command.

Each item supports `id`, `name`, `projectName`, `projectUrl`, and a short complete `description`. If a submission has no usable project name, use a stable fallback such as `Wanyang's Demo` rather than a blank title or raw placeholder. Keep colors keyed to presenter identity so they move with cards. Summarize descriptions to fit without unfinished truncation. Size the grid from the total item count, place the randomize control in the final grid cell, and avoid visually empty cells. If the lineup cannot remain legible at 1280×720, paginate or split it instead of shrinking text below projection-safe sizes.

## Presentation timer (`timer`)

Use `settings.segments` for any number of consecutive phases:

```json
{
  "settings": {
    "segments": [
      { "label": "Setup", "seconds": 180 },
      { "label": "Demo", "seconds": 300 },
      { "label": "Questions", "seconds": 180 }
    ]
  }
}
```

The phases run continuously, ring once at each transition, and repeat the final alarm until stopped. Include start, pause, reset, and stop-alarm controls. `demoSeconds` and `qaSeconds` remain supported for older two-phase event packages.

## Paired phone remote

This is an optional top-level capability, not a visible module. Configure `remoteControl.enabled`, a provider, six-digit codes, and allowed control groups. The phone opens `/remote`, generates a code, and the display subscribes after the organizer enters it. Commands may navigate enabled modules, randomize a lineup, and control a timer. Never place provider secrets in `event.json`; use Vite environment variables. Test locally with two tabs, then test two physical devices over the deployed HTTPS URL.

Keep remote controls visibly button-like with a background, border, focus state, and touch-safe target. After deployment, repeat pairing, navigation, lineup randomization, timer start/pause/reset, and alarm stopping on the final custom domain rather than only the host's temporary URL.

## Projector layout QA

Treat `welcome`, `room`, `lineup`, and `timer` as run-of-show views that should fit without page scrolling on a 16:9 display. The bundled template allocates desktop height as header + module heading + remaining stage, while narrow screens continue to scroll normally.

Run `npm run audit:layout` before publishing. It builds the site, opens every run-of-show module at 1280×720 and 1920×1080, and fails when the document, active module, or marked critical content overflows. Review screenshots as well: numerical fit does not guarantee readable type, a scannable QR code, or a sensible grid. Re-run the audit after every content, font, or CSS change that can affect geometry.

## Custom (`custom`)

Render `content.title`, `content.body`, and optional `content.cards`. Use this for lightweight event-specific modules before creating a new renderer.

## Creating a new module type

1. Add a renderer in `assets/site-template/src/App.jsx`.
2. Keep the module driven by JSON rather than event-specific constants.
3. Define empty, loading, keyboard, touch, and narrow-screen behavior.
4. Add sample configuration and a focused test.
5. Keep the existing module types backward compatible.
