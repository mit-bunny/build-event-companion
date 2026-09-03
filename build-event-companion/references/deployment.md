# Deployment and persistence

## Generated project

The generator creates a standard React/Vite project. Keep it in its own Git repository and create separate backend resources per event.

## Vercel

Push the generated project to GitHub and import it as a Vercel project, or deploy with the Vercel CLI. Configure environment variables in Vercel rather than committing them.

For the paired phone remote, create a separate Supabase project for the event and set `VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel. The bundled `/remote` rewrite supports direct phone navigation. Test the production deployment on the phone and display before attaching the custom domain. Add the domain in Vercel project settings and follow the DNS records Vercel reports.

The remote uses ephemeral public Broadcast channels protected by a random short code. It stores no attendee data. For higher-risk events, replace public channels with authenticated private channels and Realtime Authorization.

The static event site does not require Supabase to remain available, but cross-device remote control does. A signed-in browser session is not required after deployment; keep the Supabase project active and preserve the Vercel environment variables. Free Plan projects may pause after a period of low activity, so check and resume the project before an occasional live demo or use a paid project when uninterrupted availability matters. See [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Lovable

Lovable does not currently import an arbitrary existing GitHub repository. Create a Lovable project first, connect it to GitHub so Lovable creates its repository, then generate or copy the site into that repository's active branch. Treat Lovable as an editing/deployment adapter, not as the canonical data format.

## OpenAI Sites

Use the Sites workflow when generating from a Sites-compatible template. Do not copy a previous event's `project_id`; create a fresh hosting project and fresh bindings.

## Other hosts

The read-only template builds to static assets and can run on any static host. Server-backed profile editing requires a host that supports API routes or an external backend.

## Profile editing

Do not ship client-only email authorization. Implement these interfaces behind server-side code:

- `ProfileStore`: read imported defaults and attendee overrides separately.
- `IdentityVerifier`: verify a submitted email or magic link against private registration data without exposing the attendee list.
- `MediaStore`: upload photos and return stable public URLs.

Recommended portable default: Supabase Auth/Postgres/Storage with row-level security. Alternatives include Neon plus object storage, Cloudflare D1/R2, or another Postgres/S3-compatible stack. Keep provider code in an adapter directory so the UI and event schema stay unchanged.

## Re-import safety

Merge in this order at read time:

```text
public profile = imported defaults < organizer corrections < attendee overrides
```

Never replace the override table during a registration refresh. Back up the database before schema migrations or bulk reconciliation.
