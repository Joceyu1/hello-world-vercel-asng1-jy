# SIDE B

A 90s music discovery club with a graffiti-and-alleyway visual identity inspired by NYC, Los Angeles, and Atlanta street culture. The 30-artist collection spans hip hop, new jack swing, R&B, techno, rave, Eurodance, and Eurobeat / Hi-NRG; the AI studio turns an artist, mood, and city scene into an original short mixtape liner note. Signed-in listeners can create notes and cast one upvote or downvote per note.

The street edition uses original photographic-style scene artwork, overlapping photo prints, wheatpasted flyer cards, textured paper, and hand-lettered headings. Its visual references include H.O.T., TLC, EYC, Bobby Brown, and L.A. Boyz music-video styling. Street-scene images are clearly identified as generated fictional environments; provenance is recorded in `public/images/README.md`.

## Product decisions

- **A reason to return:** a daily track rotation, new community notes, and crowd favorites. Artist biographies and curated essentials give each AI note real musical context. The collection has 30 artists and 300 tracks, with ten essentials per artist. L.A. Boyz uses the user's requested selections plus additional songs checked against published album and compilation tracklists.
- **A reason to share:** public notes have a clear title, a recognizable musical inspiration, and a NYC scene. Anyone can browse; authentication is reserved for creating and voting.
- **Beyond a generic caption generator:** constrained creative inputs make results relevant to a student’s actual weekend. Visible prompts explain how a note was made. A limited daily generation budget and one immutable ballot per note favor thoughtful contributions over spam.
- **Deliberate scope:** AI-generated text, not fake tracks or invented event listings. No artist impersonation or copied lyrics. Songs are hand-picked essentials with Spotify search links, not Spotify API results or popularity rankings. L.A. Boyz uses YouTube search links because the user identified those recordings as YouTube-only. Some later 90s favorites accompany the early-90s roots.

## Local development

Use the existing checkout; no worktree is needed. Validated with Node 24.19.0/npm 11.9.0. Next.js requires Node >=20.9.

```sh
npm ci
cp .env.example .env.local
# Fill in values securely; never commit .env.local.
npm run dev
```

Without Supabase settings the catalog still runs, while account and community features display honest unavailable states. No fake generations or vote counts are seeded. Display fonts (Anton, Permanent Marker, and Space Mono) are bundled from Fontsource; runtime Google Fonts access is unnecessary. Street-scene images are bundled locally and served through Next.js image optimization.

Artist cards use artist-specific photographs and clearly labeled sleeve images, replacing the repeated street scenery and vinyl overlays. Captions identify individual members when a photograph does not show the whole group. Source links, photographer credits, and verified Creative Commons/public-domain terms accompany the Commons photographs; no license is invented for album artwork. Photos may show later performances, not early-90s archival scenes. Twenty-four primary Commons photographs and a Stanley Huang fallback are bundled locally. Five sleeve images are sourced from the Apple Music catalog CDN; L.A. Boyz uses the user's supplied 8days/Mediacorp trio-photo URL, with the explicitly captioned member portrait as fallback. Their publisher URLs are narrowly allowed by Next.js image optimization. Missing images display an explicit unavailable state.

Source and attribution records live in `lib/music/artist-photos.ts`; `public/images/artists/README.md` records provenance. Public photo and discography research works in this cloud environment with Node 24's supported `NODE_USE_ENV_PROXY=1`, which honors the platform HTTP/HTTPS proxy. All five Apple Music sleeve images loaded in the production browser check. The supplied L.A. Boyz trio-photo request still returned proxy HTTP 403 here; its bundled Stanley Huang fallback loaded with the correct caption and credit. Research and image-CDN domains were saved in the environment configuration draft for review; saving does not apply or publish those settings. Production Vercel uses its own networking; no photo API key is required.

## Supabase setup

The selected project is `https://qrgjqpdvvbwmjpthpmlo.supabase.co`. The existing Assignment #3 tables must be present: `profiles` with `id`, name columns, and `avatar_path`; and `class_schedule`. The application uses `first_name` and `last_name`. Migration 001 also accepts the legacy `firstname` and `lastname` spellings and renames them while preserving existing values and constraints. It rejects missing or duplicate name columns rather than guessing which data to use. Profile provisioning supplies empty names for new/missing profiles, including schemas with `NOT NULL` name columns; the profile page asks the user to complete them. Additional required columns or nonempty-name checks need inspection before setup. No live database connection or administrative credential was available during implementation.

1. Review and apply the SQL files in `supabase/migrations` in filename order using Supabase SQL Editor or your existing migrations workflow. If `202610070001_side_b.sql` already ran, apply only the new `202610070002_expanded_catalog.sql`: it widens the allowed artist IDs to all 30 while preserving existing generations and RLS. Both migrations are transactional and intentionally have no destructive data resets.
   If Table Editor shows only `class_schedule` and `profiles`, the SIDE B tables have not been created in that project. Open **SQL Editor → New query**, copy and run the complete `202610070001_side_b.sql`, then run `202610070002_expanded_catalog.sql` in a second query. Refresh Table Editor; `generations` and `votes` should appear. Stop on an SQL error and resolve it before running the next file. A GitHub push or Vercel deployment does not execute these files in Supabase.
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
- RLS is enabled for **all existing public tables**. Known application tables get explicit policies. Unknown tables retain existing policies; inspect their policies and existing views/functions in the live database before claiming the whole database has been audited. Profile provisioning writes `id` and blank names; review any other required columns, nonempty-name checks, or existing triggers first.

Prompt text is public after publication. The studio tells users not to include personal details. The service-role credential bypasses RLS by design; keep it scoped to the server module and never return it to a client.

## Validation

```sh
npm run lint
npm test
npm run build
npm run start
```

`npm test` covers input/output validation and applies the actual SQL migrations in order to an isolated PostgreSQL-compatible PGlite fixture. Catalog expansion tests check that existing rows survive, all 30 artist IDs work, and unknown IDs fail. Server-action tests also verify authentication before administrative access, server-resolved ownership, exact prompt/output persistence, and private failure cleanup. Its security checks include unauthenticated/forged voting, duplicate ballots, private identities, pending visibility, quota exhaustion, owner-only profiles, legacy schedule access, and private avatars even under an old broad policy. These validate logic against documented fixtures, not the remote project's current schema.

Production browser checks verified 30 artists, 300 music links (290 Spotify and ten YouTube searches), all seven genre filters, searches/empty results, track disclosures, source credits, keyboard focus, guest studio restrictions, and profile-to-login redirects. All 30 cards displayed usable artist imagery, including the explicitly captioned L.A. Boyz fallback. Layouts at 320, 390, 541, 768, and 1440 pixels had no horizontal overflow. Live Supabase authentication, Gemini generation, and Vercel deployment remain unverified here.

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
