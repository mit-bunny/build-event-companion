# Input adapters

## Luma

Prefer the organizer's authenticated Luma guest table or an organizer-exported guest CSV. Capture event metadata, approved guests, hosts, registration questions, and answers. When browser access is used, read the registration answer supplied for the event rather than substituting a Luma profile handle.

Use attendee-provided external links first. Fall back to Luma profile links or portraits only when the organizer permits it. Record the provenance of fallback data.

Luma authentication is interactive and provider-controlled. Do not store session cookies or credentials in the skill or generated repository. Normalize a downloaded CSV/JSON export with `import-event.mjs`.

## CSV and TSV

Run:

```bash
node scripts/import-event.mjs --input guests.csv --output event.private.json --map "name=Full Name,email=Email"
```

Use `--map` for semantic fields. Supported targets are `name`, `email`, `bio`, `photo`, `links`, `role`, and `discussion`. Unmapped columns remain in `answers`.

## Excel

Run `npm install` in the skill directory once, then import `.xlsx`. The first worksheet is used by default; pass `--sheet "Approved Guests"` to select another worksheet. Convert legacy `.xls` files to `.xlsx` or CSV first.

## Google Sheets

For a public or published sheet, pass its CSV export URL to `--input`. For a private sheet, use the available Google Drive/Sheets connector to export CSV or XLSX, then import the local file. Never put OAuth tokens in a URL or repository.

## JSON

Accepted shapes are an array of row objects, `{ "rows": [...] }`, or a complete event package containing `event` and `attendees`.

## Pasted text

Preserve the user's text exactly in a temporary UTF-8 file. The deterministic importer recognizes:

- Markdown tables
- Delimited lines such as `Name | Bio | https://example.com`
- One name per line

For prose or inconsistent blocks, let the agent convert the text into row objects while retaining an untouched source copy for audit, then import the JSON.

## Mapping review

Before site generation, show the organizer:

- detected attendee count;
- chosen name, email, photo, bio, link, role, and discussion columns;
- unmapped registration questions;
- duplicate and missing-name warnings.

Ask for correction when a mapping changes public content or access control.
