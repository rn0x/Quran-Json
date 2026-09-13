# Reciter / Ayah Tracking API Fixes

## What was fixed

- Canonical reciter IDs now come from `data/json/surah/surah_1.json`.
- Reciter images are mapped by numeric ID to the `NNN-...` filename prefix in `data/reciter_images`.
- Removed name-guessing logic that could map Arabic names to the wrong image/ID.
- Added a dedicated `server/services/reciterDataService.mjs` service.
- Added support for both QUL recitation formats:
  - Surah-by-Surah: `surah.json` + `segments.json`.
  - Ayah-by-Ayah: records containing `surah`, `ayah`, `audio_url`, and `segments`.
- QUL source IDs such as `959` (Muhammad Siddiq Al-Minshawi) and `960` (Saud Al-Shuraim) are accepted by the tracking routes.
- Fixed public data paths so they are returned under `/data/...`.
- Added reciter/surah/tracking endpoints to ReDoc OpenAPI definition.
- Added quick cards and detailed examples to `server/public/docs.html`.
- Added `npm run test:reciters` / `pnpm test:reciters` verification script for the real data directory.

## New / documented endpoints

- `GET /api/reciter-images`
- `GET /api/surah-names`
- `GET /api/ayah-bayah/reciters`
- `GET /api/ayah-bayah/reciter/:reciter_id`
- `GET /api/ayah-bayah/:reciter_id/:surah_id`
- `GET /api/ayah-bayah/:reciter_id/:surah_id/:verse_id`

Examples:

- Sudais Al-Fatihah: `/api/ayah-bayah/68/1`
- Sudais 1:1: `/api/ayah-bayah/68/1/1`
- Al-Minshawi QUL source 959, 1:1: `/api/ayah-bayah/959/1/1`
- Al-Shuraim QUL source 960, 1:1: `/api/ayah-bayah/960/1/1`

## Verify your full data folder

```bash
pnpm test:reciters
```

or:

```bash
npm run test:reciters
```

The script checks the ID/image mapping and all nine tracking folders listed in the project requirements.
