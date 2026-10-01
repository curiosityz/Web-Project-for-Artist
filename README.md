# ENEM THA GREAT — TDK · concept site

Interactive artist site for **ENEM (Enem Tha Great)** — Philly graffiti legend (TDK · KTS · FUA ·
UCIT · FLYID · TKU) and emcee (*VANDAL TO VANGOGH*, Grilchy Party 2024).

**Run it:** `cd site && node server.cjs` → http://localhost:8080
(The static files also work with any static server; `node server.cjs` additionally enables
live cross-device sync for the Public Wall via WebSocket at `/ws`.)

---

## What's inside

| Section | What it does |
|---|---|
| **Hero** | WebGL spray-particle field that follows the cursor, Ken Burns wall photo, art-filled display type |
| **The Walls** | Verified pieces with instant search (`Ctrl/⌘ K`), category/city/year/color filters, editorial trails, surprise pick, local **My Crate**, shareable archive cuts, source notes, mono analysis lens, touch zoom, immersive Wall Mode, field-guide print/PDF, and real-photo share-card export. Add up to three works to a visitor Collector Board, compare two or three, export a credited contact-sheet PNG, and copy lightbox credits. |
| **In His Words / The Writer** | Real quotes + bio from the Bombing Science & Spray Planet interviews; name-evolution timeline; Dream TDK tribute; source-aware citations |
| **The Music** | Full *VANDAL TO VANGOGH* tracklist with real credits, the local preview player, and one-click Bandcamp links on every track for the actual recording. Sticky player bar with spectrum visualizer, seek and queue. Synth demo is clearly labeled when source audio is not installed |
| **The Drops** | High-intent release cards for Bandcamp-listed vinyl/CD, plus explicitly labeled print/apparel concepts; local preview stash, fly-to-stash and clear checkout stub. No invented live stock or countdown; checkout/inventory need artist authorization and integration |
| **The Public Wall** | Shared visitor canvas — spray, marker, roller, eraser, tag stamp, caps, undo, two-step buff, PNG export, deduplicated sync, brush-size-aware ephemeral cursors, daily prompts linked to real archive references, photo-sampled visitor color palettes, one-click wall invites, and persistent snapshots. Fan paint only; never presented as ENEM's work |
| **Pocket archive** | Installable/offline PWA: pre-caches the real art, local type, player and interactions; the collaborative wall correctly needs a network connection |
| **Access** | Skip-to-archive link, keyboard-operable controls, trapped/returning lightbox focus, high-contrast toggle, three-step text sizing, persisted still-motion mode, touch gestures, and system reduced-motion support |
| **FX layer** | Vendored GSAP + ScrollTrigger (`js/vendor/`, no CDN): scramble-decode hero type, word-mask headings, eager-loaded pinned HIGHLIGHT REEL with snap-scroll fallback, image tilt/glare, batch gallery reveals, scroll-velocity marquee, magnetic buttons, ghost-type/parallax and audio-reactive abstract hero particles |

## Destination round — ten moves now built

1. **Instant archive search** — `Ctrl/⌘ K` jumps directly into a real-piece search.
2. **Captioned-city route** — filter only by the documented locations attached to each photo (not guessed coordinates).
3. **Photo-tone explorer** — browser samples the actual art images and indexes dominant color families.
4. **My Crate** — save pieces locally, then share a crate URL without an account.
5. **Deep-linked pieces** — each artwork opens directly from a shareable URL.
6. **Touch-native viewing room** — keyboard/swipe navigation, pinch zoom, drag-to-pan, and reset.
7. **Artist-photo share card** — export a 1200×630 card built from a verified image, with a source receipt.
8. **Provenance on the wall** — distinguish artist-supplied files from published archive photography and link the source.
9. **Pocket archive** — installable/offline PWA shell and real art cache; release media can be added with permission.
10. **A wall with presence** — public cross-device paint sync plus temporary brush-size-aware cursors; mobile navigation, high contrast, skip link, and focus-safe viewing are also included.

**Integrity in the drop interface:** release-listed items go to Bandcamp, live stock is not fabricated, and print/apparel proposals are clearly labeled concept mockups. The local stash is a prototype; checkout is not live.

## Destination round two — ten new experiences

1. **City wayfinder** — a schematic connector for captioned cities; explicitly not a geographic map or exact travel route.
2. **Time cuts** — browse only the documented years, with undated records kept distinct.
3. **Curator routes** — three editorial sequences through real pieces; viewer arrows follow the chosen sequence.
4. **Wall Mode** — immersive full-screen, source-credited slideshow of the current filtered cut.
5. **Field Guide** — print the visible set or save it as PDF, with each work’s photo credit and source link.
6. **Surprise Me** — open a random real piece from the current filter, with a direct shareable URL.
7. **Actual track exits** — every album row links to its Bandcamp track page; local demo playback is still labeled as a demo.
8. **Daily wall study** — a visitor-made prompt points back to one authentic reference; the instruction is to respond, not copy.
9. **Interaction guide** — the `?` shortcut documents archive, Wall Mode and Public Wall controls.
10. **Monochrome lens** — an optional display-only study in the lightbox; source image and exports stay unchanged.

## Destination round three — ten more working features

