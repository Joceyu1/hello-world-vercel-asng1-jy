# SIDE B

A 90s music discovery club with a graffiti-and-alleyway visual identity inspired by NYC, Los Angeles, and Atlanta street culture. The collection combines hip hop, new jack swing, and rave; the AI studio turns an artist, mood, and city scene into an original short mixtape liner note. Signed-in listeners can create notes and cast one upvote or downvote per note.

The street edition uses original photographic-style scene artwork, overlapping photo prints, wheatpasted flyer cards, textured paper, and hand-lettered headings. Its visual references include H.O.T., TLC, EYC, Bobby Brown, and L.A. Boyz music-video styling. Images are clearly identified as generated fictional scenes, not artist portraits or archival video stills; provenance is recorded in `public/images/README.md`.

## Product decisions

- **A reason to return:** a daily track rotation, new community notes, and crowd favorites. Artist biographies and ten curated essentials per artist give each AI note real musical context.
- **A reason to share:** public notes have a clear title, a recognizable musical inspiration, and a NYC scene. Anyone can browse; authentication is reserved for creating and voting.
- **Beyond a generic caption generator:** constrained creative inputs make results relevant to a student’s actual weekend. Visible prompts explain how a note was made. A limited daily generation budget and one immutable ballot per note favor thoughtful contributions over spam.
- **Deliberate scope:** AI-generated text, not fake tracks or invented event listings. No artist impersonation or copied lyrics. Songs are hand-picked essentials with Spotify search links, not Spotify API results or popularity rankings. Some later 90s favorites accompany the early-90s roots.

## Local development

Use the existing checkout; no worktree is needed. Validated with Node 24.19.0/npm 11.9.0. Next.js requires Node >=20.9.

```sh
npm ci
cp .env.example .env.local
# Fill in values securely; never commit .env.local.
npm run dev
```

Without Supabase settings the catalog still runs, while account and community features display honest unavailable states. No fake generations or vote counts are seeded. Display fonts (Anton, Permanent Marker, and Space Mono) are bundled from Fontsource; runtime Google Fonts access is unnecessary. Street-scene images are bundled locally and served through Next.js image optimization.

## Supabase setup

The selected project is `https://qrgjqpdvvbwmjpthpmlo.supabase.co`. The existing Assignment #3 tables must be present: `profiles` with `id`, `first_name`, `last_name`, and `avatar_path`; and `class_schedule`. Inspect the live schema and existing policies before applying changes. No live database connection or administrative credential was available during implementation.

1. Review `supabase/migrations/202610070001_side_b.sql`, then run it once using Supabase SQL Editor or your existing migrations workflow. It is transactional and intentionally has no destructive data resets.
2. Configure Google authentication. In Supabase Authentication URL Configuration, allow the development callback and the exact Vercel `/auth/callback` URL. Enable the Google provider with its OAuth credentials; retain the existing provider configuration if already working.
3. Add these values to `.env.local` and the Vercel project’s applicable environments:

| Variable                               | Purpose                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Project URL above                                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase publishable key (legacy anon key also works)                    |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server-only Supabase service role/secret key for AI reservation and publication |
| `GEMINI_API_KEY`                       | Server-only Gemini API key from Google AI Studio                                |
| `GEMINI_MODEL`                         | Optional supported Gemini model; defaults to `gemini-2.5-flash`                 |

Keep service role and Gemini keys server-only; never add a `NEXT_PUBLIC_` prefix. Set public variables before building, because Next.js embeds them in the browser bundle. No Spotify credential is needed for the curated search links. Restricted environments need `qrgjqpdvvbwmjpthpmlo.supabase.co` and `generativelanguage.googleapis.com` allowed; npm installation needs `registry.npmjs.org`.

### Data and security

