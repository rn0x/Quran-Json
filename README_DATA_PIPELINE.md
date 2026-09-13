# Quran Data — Data Build Pipeline v3.1.0

This project builds one normalized schema from the source files already present under `data/`.
The build **does not rewrite source assets** such as `reciter_images`, `suwer-name`, `quran_image`, `Timming-Reciters-ayahBayah`, or the original timing files.

## Recommended command

```bash
pnpm run data:rebuild
```

It performs three steps:

1. Rebuilds the legacy split JSON (`data/json/surah`, `verses`, `audio`) from `mainDataQuran.json`.
2. Builds complete normalized JSON, CSV and SQLite outputs.
3. Verifies counts, SQLite integrity, table presence, CSV row counts, visual asset catalogs and ayah-by-ayah relations.

## Commands

```bash
pnpm run data:rebuild   # split + JSON + CSV + SQLite + verification
pnpm run data:build     # JSON + CSV + SQLite
pnpm run data:json      # JSON normalized database only
pnpm run data:csv       # CSV normalized database only
pnpm run data:sqlite    # SQLite normalized database only
pnpm run data:verify    # verify an existing full build
pnpm run data:clean     # remove generated database outputs only
pnpm run splitData      # refresh legacy split Quran JSON files
```

Compatibility aliases remain available: `jsonToSqlite`, `jsonToCsv`, `setup:db`, `verify:data`.

## Generated outputs

### JSON

- `data/json/database.json` — database index/manifest.
- `data/json/database/manifest.json`
- `data/json/database/schema.json`
- One normalized JSON array per table under `data/json/database/`.

### CSV

- `data/csv/database.csv` — table index with row counts and file names.
- One relational CSV per table under `data/csv/database/`.

### SQLite

- `data/sqlite/database.sqlite` — the complete normalized database.

## Normalized datasets

- `surahs`
- `verses`
- `audio`
- `quran_pages`
- `timing_reciters`
- `ayat_timing`
- `ayat_timing_geometry`
- `ayah_audio_reciters`
- `reciter_images`
- `surah_names`
- `ayah_bayah_reciters`
- `ayah_bayah_surahs`
- `ayah_bayah_ayahs`
- `ayah_bayah_segments`
- `api_reference`
- `source_files`

Binary images are intentionally **referenced by path**, not stored as BLOB/base64 data. This keeps the schema relational and avoids duplicating hundreds of assets inside every format.

## Source anomalies

The builder never silently changes source timing values. It records source anomalies in the generated manifest, including reversed timing ranges, special `verse_number=0` timing markers, out-of-range source timing rows, invalid source entries, and empty segment datasets.

## Windows / PowerShell

إذا انتهى `pnpm run data:rebuild` مباشرة بدون ظهور `1/3`، تأكد أنك تستخدم هذه النسخة؛
تم إصلاح فحص تشغيل ESM ليعمل على Windows وLinux/macOS.

المسار الموصى به للمشروع هو Node.js 22.x كما هو محدد في `package.json`.
Node 24 قد يعمل محليًا، لكن pnpm سيعرض تحذير `Unsupported engine` لأن المشروع مثبت على Node 22.x.

التحقق النهائي الناجح ينتهي بالسطر:

```text
✅ DATA_PIPELINE_OK
```
