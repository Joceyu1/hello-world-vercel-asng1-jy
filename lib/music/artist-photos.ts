export type ArtistPhoto = {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  sourceUrl: string;
  originalUrl?: string;
  license?: string;
  licenseUrl?: string;
  position?: string;
  fit?: "cover" | "contain";
  kind?: "sleeve" | "video";
  fallback?: ArtistPhoto;
};

// Photographs and source credits selected for these specific artists.
// Local files are bundled; sleeve images retain their publisher's CDN URLs.
export const artistPhotos: Record<string, ArtistPhoto> = {
  "808": {
    src: "/images/artists/808.jpg",
    alt: "Graham Massey of 808 State at Music Tech Fest, 2015",
    credit: "Music Tech Fest",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Graham_Massey_2_-_MTFCentral_Hack_Camp_(2015-09-19_21.34.45_by_Music_Tech_Fest).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    position: "center 35%",
    caption: "Graham Massey of 808 State · 2015",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8b/Graham_Massey_2_-_MTFCentral_Hack_Camp_%282015-09-19_21.34.45_by_Music_Tech_Fest%29.jpg",
  },
  tribe: {
    src: "/images/artists/tribe.png",
    fit: "contain",
    alt: "A Tribe Called Quest",
    credit: "Various photographers (see source credits)",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:A_Tribe_Called_Quest_montage.png",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    caption: "A Tribe Called Quest · photographic montage",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8f/A_Tribe_Called_Quest_montage.png",
  },
  "wu-tang": {
    src: "/images/artists/wu-tang.jpg",
    alt: "Wu-Tang Clan",
    credit: "Miloš Krstić",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Wu-Tang_Clan_at_Exit_festival_2023.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    caption: "Wu-Tang Clan",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/e3/Wu-Tang_Clan_at_Exit_festival_2023.jpg",
  },
  "de-la": {
    src: "/images/artists/de-la.jpg",
    alt: "De La Soul",
    credit: "Matti Hillig",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:De_La_Soul_by_foto_di_matti.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    caption: "De La Soul",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/82/De_La_Soul_by_foto_di_matti.jpg",
  },
  nas: {
    src: "/images/artists/nas.jpg",
    alt: "Nas",
    credit: "All-Pro Reels",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Nas_(52380600682)_(cropped).jpg",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
    caption: "Nas",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/be/Nas_%2852380600682%29_%28cropped%29.jpg",
  },
  "bell-biv": {
    src: "/images/artists/bell-biv.jpg",
    credit: "Sister Circle Live",
    alt: "Bell Biv DeVoe members with Bobby Brown, 2018",
    caption: "Bell Biv DeVoe members with Bobby Brown · 2018",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:New_Edition_on_Sister_Circle_Live.jpg",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/95/New_Edition_on_Sister_Circle_Live.jpg",
  },
  prodigy: {
    src: "/images/artists/prodigy.jpg",
    alt: "The Prodigy",
    credit: "Silver Blu3",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:The_Prodigy_IMG_2972_(5353883317)_(cropped).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    caption: "The Prodigy",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/fe/The_Prodigy_IMG_2972_%285353883317%29_%28cropped%29.jpg",
  },
  janet: {
    src: "/images/artists/janet.jpg",
    alt: "Janet Jackson",
    credit: "Rich Esteban",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:JanetJacksonUnbreakableTourSanFran2015_(cropped).jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    caption: "Janet Jackson",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/9c/JanetJacksonUnbreakableTourSanFran2015_%28cropped%29.jpg",
  },
  orbital: {
    src: "/images/artists/orbital.jpg",
    alt: "Orbital",
    credit: "MJWill25",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Orbital_playing_at_the_Brighton_Centre_in_2023_-_Optical_Delusion_Tour_(cropped).jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    caption: "Orbital",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/ff/Orbital_playing_at_the_Brighton_Centre_in_2023_-_Optical_Delusion_Tour_%28cropped%29.jpg",
  },
  swv: {
    src: "/images/artists/swv.jpg",
    alt: "SWV",
    credit: "naacpphotos",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Hi-Res_NAACP_DSC09523ACR_(15317108755)_(1).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    caption: "SWV",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/9b/Hi-Res_NAACP_DSC09523ACR_%2815317108755%29_%281%29.jpg",
  },
  "bobby-brown": {
    src: "/images/artists/bobby-brown.jpg",
    alt: "Bobby Brown",
    credit: "Sister Circle Live",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Bobby_Brown_on_Sister_Circle_Live.jpg",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    caption: "Bobby Brown",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/c/c0/Bobby_Brown_on_Sister_Circle_Live.jpg",
  },
  "jeff-mills": {
    src: "/images/artists/jeff-mills.jpg",
    alt: "Jeff Mills",
    credit: "Basic Sounds",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Jeff_Mills_2010.jpg",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
    caption: "Jeff Mills",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/52/Jeff_Mills_2010.jpg",
  },
  "mary-j-blige": {
    src: "/images/artists/mary-j-blige.png",
    alt: "Mary J. Blige",
    credit: "WBLS",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Mary_J_Blige_in_2022.png",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    caption: "Mary J. Blige",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/7b/Mary_J_Blige_in_2022.png",
  },
  "2-unlimited": {
    src: "/images/artists/2-unlimited.jpg",
    alt: "2 Unlimited",
    credit: "AcerBen",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:2U_Live_Photo_NEWCUT.jpg",
    license: "Public domain",
    caption: "2 Unlimited",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/2b/2U_Live_Photo_NEWCUT.jpg",
  },
  snap: {
    src: "/images/artists/snap.jpg",
    alt: "Snap!",
    credit: "Mario Sedlak",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Snap!_2017.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    caption: "Snap!",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b8/Snap%21_2017.jpg",
  },
  "culture-beat": {
    src: "/images/artists/culture-beat.jpg",
    alt: "Culture Beat",
    credit: "TaylorNews",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Culture_Beat.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    caption: "Culture Beat",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/f5/Culture_Beat.jpg",
  },
  "dave-rodgers": {
    src: "/images/artists/dave-rodgers.jpg",
    alt: "Dave Rodgers",
    credit: "Soppakanuuna",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Dave_Rodgers.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    caption: "Dave Rodgers",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/19/Dave_Rodgers.jpg",
  },
  "underground-resistance": {
    src: "/images/artists/underground-resistance.jpg",
    alt: "Underground Resistance musicians performing in Detroit, 2010",
    credit: "Angie Linder from Detroit, USA",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Underground_Resistance_-_2010_-_10_Critics_in_Detroit_DSC_3766_(4720094986).jpg",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
    position: "center 35%",
    caption: "Underground Resistance live ensemble · Detroit, 2010",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/77/Underground_Resistance_-_2010_-_10_Critics_in_Detroit_DSC_3766_%284720094986%29.jpg",
  },
  "dead-or-alive": {
    src: "/images/artists/dead-or-alive.jpg",
    alt: "Pete Burns, lead singer of Dead or Alive, performing in 1980",
    credit: "User:Mathew Street",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Pete_Burns1.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    position: "center 30%",
    caption: "Pete Burns of Dead or Alive · 1980",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/a/a1/Pete_Burns1.jpg",
  },
  "real-mccoy": {
    src: "/images/artists/real-mccoy.jpg",
    alt: "Olaf Jeglitza (O-Jay) of Real McCoy, 2006",
    credit: "Photographer uncredited (Wikimedia Commons)",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Ojay2006.jpg",
    license: "Public domain",
    position: "center 35%",
    caption: "Olaf Jeglitza (O-Jay) of Real McCoy · 2006",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/58/Ojay2006.jpg",
  },
  "inner-city": {
    src: "/images/artists/inner-city.jpg",
    alt: "Kevin Saunderson, co-founder of Inner City, in 2016",
    credit: "Rubens Ben",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Kevin_Saunderson_(cropped).jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    position: "center 25%",
    caption: "Kevin Saunderson of Inner City · 2016",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/28/Kevin_Saunderson_%28cropped%29.jpg",
  },
  sinitta: {
    src: "/images/artists/sinitta.jpg",
    alt: "Sinitta at a U.S. Embassy London event, 2012",
    credit: "US Embassy London",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Sinitta.jpg",
    license: "Public domain",
    position: "center 25%",
    caption: "Sinitta · 2012",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/88/Sinitta.jpg",
  },
  "en-vogue": {
    src: "/images/artists/en-vogue.jpg",
    credit: "Jeff Kern",
    alt: "En Vogue performing at Epcot, 2015",
    caption: "En Vogue · Epcot, 2015",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:En_Vogue_EpcotMarch2015.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    position: "center 35%",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/fb/En_Vogue_EpcotMarch2015.jpg",
  },
  tlc: {
    src: "/images/artists/tlc.jpg",
    alt: "TLC members T-Boz and Chilli performing in Toronto, 2016",
    caption: "T-Boz & Chilli of TLC · 2016",
    credit: "The Come Up Show",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:TLC_2016.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    originalUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/84/TLC_2016.jpg",
  },
  guy: {
    src: "https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/84/af/24/84af2467-ebac-55c9-a054-2b8a8fcc0678/00602567828075.rgb.jpg/600x600bb.jpg",
    originalUrl:
      "https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/84/af/24/84af2467-ebac-55c9-a054-2b8a8fcc0678/00602567828075.rgb.jpg/100x100bb.jpg",
    alt: "Guy pictured on the The Future album sleeve",
    caption: "Sleeve image · The Future",
    credit: "Album artwork via Apple Music",
    sourceUrl: "https://music.apple.com/us/album/the-future/1425235992?uo=4",
    kind: "sleeve",
    fit: "contain",
  },
  "hi-five": {
    src: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/c9/24/49/c92449bb-cb92-1c59-fd4e-9a0f4bc8b0cd/886448555865.jpg/600x600bb.jpg",
    originalUrl:
      "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/c9/24/49/c92449bb-cb92-1c59-fd4e-9a0f4bc8b0cd/886448555865.jpg/100x100bb.jpg",
    alt: "Hi-Five pictured on the Hi-Five album sleeve",
    caption: "Sleeve image · Hi-Five",
    credit: "Album artwork via Apple Music",
    sourceUrl: "https://music.apple.com/us/album/hi-five/1604664680?uo=4",
    kind: "sleeve",
    fit: "contain",
  },
  eyc: {
    src: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b9/4c/ea/b94cea2e-cfe8-db45-4f55-c4e03b396c7e/19UMGIM38832.rgb.jpg/600x600bb.jpg",
    originalUrl:
      "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b9/4c/ea/b94cea2e-cfe8-db45-4f55-c4e03b396c7e/19UMGIM38832.rgb.jpg/100x100bb.jpg",
    alt: "E.Y.C. pictured on the Express Yourself Clearly (U.S. Version) album sleeve",
    caption: "Sleeve image · Express Yourself Clearly (U.S. Version)",
    credit: "Album artwork via Apple Music",
    sourceUrl:
      "https://music.apple.com/us/album/express-yourself-clearly-u-s-version/1462674750?uo=4",
    kind: "sleeve",
    fit: "contain",
  },
  xscape: {
    src: "https://is1-ssl.mzstatic.com/image/thumb/Features114/v4/1a/f2/c6/1af2c6b1-b456-a0c2-4834-3761c4bf6115/dj.tlwdfrtu.jpg/600x600bb.jpg",
    originalUrl:
      "https://is1-ssl.mzstatic.com/image/thumb/Features114/v4/1a/f2/c6/1af2c6b1-b456-a0c2-4834-3761c4bf6115/dj.tlwdfrtu.jpg/100x100bb.jpg",
    alt: "Xscape pictured on the Off the Hook album sleeve",
    caption: "Sleeve image · Off the Hook",
    credit: "Album artwork via Apple Music",
    sourceUrl: "https://music.apple.com/us/album/off-the-hook/157453469?uo=4",
    kind: "sleeve",
    fit: "contain",
  },
  jodeci: {
    src: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/59/cc/7c/59cc7cbf-ce33-64ce-8044-21fb32efc791/06UMGIM05895.rgb.jpg/600x600bb.jpg",
    originalUrl:
      "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/59/cc/7c/59cc7cbf-ce33-64ce-8044-21fb32efc791/06UMGIM05895.rgb.jpg/100x100bb.jpg",
    alt: "Jodeci pictured on the Diary of a Mad Band album sleeve",
    caption: "Sleeve image · Diary of a Mad Band",
    credit: "Album artwork via Apple Music",
    sourceUrl:
      "https://music.apple.com/us/album/diary-of-a-mad-band/1440637554?uo=4",
    kind: "sleeve",
    fit: "contain",
  },
  "la-boyz": {
    src: "https://onecms-res.cloudinary.com/image/upload/v1682312169/mediacorp/8days/image/2023/04/24/777076-ph.jpg",
    originalUrl:
      "https://onecms-res.cloudinary.com/image/upload/v1682312169/mediacorp/8days/image/2023/04/24/777076-ph.jpg",
    alt: "L.A. Boyz trio portrait",
    caption: "L.A. Boyz · trio portrait",
    credit: "8days / Mediacorp",
    sourceUrl:
      "https://onecms-res.cloudinary.com/image/upload/v1682312169/mediacorp/8days/image/2023/04/24/777076-ph.jpg",
    position: "center 30%",
    fallback: {
      src: "/images/artists/la-boyz.jpg",
      originalUrl:
        "https://upload.wikimedia.org/wikipedia/commons/2/25/2007TaipeiITMonth_Intel_StanleyHuang.jpg",
      alt: "Stanley Huang of L.A. Boyz at Taipei IT Month in 2007",
      caption: "Stanley Huang of L.A. Boyz · 2007",
      credit: "Rico Shen",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:2007TaipeiITMonth_Intel_StanleyHuang.jpg",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      position: "center 10%",
    },
  },
};
