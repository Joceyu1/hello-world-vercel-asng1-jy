# Classic pop and R&B group expansion

Added November 11, 2026: ten groups and 100 editorial listening essentials, bringing SIDE B to 40 artists and 400 songs. Selected recordings span 1992–2001. These are starting points for discovery, not chart rankings or a complete discography.

## *NSYNC

Pop · Orlando, FL · selected recordings: 1996–2001

- [Official biography](https://nsync.com/pages/about-nsync)
- [Official Essential *NSYNC track listing](https://nsync.com/products/the-essential-nsync-cd)
- [Apple Music artist catalog](https://music.apple.com/us/artist/nsync/398120)

'I Drive Myself Crazy' is also released as 'Thinking of You (I Drive Myself Crazy)' in some territories.

## Destiny's Child

R&B · Houston, TX · selected recordings: 1997–2001

- [Apple Music artist catalog and recording years](https://music.apple.com/us/artist/destinys-child/634287)
- [Apple Music Survivor](https://music.apple.com/us/album/survivor/1301493743)

No, No, No, Pt. 2 features Wyclef Jean. Dangerously in Love is the Destiny's Child recording from Survivor, not Beyoncé's later solo re-recording.

## Backstreet Boys

Pop · Orlando, FL · selected recordings: 1996–2001

- [Official Greatest Hits: Chapter One track listing](https://backstreetboys.com/releases/the-hits-chapter-one/)
- [Official history](https://backstreetboys.com/history/)
- [Apple Music artist catalog](https://music.apple.com/us/artist/backstreet-boys/217039)

The official compilation page omits the initial 'I' from I Want It That Way in its display list; use the canonical title shown in Apple Music.

## Westlife

Pop · Sligo / Dublin, Ireland · selected recordings: 1999–2001

- [Official music catalog](https://www.westlife.com/music/)
- [Sony Music compilation listing](https://sonymusic.com.tw/album/25-the-ultimate-collection/)
- [Apple Music artist catalog](https://music.apple.com/us/artist/westlife/807028)
- [Apple Music World of Our Own original-era album](https://music.apple.com/us/album/world-of-our-own-expanded-edition/1267956247)
- [BMI 2000 artist profile](https://www.bmi.com/advice/20000701westlife)

## Spice Girls

Pop · London, England · selected recordings: 1996–1998

- [Official Greatest Hits track listing](https://thespicegirls.com/releases-archive/greatest-hits/)
- [Apple Music artist catalog](https://music.apple.com/us/artist/spice-girls/646793)
- [Apple Music Essentials biography](https://music.apple.com/us/playlist/spice-girls-essentials/pl.e958c2e36566442fb1668e88edf81473)

## Take That

Pop · Manchester, England · selected recordings: 1992–1996

- [Apple Music 1996 Greatest Hits](https://music.apple.com/us/album/take-that-greatest-hits/258661013)
- [Apple Music artist catalog](https://music.apple.com/us/artist/take-that/13653352)
- [Official formation timeline](https://takethat.com/timeline/how-it-all-started/)
- [Sony Music biography](https://www.sonymusic.co.uk/artist/take-that/)

Relight My Fire features Lulu. These selections focus on the original 1990s run rather than the later reunion albums.

## Boyzone

Pop · Dublin, Ireland · selected recordings: 1994–1998

- [Apple Music Essentials biography](https://music.apple.com/us/playlist/boyzone-essentials/pl.30969fa9ee194dffb3db4baea1b4438d)
- [Official Charts recording years and catalog](https://www.officialcharts.com/chart-news/boyzones-official-top-40-biggest-songs-in-the-uk-revealed/)
- [Universal Music official biography](https://www.universalmusic.fr/artistes/20000060814)

## 98 Degrees

Pop · Los Angeles, CA / Ohio roots · selected recordings: 1997–2000

- [Apple Music original-era The Collection](https://music.apple.com/us/album/the-collection/1449303157)
- [Apple Music artist biography](https://music.apple.com/ug/artist/98/257902)
- [Official booking agency biography](https://www.dayafterdaymusic.com/artists/98-degrees/)
- [Apple Music True to Your Heart collaborator credit](https://music.apple.com/us/song/1442469571)

Artist is officially styled 98°. Use 98 Degrees for the card if matching the user's requested spelling; include 98° as a search alias. True to Your Heart is a collaboration with Stevie Wonder. Avoid accidentally using the 2025 '98°'s Version' re-recordings when describing original release dates. Apple Music's artist biography reports formation 1997; other sources date the group's formation 1996, so no formation year is asserted.

## All Saints

R&B · London, England · selected recordings: 1997–2001

- [Official music catalog and full track lists](https://www.allsaintsofficial.co.uk/music)
- [Official group biography](https://www.allsaintsofficial.co.uk/about)
- [Apple Music All Hits](https://music.apple.com/us/album/all-hits/121064989)

Genre is a useful catalog grouping, not an exclusive stylistic claim. All Saints are often tagged Pop; their own debut-album description names R&B, hip hop, swing, synthpop, trip-hop, and UK garage among influences.

## S Club 7

Pop · London, England · selected recordings: 1999–2001

- [Universal Music label biography](https://www.universalmusic.fr/artistes/20000329243)
- [Official Charts track titles and release years](https://www.officialcharts.com/chart-news/s-club-7-s-official-top-10-best-selling-singles__9147/)
- [Apple Music Greatest Hits](https://music.apple.com/us/album/best-the-greatest-hits-of-s-club-7/1440757553)

Apple Music currently lists the artist as S Club. Use S Club 7 for the 1999–2001 era, with S Club as a search alias.

## Images

Image sources, dates, credits, and license links are recorded in `lib/music/artist-photos.ts` and rendered with each card. Nine additions use Wikimedia Commons photographs or member-photo montages; *NSYNC uses the accurately labeled No Strings Attached sleeve from Apple Music. Later photographs are captioned with their dates. All ten sources returned image responses through the deployed Next.js image optimizer during implementation.

## Database activation

Apply `supabase/migrations/202611110001_pop_groups.sql` to the original shared Supabase project, `qrgjqpdvvbwmjpthpmlo`, after its existing migrations. It verifies the known whitelist, widens it to 40 artist IDs, and publishes a read-only boolean capability marker in one transaction. Existing notes, votes, policies, and table grants are preserved.

Before activation, the ten new groups are fully browsable, searchable, and linked to music services, while their studio options are disabled and marked as coming soon. The server checks `side_b_pop_groups_ready()` and enables them on the next page load once the migration succeeds. Missing or failed checks retain the original 30 studio options. No service-role key or role bypass is introduced.

The configured Management API credential returned HTTP 403 during a read-only metadata check on November 11. No live migration was executed by the agent; owner SQL Editor activation is required. Fixture tests verify both activation and existing-data preservation independently of the live database.