- `generations` stores the **full prompt**, artist/mood/scene, model, original title and caption, creator, timestamp, and pending/published/failed status. Only published notes and non-identifying columns are public. Only the trusted server can reserve or publish AI output; browser-created fake generations are rejected.
- The server verifies the cookie session with `auth.getUser()` before using administrative database access. Reservations are serialized per user with a transaction-level advisory lock and limited to five attempts per UTC day. Failed/time-out attempts count toward this limit, preventing repeated expensive retries. Interrupted pending rows remain private and also count.
- `votes` stores a new row containing the note ID, voter ID, and +1/-1. RLS checks the authenticated owner and that the note is published. A unique constraint prevents duplicate voting. No client update/delete grants exist. Voters can read only their own ballots; a narrowly scoped aggregate function exposes totals without voter IDs.
- `profiles` is owner-only for reads and edits, with column-level update grants. A server trigger provisions new profiles and backfills missing ones. Avatar paths must be the owner’s `<user-id>/avatar` path.
- The `avatars` bucket becomes private with type/size limits. A restrictive storage guard prevents earlier broad storage policies from exposing another user’s avatar. Owners can upload, update, and sign their own files.
- `class_schedule` remains publicly readable and becomes client read-only, preserving the old schedule capability.
- RLS is enabled for **all existing public tables**. Known application tables get explicit policies. Unknown tables retain existing policies; inspect their policies and existing views/functions in the live database before claiming the whole database has been audited. The migration assumes existing profiles can be inserted with only `id`; review other required columns or triggers first.

Prompt text is public after publication. The studio tells users not to include personal details. The service-role credential bypasses RLS by design; keep it scoped to the server module and never return it to a client.

## Validation

```sh
npm run lint
npm test
npm run build
npm run start
```

`npm test` covers input/output validation and applies the actual SQL migration to an isolated PostgreSQL-compatible PGlite fixture. Server-action tests also verify authentication before administrative access, server-resolved ownership, exact prompt/output persistence, and private failure cleanup. Its security checks include unauthenticated/forged voting, duplicate ballots, private identities, pending visibility, quota exhaustion, owner-only profiles, legacy schedule access, and private avatars even under an old broad policy. This validates the migration’s logic against the documented schema, not the remote project’s current schema.

Browser smoke checks verified the production homepage, ten artists/100 Spotify links, genre filters, searches/empty results, guest studio restrictions, profile-to-login redirect, and a 390px mobile layout without horizontal overflow.

After applying the live migration and credentials, complete these required checks:

1. In Incognito, browse the collection; `/profile` and `/members` redirect to login. Server actions and direct Supabase requests must reject unauthenticated mutations.
2. Sign in with Google, finish your profile, and publish a note. Reload: title, caption, full prompt, and model persist. The prompt contains the selected artist, mood, scene, and optional idea.
3. Vote once, reload, and confirm the ballot/count persists. A second attempt must fail, including direct database requests.
4. Use a second account to verify it cannot read the first account’s votes/profile/avatar, edit its profile, or cast a ballot as that user.
5. Verify six generation attempts exhaust the five-attempt daily budget and failed reservations never appear publicly.
6. Audit unknown tables/policies and any pre-existing public views or security-definer functions. The SQL cannot infer policies for undiscovered features.

Live OAuth, Gemini generation, and remote RLS validation remain unrun until credentials and the migration are supplied.

## Vercel deployment and submission

Pushing this code to GitHub does not apply the Supabase migration or configure API credentials. A connected Vercel project may automatically deploy a push; verify its actual status before treating the site as updated. No authenticated Vercel deployment-management tools were available in this workspace.

1. Apply and verify the Supabase migration; securely set the variables above in Vercel.
2. Run validation, commit the reviewed changes, and push to the connected GitHub repository.
3. In the Vercel project, open **Settings → Deployment Protection** and disable Vercel Authentication for the applicable deployments. Review any password/trusted-IP protection too; the assignment requires access in Incognito.
4. Deploy the exact commit. Open its deployment detail page, verify the source SHA, and copy that deployment’s generated URL—not the moving production alias or the older assignment URL.
5. Add that exact deployment’s callback URL to Supabase, then test in Incognito and signed in. A new preview hostname needs a matching allowlisted callback. Do not weaken OAuth redirect allowlists unnecessarily.
6. Submit the verified commit-specific URL in your course Submissions section.

## PM feedback

Bring the working collection/studio/wall to the Feedback Group. Ask whether the city scenes are useful, whether the note is something they would share, and whether the voting choice is clear. Record concrete PM feedback, then iterate and redeploy. No feedback session or PM suggestions have occurred in this workspace yet.
