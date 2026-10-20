# Blip VI

A night-map of Miami for the launch-week series: every spot with a reported
activation and every real place that's in the game, Brickell to South Beach.
Only the editor can add pins; everyone else just sees the map.

## Run it

```sh
npm install
cp .env.local.example .env.local   # fill in the four values below
npm run dev                        # http://localhost:3000
```

`.env.local` needs:

- `MAPKIT_TEAM_ID`, `MAPKIT_KEY_ID`, `MAPKIT_PRIVATE_KEY`: an Apple MapKit JS
  key (Certificates, Identifiers & Profiles → Keys, with MapKit JS enabled).
  The private key stays on the server; the browser only gets 30-minute tokens
  from `/api/mapkit-token`.
- `EDITOR_PASSWORD`: whoever enters it (🔒 Editor, bottom right) can add,
  edit, import, reset and remove pins in that browser for 90 days.

## Where things live

- `src/data/blips.ts`: the starting set of pins, with photo credits.
- The live set once the editor saves anything (`src/lib/pinStore.ts`): on
  Vercel, the `gtavimap-blips` Blob store, one `blips/<time>.json` per save
  (the last 10 are kept as history), with uploaded photos as `photos/*` blobs.
  Locally, `data/blips.json` with photos inline (`BLIPS_STORE=blob` uses the
  Blob store from `BLOB_READ_WRITE_TOKEN` instead, i.e. the live pins). Export
  writes a copy; Import merges one back; Reset restores the starting set.
- `public/photos/`: Brady's own photos (the Panther Coffee mural).
- Other photos are hotlinked from Wikimedia Commons and Unsplash; each pin
  carries its credit line.