1. **Collector Board** — build a temporary, visitor-curated board of up to three verified ENEM archive works.
2. **Side-by-side compare** — inspect two or three originals together with each work’s record and source link.
3. **Credited contact-sheet PNG** — export the visitor’s selection with photo/source labels and an explicit note that the composition is visitor-curated, not ENEM’s.
4. **Photo-derived Public Wall palette** — sample five colors from the day’s genuine archive reference image; colors sync as visitor paint only.
5. **Share an archive cut** — link the current category, city, year, tone, search, crate and/or curator trail.
6. **Source ledger** — assemble artwork, interview-quote, individual track-page and album-release references directly from project data.
7. **Copy lightbox credit** — copy the artwork attribution alongside the photo/archive credit and source URL when available.
8. **Invite to the Public Wall** — share or copy a direct link to the public visitor canvas.
9. **Adjustable text** — cycle through standard, large and larger text settings, saved in the visitor’s browser.
10. **Still mode** — a user-controlled, remembered setting pauses ambient animation and Wall Mode slideshow; system reduced-motion support remains respected.

The board, comparison and export use only verified archive works. The exported contact sheet is a visitor-made study, not an ENEM piece; its photo/source credits stay attached. No source-photograph ownership is asserted.

**Presentation polish:** the first screen keeps only section navigation, cart, one archive-entry CTA and the album link. Secondary archive filters/tools now sit inside a single collapsed “Refine & Explore” disclosure. The pinned, scroll-scrubbed hero lifts clipped planes from the same verified red/gold wall photo; no new graffiti imagery is fabricated. Reduced-motion visitors get a static hero.

**Round-three verification:** JavaScript/service-worker/server syntax, CSS brace balance, all 127 unique HTML IDs and 115 static JS ID references, 15 artwork files, 35 precache assets/routes, and the manifest MIME type passed. The raw WebSocket test also passed handshake, broadcast, and snapshot replay. The live preview is served at port 8080. There is no browser automation in this workspace, so visual layout, native-dialog behavior, and actual PNG downloads still merit a manual browser pass.

## No fake graffiti — sourcing & how to add his IG content

Instagram returns **HTTP 403 to all scrapers**, so no tool can pull his feed directly.
The archive keeps each **verified real ENEM piece** with a per-item credit: published interview
photos, Street Art SF documentation, or files supplied by the artist/commissioning team.

- Wall photography: *Bombing Science — "Graffiti Interview: Enem"* (Feb 2022) and
  *Street Art SF* (2016, Oakland tag).
- Album artwork: *Grilchy Party / Bandcamp* (2024) — artwork by Enem himself.
- Tracklist, durations, producer credits and the release-listed vinyl/CD prices: same Bandcamp page. A splatter variant is documented as sold out there. The print/tee cards are concept mockups only; inventory and checkout are not live.
- Quotes & bio facts: Bombing Science + Spray Planet interviews.
- **Artist-supplied additions** (delivered by the commissioning team): the shark-truck burn,
  the Montana-hoodie process shot, two black & white archival docs (smoke study + FUA ruins),
  and the "press conference" blackbook sketch — plus PNG masters replacing four interview scans.

**To upgrade to his full Instagram catalog (the intended flow):**
1. Have the artist export originals (or save from his IG at full res).
2. Drop files into `site/assets/art/` (any name, jpg/png).
3. Add one line per piece to `ART` in `site/js/data.js` (`file, title, year, spot, cat, note`).
   Categories: `walls` / `process` / `doc` / `blackbook`. For the captioned route and source receipt, fill `city`, `source` and (if public) `sourceUrl`. The gallery, filters, crate and lightbox pick them up automatically.
4. Music: drop recordings in as `site/assets/audio/01.mp3 … 08.mp3` (numbers = track order).
   The player detects them and switches from demo beats to the real album.
5. Checkout: `site/js/merch.js → #checkout` is the single integration point for
   Stripe / Shopify / Bandcamp commerce.

Nothing on the site is AI-generated graffiti. The only generative visuals are the abstract
spray-particle background and the visitor doodle board, both clearly framed as such.

## Structure

```
site/
  index.html          semantic markup, metadata + sections
  manifest.webmanifest installable app metadata
  sw.js               offline-first shell cache (bump version on release)
  server.cjs          zero-dependency static + WebSocket server
  css/style.css       design system (self-hosted fonts, no CDN)
  js/
    data.js           ALL verified content (art, tracks, products, quotes, links)
    app.js            boot, nav, reveals, marquee, source ledger, access settings
    spray.js          WebGL hero particles (2D fallback; still-mode aware)
    gallery.js        searchable archive, curator routes, Collector Board, compare/export, share/zoom
    player.js         audio engine + synth demo beats + visualizer
    merch.js          verified release links + preview stash
    doodle.js         public wall + sync transports
  assets/art/         real pieces + album cover
  assets/fonts/       Archivo Black · Permanent Marker · Space Grotesk (self-hosted)
  assets/audio/       drop real tracks here (01.mp3 … 08.mp3)
```

## Credits shown on-site

All graffiti & album artwork © ENEM. Published wall photos via Bombing Science (2022) and
Street Art SF (2016), with selected artist-supplied scans/photos; album artwork via Grilchy
Party/Bandcamp (2024); quotes via Bombing Science & Spray Planet interviews.
