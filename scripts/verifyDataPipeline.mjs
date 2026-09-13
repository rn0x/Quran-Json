import { isMainModule } from './runtime.mjs';
import { createReadStream } from 'node:fs';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import {
  csvDatabaseDir,
  dataRoot,
  jsonDatabaseDir,
  paths,
  readJson,
  resolveAyahBayahSources,
  sqlitePath,
  tableSchemas
} from './dataPipelineLib.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function fileExists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

async function countLines(filePath) {
  let count = 0;
  const rl = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const _ of rl) count += 1;
  return count;
}

async function validateJsonArrayFile(filePath) {
  const info = await stat(filePath);
  assert(info.size >= 3, `JSON export is empty: ${filePath}`);
  const handle = await import('node:fs/promises').then((m) => m.open(filePath, 'r'));
  try {
    const head = Buffer.alloc(Math.min(64, info.size));
    const tail = Buffer.alloc(Math.min(64, info.size));
    await handle.read(head, 0, head.length, 0);
    await handle.read(tail, 0, tail.length, Math.max(0, info.size - tail.length));
    assert(head.toString('utf8').trimStart().startsWith('['), `JSON table does not start with [: ${filePath}`);
    assert(tail.toString('utf8').trimEnd().endsWith(']'), `JSON table does not end with ]: ${filePath}`);
  } finally {
    await handle.close();
  }
}

async function sourceExpectations() {
  const quran = await readJson(paths.mainQuran);
  const pages = await readJson(paths.pages);
  const timingReciters = await readJson(paths.legacyTimingReciters);
  const ayahAudio = await readJson(paths.ayahAudio);
  const verses = quran.reduce((sum, s) => sum + (s.verses?.length ?? 0), 0);
  const audio = quran.reduce((sum, s) => sum + (s.audio?.length ?? 0), 0);
  const reciters = new Set(quran.flatMap((s) => (s.audio ?? []).map((a) => Number(a.id))));
  const reciterImages = (await readdir(paths.reciterImages)).filter((name) => /^\d{3}-.+\.(?:jpe?g|png|webp)$/i.test(name));
  const imageIds = new Set(reciterImages.map((name) => Number(name.slice(0,3))));
  const surahNames = (await readdir(paths.surahNames)).filter((name) => /^\d{3}\.svg$/i.test(name));
  const timingFiles = (await readdir(paths.legacyTimingDir)).filter((name) => /^timing_\d{3}\.json$/.test(name));
  const sources = await resolveAyahBayahSources();
  return {
    surahs: quran.length,
    verses,
    audio,
    reciters: reciters.size,
    quran_pages: pages.length,
    timing_reciters: timingReciters.length,
    ayah_audio_reciters: (ayahAudio.reciters_verse ?? []).length,
    reciter_images: imageIds.size,
    surah_names: surahNames.length,
    legacy_timing_files: timingFiles.length,
    ayah_bayah_sources: sources.length
  };
}

