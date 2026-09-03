# Event package schema

The private event package is the canonical intermediate format. Keep it outside the generated public site.

## Top-level fields

```json
{
  "schemaVersion": 1,
  "event": {
    "id": "creator-meetup-2026-08-22",
    "title": "Creator Meetup",
    "subtitle": "Build, share, connect",
    "start": "2026-08-22T14:00:00-07:00",
    "end": "2026-08-22T17:00:00-07:00",
    "timezone": "America/Los_Angeles",
    "location": "San Francisco, CA",
    "description": "An afternoon for creators and builders."
  },
  "theme": {
    "background": "#f4f0e8",
    "ink": "#101010",
    "accent": "#00a8d6",
    "secondary": "#ff6b4a"
  },
  "remoteControl": {
    "enabled": false,
    "provider": "supabase-broadcast",
    "codeLength": 6,
    "controls": ["navigation", "lineup-shuffle", "timer"]
  },
  "attendees": [],
  "topics": [],
  "modules": [],
  "source": {}
}
```

## Attendee fields

- `id`: Stable slug or source ID. Required.
- `name`: Display name. Required.
- `role`: Optional label such as `host`, `attendee`, or `speaker`.
- `bio`: Public bio text. Preserve line breaks.
- `photo`: Public URL or project-relative asset path.
- `links`: Array of `{ "platform": "X", "url": "https://..." }`.
- `email`: Private verification and deduplication field. Never copy into the public site.
- `answers`: Private map of original registration questions and answers.
- `source`: Private provenance such as provider and source row ID.
- `overrides`: Optional attendee-authored fields. Keep separate in durable storage when a site is live.

## Topic fields

- `id`: Stable topic key.
- `title`: Short display title.
- `titleAlt`: Optional translated title.
- `description`: Organizer-reviewed synthesis, not an invented quote.
- `descriptionAlt`: Optional translation.
- `people`: Number of interested respondents.
- `keywords`: Short array for word-cloud or filtering interfaces.
- `threads`: Related questions or subtopics.
- `threadsAlt`: Optional translations.

## Module fields

Every module contains `id`, `type`, `label`, `enabled`, and `order`. Optional `labelAlt`, `settings`, and `content` fields depend on module type. Unknown module types render as a custom content section rather than breaking the site.

Notable type-specific fields:

- `room`: `content.total` and reviewed `content.categories`. Each category has `label`, `count`, optional `labelAlt`, `color`, and public `members` names.
- `lineup`: fixed `content.hosts` and randomizable `content.presenters` entries.
- `timer`: `settings.segments`, an ordered array of `{ "label": "Demo", "seconds": 300 }`. Legacy `demoSeconds` and `qaSeconds` are also supported.

## Remote control fields

- `enabled`: Expose the `/remote` controller and display pairing UI.
- `provider`: Realtime adapter name. The bundled template supports `supabase-broadcast`.
- `codeLength`: Use six digits in the bundled UI.
- `controls`: Allowlist of `navigation`, `lineup-shuffle`, and `timer`.

Provider URL and publishable key belong in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, never in the event package.

## Private/public boundary

The generator removes these fields from attendee records before writing the public configuration:

- `email`
- `answers`
- `source`
- `overrides`
- `discussion`

Review freeform module content separately because an organizer can intentionally place private text there.
