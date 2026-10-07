# Artist imagery

The locally bundled files are photographs selected from Wikimedia Commons. These are actual portraits, live performances, interviews, or a photographic montage, not generated likenesses. They may show later years or lineups. Where only one member is shown, the card caption names that member.

`lib/music/artist-photos.ts` is the source and attribution manifest. Each local record includes the original file URL, Commons description page, credited author, and verified license. The cards display those source and license links and identify cropping. Original bytes are preserved; Next.js optimizes display copies. The En Vogue image uses an identified 2015 concert photograph rather than an unverified studio image.

Some groups use clearly labeled album sleeves from the Apple Music public catalog. Those retain publisher-hosted image URLs and source-album links; no Creative Commons license or photographer credit is claimed for them. L.A. Boyz uses the listener's supplied 8days/Mediacorp image URL. Its source is credited without inventing a reuse license; an independently verified Stanley Huang member portrait is bundled as a fallback.

The generated alley artwork used elsewhere on the site is documented separately in `../README.md` and is never used as an artist portrait.