export async function run() {
  const manifestPath = path.join(jsonDatabaseDir, 'manifest.json');
  const schemaPath = path.join(jsonDatabaseDir, 'schema.json');
  assert(await fileExists(manifestPath), 'Missing data/json/database/manifest.json — run pnpm data:rebuild first.');
  assert(await fileExists(schemaPath), 'Missing data/json/database/schema.json.');
  assert(await fileExists(sqlitePath), 'Missing data/sqlite/database.sqlite.');

  const [manifest, schema, expected] = await Promise.all([
    readJson(manifestPath),
    readJson(schemaPath),
    sourceExpectations()
  ]);
  assert(manifest.complete_normalized_export === true, 'Manifest is not marked as complete normalized export.');
  assert(schema.schema_version === manifest.schema_version, 'Schema/manifest version mismatch.');

  const db = new DatabaseSync(sqlitePath, { readOnly: true });
  const report = { schema_version: manifest.schema_version, source: expected, tables: {}, warnings: manifest.warnings ?? [] };
  try {
    const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
    assert(integrity === 'ok', `SQLite integrity_check failed: ${integrity}`);

    for (const [name, definition] of Object.entries(tableSchemas)) {
      const table = db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name=?").get(name);
      assert(table, `SQLite table missing: ${name}`);
      const dbCount = Number(db.prepare(`SELECT COUNT(*) AS count FROM ${name}`).get().count);
      const manifestCount = Number(manifest.tables?.[name]?.rows);
      assert(dbCount === manifestCount, `${name}: SQLite=${dbCount}, manifest=${manifestCount}`);

      const jsonFile = path.join(jsonDatabaseDir, `${name}.json`);
      const csvFile = path.join(csvDatabaseDir, `${name}.csv`);
      assert(await fileExists(jsonFile), `JSON table missing: ${name}.json`);
      assert(await fileExists(csvFile), `CSV table missing: ${name}.csv`);
      await validateJsonArrayFile(jsonFile);
      const csvLines = await countLines(csvFile);
      assert(csvLines === manifestCount + 1, `${name}.csv rows=${csvLines - 1}, expected=${manifestCount}`);
      report.tables[name] = dbCount;
    }

    assert(report.tables.surahs === 114 && report.tables.surahs === expected.surahs, 'surahs mismatch');
    assert(report.tables.verses === expected.verses, `verses mismatch: ${report.tables.verses}/${expected.verses}`);
    assert(report.tables.audio === expected.audio, `audio mismatch: ${report.tables.audio}/${expected.audio}`);
    assert(report.tables.quran_pages === 604 && report.tables.quran_pages === expected.quran_pages, 'quran_pages mismatch');
    assert(report.tables.timing_reciters === expected.timing_reciters, 'timing_reciters mismatch');
    assert(report.tables.ayah_audio_reciters === expected.ayah_audio_reciters, 'ayah_audio_reciters mismatch');
    assert(report.tables.reciter_images === expected.reciter_images, `reciter_images mismatch: ${report.tables.reciter_images}/${expected.reciter_images}`);
    assert(report.tables.surah_names === 114 && report.tables.surah_names === expected.surah_names, 'surah_names mismatch');
    assert(expected.legacy_timing_files === 114, `legacy timing files != 114 (${expected.legacy_timing_files})`);
    assert(report.tables.ayah_bayah_reciters === expected.ayah_bayah_sources, `ayah_bayah_reciters mismatch: ${report.tables.ayah_bayah_reciters}/${expected.ayah_bayah_sources}`);

    const audioDistinct = Number(db.prepare('SELECT COUNT(DISTINCT id) AS count FROM audio').get().count);
    assert(audioDistinct === expected.reciters, `audio distinct reciters mismatch: ${audioDistinct}/${expected.reciters}`);

    const imageMissing = Number(db.prepare("SELECT COUNT(*) AS count FROM reciter_images WHERE file_name IS NULL OR image_path IS NULL").get().count);
    assert(imageMissing === 0, `reciter_images contains ${imageMissing} missing paths`);
    const surahNameMissing = Number(db.prepare("SELECT COUNT(*) AS count FROM surah_names WHERE file_name IS NULL OR image_path IS NULL").get().count);
    assert(surahNameMissing === 0, `surah_names contains ${surahNameMissing} missing SVG paths`);

    const ayahBayahOrphans = Number(db.prepare(`
      SELECT COUNT(*) AS count
      FROM ayah_bayah_ayahs a
      LEFT JOIN ayah_bayah_reciters r ON r.reciter_id = a.reciter_id
      WHERE r.reciter_id IS NULL
    `).get().count);
    assert(ayahBayahOrphans === 0, `ayah_bayah_ayahs orphan reciters=${ayahBayahOrphans}`);

    console.log('✅ DATA_PIPELINE_OK');
    console.log(JSON.stringify(report, null, 2));
    return report;
  } finally {
    db.close();
  }
}

if (isMainModule(import.meta.url)) {
  run().catch((error) => {
    console.error('❌ verifyDataPipeline failed:', error);
    process.exit(1);
  });
}
