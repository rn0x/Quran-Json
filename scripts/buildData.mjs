import { isMainModule } from './runtime.mjs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import {
  SCHEMA_VERSION,
  ExportSink,
  audioCatalogFromQuran,
  chooseBestReciterImage,
  cleanGenerated,
  csvDatabaseDir,
  dataRoot,
  ensureDir,
  exists,
  extractPageNumber,
  findNestedJsonFiles,
  jsonDatabaseDir,
  normalizeWordSegment,
  parseAyahKey,
  paths,
  readJson,
  resolveAyahBayahSources,
  sourceFileRows,
  sqlitePath,
  tableSchemas,
  toFinite,
  toInt,
  writePrettyJson
} from './dataPipelineLib.mjs';

const __filename = fileURLToPath(import.meta.url);
const isDirect = isMainModule(import.meta.url);

function parseFormats(argv = process.argv.slice(2)) {
  const arg = argv.find((value) => value.startsWith('--formats='));
  const raw = arg ? arg.slice('--formats='.length) : 'all';
  const requested = new Set(raw.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean));
  if (requested.has('all')) return { json: true, csv: true, sqlite: true };
  return { json: requested.has('json'), csv: requested.has('csv'), sqlite: requested.has('sqlite') };
}

function createDatabase(db) {
  db.exec(`
    PRAGMA journal_mode = DELETE;
    PRAGMA synchronous = NORMAL;
    PRAGMA temp_store = MEMORY;
    PRAGMA foreign_keys = OFF;

    CREATE TABLE schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE surahs (
      number INTEGER PRIMARY KEY,
      name_ar TEXT,
      name_en TEXT,
      name_transliteration TEXT,
      revelation_place_ar TEXT,
      revelation_place_en TEXT,
      verses_count INTEGER,
      words_count INTEGER,
      letters_count INTEGER
    );

    CREATE TABLE verses (
      surah_number INTEGER NOT NULL,
      number INTEGER NOT NULL,
      text_ar TEXT,
      text_en TEXT,
      juz INTEGER,
      page INTEGER,
      sajda INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (surah_number, number)
    );

    CREATE TABLE audio (
      id INTEGER NOT NULL,
      surah_number INTEGER NOT NULL,
      reciter_ar TEXT,
      reciter_en TEXT,
      rewaya_ar TEXT,
      rewaya_en TEXT,
      server TEXT,
      link TEXT,
      PRIMARY KEY (id, surah_number)
    );

    CREATE TABLE quran_pages (
      page_number INTEGER PRIMARY KEY,
      image_path TEXT,
      start_surah_number INTEGER,
      start_verse_number INTEGER,
      end_surah_number INTEGER,
      end_verse_number INTEGER
    );

    CREATE TABLE timing_reciters (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      rewaya TEXT,
      folder_url TEXT,
      soar_count INTEGER,
      soar_link TEXT
    );

    CREATE TABLE ayat_timing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reciter_id INTEGER NOT NULL,
      surah_number INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      start_time_ms INTEGER NOT NULL,
      end_time_ms INTEGER NOT NULL,
      source_file TEXT,
      UNIQUE(reciter_id, surah_number, verse_number)
    );

    CREATE TABLE ayat_timing_geometry (
      surah_number INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      polygon TEXT,
      x REAL,
      y REAL,
      page_number INTEGER,
      PRIMARY KEY (surah_number, verse_number)
    );

    CREATE TABLE ayah_audio_reciters (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      rewaya TEXT,
      musshaf_type TEXT,
      audio_url_bit_rate_32 TEXT,
      audio_url_bit_rate_64 TEXT,
      audio_url_bit_rate_128 TEXT
    );

    CREATE TABLE reciter_images (
      reciter_id INTEGER PRIMARY KEY,
      reciter_ar TEXT,
      reciter_en TEXT,
      file_name TEXT,
      image_path TEXT,
      duplicate_files_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE surah_names (
      surah_number INTEGER PRIMARY KEY,
      name_ar TEXT,
      name_en TEXT,
      name_transliteration TEXT,
      file_name TEXT,
      image_path TEXT
    );

    CREATE TABLE ayah_bayah_reciters (
      reciter_id INTEGER PRIMARY KEY,
      source_resource_id INTEGER,
      reciter_ar TEXT,
      reciter_en TEXT,
      rewaya_ar TEXT,
      rewaya_en TEXT,
      source_key TEXT NOT NULL UNIQUE,
      source_type TEXT NOT NULL,
      has_surah_audio INTEGER NOT NULL DEFAULT 0,
      has_ayah_audio INTEGER NOT NULL DEFAULT 0,
      has_word_segments INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE ayah_bayah_surahs (
      reciter_id INTEGER NOT NULL,
      surah_number INTEGER NOT NULL,
      audio_url TEXT,
      duration REAL,
      source_file TEXT,
      PRIMARY KEY (reciter_id, surah_number)
    );

    CREATE TABLE ayah_bayah_ayahs (
      reciter_id INTEGER NOT NULL,
      source_resource_id INTEGER,
      surah_number INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      audio_mode TEXT NOT NULL,
      time_base TEXT NOT NULL,
      audio_url TEXT,
      duration_ms REAL,
      timestamp_from_ms REAL,
      timestamp_to_ms REAL,
      segments_count INTEGER NOT NULL DEFAULT 0,
      source_file TEXT,
      PRIMARY KEY (reciter_id, surah_number, verse_number)
    );

    CREATE TABLE ayah_bayah_segments (
      reciter_id INTEGER NOT NULL,
      surah_number INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      segment_index INTEGER NOT NULL,
      word_number INTEGER NOT NULL,
      start_time_ms REAL NOT NULL,
      end_time_ms REAL NOT NULL,
      time_base TEXT NOT NULL,
      source_file TEXT,
      PRIMARY KEY (reciter_id, surah_number, verse_number, segment_index)
    );

    CREATE TABLE api_reference (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      version TEXT,
      base_url TEXT,
      documentation_url TEXT,
      github_url TEXT,
      json_content TEXT NOT NULL,
      statistics TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE source_files (
      file_path TEXT PRIMARY KEY,
      category TEXT,
      extension TEXT,
      size_bytes INTEGER NOT NULL
    );

    CREATE TABLE dataset_manifest (
      dataset_name TEXT PRIMARY KEY,
      row_count INTEGER NOT NULL,
      json_file TEXT,
      csv_file TEXT,
      description TEXT,
      generated_at TEXT NOT NULL
    );

    CREATE INDEX idx_verses_juz ON verses(juz);
    CREATE INDEX idx_verses_page ON verses(page);
    CREATE INDEX idx_audio_surah ON audio(surah_number);
    CREATE INDEX idx_audio_reciter ON audio(id);
    CREATE INDEX idx_audio_reciter_name_ar ON audio(reciter_ar);
    CREATE INDEX idx_timing_reciter_id ON ayat_timing(reciter_id);
    CREATE INDEX idx_timing_surah ON ayat_timing(surah_number);
    CREATE INDEX idx_timing_verse ON ayat_timing(verse_number);
    CREATE INDEX idx_timing_reciter_surah ON ayat_timing(reciter_id, surah_number);
    CREATE INDEX idx_ayah_bayah_surah ON ayah_bayah_ayahs(surah_number, verse_number);
    CREATE INDEX idx_ayah_bayah_reciter_surah ON ayah_bayah_ayahs(reciter_id, surah_number);
    CREATE INDEX idx_ayah_bayah_segments_ayah ON ayah_bayah_segments(reciter_id, surah_number, verse_number);
  `);
}

function statements(db) {
  if (!db) return {};
  return {
    surahs: db.prepare(`INSERT INTO surahs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    verses: db.prepare(`INSERT INTO verses VALUES (?, ?, ?, ?, ?, ?, ?)`),
    audio: db.prepare(`INSERT INTO audio VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
    quran_pages: db.prepare(`INSERT INTO quran_pages VALUES (?, ?, ?, ?, ?, ?)`),
    timing_reciters: db.prepare(`INSERT INTO timing_reciters VALUES (?, ?, ?, ?, ?, ?)`),
    ayat_timing: db.prepare(`INSERT INTO ayat_timing (reciter_id,surah_number,verse_number,start_time_ms,end_time_ms,source_file) VALUES (?, ?, ?, ?, ?, ?)`),
    ayat_timing_geometry: db.prepare(`INSERT OR IGNORE INTO ayat_timing_geometry VALUES (?, ?, ?, ?, ?, ?)`),
    ayah_audio_reciters: db.prepare(`INSERT INTO ayah_audio_reciters VALUES (?, ?, ?, ?, ?, ?, ?)`),
    reciter_images: db.prepare(`INSERT INTO reciter_images VALUES (?, ?, ?, ?, ?, ?)`),
    surah_names: db.prepare(`INSERT INTO surah_names VALUES (?, ?, ?, ?, ?, ?)`),
    ayah_bayah_reciters: db.prepare(`INSERT INTO ayah_bayah_reciters VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    ayah_bayah_surahs: db.prepare(`INSERT INTO ayah_bayah_surahs VALUES (?, ?, ?, ?, ?)`),
    ayah_bayah_ayahs: db.prepare(`INSERT OR REPLACE INTO ayah_bayah_ayahs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    ayah_bayah_segments: db.prepare(`INSERT INTO ayah_bayah_segments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    api_reference: db.prepare(`INSERT INTO api_reference (id,title,description,version,base_url,documentation_url,github_url,json_content,statistics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    source_files: db.prepare(`INSERT INTO source_files VALUES (?, ?, ?, ?)`)
  };
}

async function makeSinks(formats, stmt) {
  const sinks = {};
  for (const [name, schema] of Object.entries(tableSchemas)) {
    sinks[name] = new ExportSink({
      name,
      columns: schema.columns,
      json: formats.json,
      csv: formats.csv,
      sqliteStatement: stmt[name] ?? null
    });
    await sinks[name].open();
  }
  return sinks;
}

async function closeSinks(sinks) {
  for (const sink of Object.values(sinks)) await sink.close();
}

function validateMainQuran(quran) {
  if (!Array.isArray(quran) || quran.length !== 114) throw new Error(`mainDataQuran.json must contain 114 surahs; found ${Array.isArray(quran) ? quran.length : 'invalid'}`);
  const seen = new Set();
  for (const surah of quran) {
    const number = Number(surah.number);
    if (!Number.isInteger(number) || number < 1 || number > 114 || seen.has(number)) throw new Error(`Invalid/duplicate surah number: ${surah.number}`);
    seen.add(number);
    if (!Array.isArray(surah.verses) || !Array.isArray(surah.audio)) throw new Error(`Surah ${number} must contain verses[] and audio[]`);
  }
}

async function writeBaseQuran(quran, pages, sinks) {
  for (const surah of quran) {
    const surahNumber = Number(surah.number);
    await sinks.surahs.add({
      number: surahNumber,
      name_ar: surah.name?.ar,
      name_en: surah.name?.en,
      name_transliteration: surah.name?.transliteration,
      revelation_place_ar: surah.revelation_place?.ar,
      revelation_place_en: surah.revelation_place?.en,
      verses_count: Number(surah.verses_count ?? surah.verses.length),
      words_count: Number(surah.words_count ?? 0),
      letters_count: Number(surah.letters_count ?? 0)
    });
    for (const verse of surah.verses) {
      await sinks.verses.add({
        surah_number: surahNumber,
        number: Number(verse.number),
        text_ar: verse.text?.ar,
        text_en: verse.text?.en,
        juz: toInt(verse.juz),
        page: toInt(verse.page),
        sajda: verse.sajda ? 1 : 0
      });
    }
    for (const audio of surah.audio) {
      await sinks.audio.add({
        id: Number(audio.id),
        surah_number: surahNumber,
        reciter_ar: audio.reciter?.ar,
        reciter_en: audio.reciter?.en,
        rewaya_ar: audio.rewaya?.ar,
        rewaya_en: audio.rewaya?.en,
        server: audio.server,
        link: audio.link
      });
    }
  }

  if (!Array.isArray(pages) || pages.length !== 604) throw new Error(`pagesQuran.json must contain 604 pages; found ${Array.isArray(pages) ? pages.length : 'invalid'}`);
  for (const page of pages) {
    await sinks.quran_pages.add({
      page_number: Number(page.page),
      image_path: page.image?.url ?? `/data/quran_image/${page.page}.png`,
      start_surah_number: toInt(page.start?.surah_number),
      start_verse_number: toInt(page.start?.verse),
      end_surah_number: toInt(page.end?.surah_number),
      end_verse_number: toInt(page.end?.verse)
    });
  }
}

async function writeLegacyTiming(quran, sinks, warnings) {
  const reciters = await readJson(paths.legacyTimingReciters);
  if (!Array.isArray(reciters) || !reciters.length) throw new Error('Legacy timing reciter catalog is missing/invalid.');
  for (const reciter of reciters) {
    await sinks.timing_reciters.add({
      id: Number(reciter.id),
      name: reciter.name,
      rewaya: reciter.rewaya,
      folder_url: reciter.folder_url,
      soar_count: Number(reciter.soar_count ?? 0),
      soar_link: reciter.soar_link
    });
  }

  const ayahAudio = await readJson(paths.ayahAudio);
  for (const reciter of ayahAudio.reciters_verse ?? []) {
    await sinks.ayah_audio_reciters.add({
      id: Number(reciter.id),
      name: reciter.name,
      rewaya: reciter.rewaya,
      musshaf_type: reciter.musshaf_type,
      audio_url_bit_rate_32: reciter.audio_url_bit_rate_32_ ?? reciter.audio_url_bit_rate_32,
      audio_url_bit_rate_64: reciter.audio_url_bit_rate_64,
      audio_url_bit_rate_128: reciter.audio_url_bit_rate_128
    });
  }

  const timingFiles = (await readdir(paths.legacyTimingDir)).filter((name) => /^timing_\d{3}\.json$/.test(name)).sort();
  if (timingFiles.length !== 114) throw new Error(`Expected 114 timing files; found ${timingFiles.length}`);
  const geometrySeen = new Set();
  const verseMax = new Map(quran.map((surah) => [Number(surah.number), Number(surah.verses_count ?? surah.verses?.length ?? 0)]));
  let reversed = 0;
  let specialVerseRows = 0;
  let outOfRangeVerseRows = 0;

  for (const fileName of timingFiles) {
    const payload = await readJson(path.join(paths.legacyTimingDir, fileName));
    const surah = Number(payload.surah);
    for (const read of payload.reads ?? []) {
      const reciterId = Number(read.read_id);
      for (const item of read.ayat_timing ?? []) {
        const verse = Number(item.ayah);
        const start = Number(item.start_time);
        const end = Number(item.end_time);
        if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
        if (end < start) reversed += 1;
        if (verse === 0 || verse < 0) specialVerseRows += 1;
        else if (verse > (verseMax.get(surah) ?? 0)) outOfRangeVerseRows += 1;
        await sinks.ayat_timing.add({
          reciter_id: reciterId,
          surah_number: surah,
          verse_number: verse,
          start_time_ms: start,
          end_time_ms: end,
          source_file: `json/reads_timing_data/timings_hafs_114/${fileName}`
        });

        const key = `${surah}:${verse}`;
        if (!geometrySeen.has(key)) {
          geometrySeen.add(key);
          await sinks.ayat_timing_geometry.add({
            surah_number: surah,
            verse_number: verse,
            polygon: item.polygon,
            x: toFinite(item.x),
            y: toFinite(item.y),
            page_number: extractPageNumber(item.page)
          });
        }
      }
    }
  }
  if (reversed) warnings.push({ code: 'LEGACY_TIMING_REVERSED_RANGE', count: reversed, message: 'Source rows with end_time < start_time were preserved without silent correction.' });
  if (specialVerseRows) warnings.push({ code: 'LEGACY_TIMING_SPECIAL_VERSE', count: specialVerseRows, message: 'Rows such as verse_number=0 are source timing markers (for example basmala/intros) and were preserved.' });
  if (outOfRangeVerseRows) warnings.push({ code: 'LEGACY_TIMING_OUT_OF_RANGE_VERSE', count: outOfRangeVerseRows, message: 'Positive verse numbers beyond the Quran surah verse count exist in the source and were preserved for traceability.' });
}

async function writeVisualCatalogs(quran, sinks, warnings) {
  const audioCatalog = audioCatalogFromQuran(quran);
  const imageFiles = (await readdir(paths.reciterImages, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name);
  const grouped = new Map();
  for (const fileName of imageFiles) {
    const match = /^(\d{3})-(.+)\.(jpe?g|png|webp)$/i.exec(fileName);
    if (!match) continue;
    const id = Number(match[1]);
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(fileName);
  }

  let duplicateIds = 0;
  for (const [id, files] of [...grouped.entries()].sort((a,b) => a[0]-b[0])) {
    const reciter = audioCatalog.get(id) ?? {};
    const selected = chooseBestReciterImage(files, reciter.reciter_ar);
    if (files.length > 1) duplicateIds += 1;
    await sinks.reciter_images.add({
      reciter_id: id,
      reciter_ar: reciter.reciter_ar,
      reciter_en: reciter.reciter_en,
      file_name: selected,
      image_path: selected ? `/data/reciter_images/${selected}` : null,
      duplicate_files_count: Math.max(0, files.length - 1)
    });
  }
  if (duplicateIds) warnings.push({ code: 'RECITER_IMAGE_DUPLICATE_IDS', count: duplicateIds, message: 'Multiple image files shared the same numeric reciter ID; the best Unicode/name match was selected, originals were not modified.' });

  const surahNameFiles = new Set((await readdir(paths.surahNames, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name));
  for (const surah of quran) {
    const number = Number(surah.number);
    const file = `${String(number).padStart(3,'0')}.svg`;
    await sinks.surah_names.add({
      surah_number: number,
      name_ar: surah.name?.ar,
      name_en: surah.name?.en,
      name_transliteration: surah.name?.transliteration,
      file_name: surahNameFiles.has(file) ? file : null,
      image_path: surahNameFiles.has(file) ? `/data/suwer-name/${file}` : null
    });
  }
}

async function locateAyahOnlyJson(source) {
  const files = await findNestedJsonFiles(source.folderPath);
  const filtered = files.filter((file) => path.basename(file) !== 'surah.json' && path.basename(file) !== 'segments.json');
  if (!filtered.length) return null;
  const exact = filtered.find((file) => path.basename(file) === source.sourceKey);
  return exact ?? filtered[0];
}

async function writeAyahBayah(quran, sinks, warnings) {
  const catalog = audioCatalogFromQuran(quran);
  const sources = await resolveAyahBayahSources();
  for (const source of sources) {
    if (!source.reciterId) {
      warnings.push({ code: 'AYAH_BAYAH_UNMAPPED_SOURCE', source: source.sourceKey, message: 'Source folder could not be mapped to a Quran audio reciter ID and was skipped.' });
      continue;
    }
    const reciter = catalog.get(source.reciterId) ?? {};
    const surahFile = path.join(source.folderPath, 'surah.json');
    const segmentsFile = path.join(source.folderPath, 'segments.json');
    const hasSurah = await exists(surahFile);
    const hasSegmentsFile = await exists(segmentsFile);
    const ayahOnlyFile = !hasSurah ? await locateAyahOnlyJson(source) : null;
    const sourceType = hasSurah ? 'surah_recitation' : 'ayah_recitation';
    let hasWordSegments = false;
    let hasAyahAudio = false;

    if (hasSurah) {
      const surahMap = await readJson(surahFile);
      for (const [key, value] of Object.entries(surahMap ?? {})) {
        const surah = toInt(value?.surah_number ?? key);
        if (!surah || surah < 1 || surah > 114) {
          warnings.push({ code: 'AYAH_BAYAH_INVALID_SURAH_AUDIO', source: source.sourceKey, key, message: 'Invalid surah audio entry preserved only as a warning and excluded from normalized tables.' });
          continue;
        }
        await sinks.ayah_bayah_surahs.add({
          reciter_id: source.reciterId,
          surah_number: surah,
          audio_url: value?.audio_url,
          duration: toFinite(value?.duration),
          source_file: path.relative(dataRoot, surahFile).replaceAll('\\','/')
        });
      }

      if (hasSegmentsFile) {
        const segmentMap = await readJson(segmentsFile);
        if (!Object.keys(segmentMap ?? {}).length) warnings.push({ code: 'AYAH_BAYAH_EMPTY_SEGMENTS', source: source.sourceKey, message: 'segments.json is empty; surah audio remains available but ayah/word tracking is unavailable for this source.' });
        const surahAudioMap = new Map(Object.values(surahMap ?? {}).map((value) => [toInt(value?.surah_number), value]).filter(([k]) => k));
        for (const [key, item] of Object.entries(segmentMap ?? {})) {
          const parsed = parseAyahKey(key);
          if (!parsed) continue;
          const words = (item?.segments ?? []).map(normalizeWordSegment).filter(Boolean);
          if (words.length) hasWordSegments = true;
          const surahAudio = surahAudioMap.get(parsed.surah);
          await sinks.ayah_bayah_ayahs.add({
            reciter_id: source.reciterId,
            source_resource_id: source.sourceResourceId,
            surah_number: parsed.surah,
            verse_number: parsed.verse,
            audio_mode: 'surah',
            time_base: 'surah',
            audio_url: surahAudio?.audio_url,
            duration_ms: toFinite(item?.duration_ms) ?? (toFinite(item?.duration_sec) !== null ? toFinite(item.duration_sec) * 1000 : null),
            timestamp_from_ms: toFinite(item?.timestamp_from),
            timestamp_to_ms: toFinite(item?.timestamp_to),
            segments_count: words.length,
            source_file: path.relative(dataRoot, segmentsFile).replaceAll('\\','/')
          });
          for (const [segmentIndex, word] of words.entries()) {
            await sinks.ayah_bayah_segments.add({
              reciter_id: source.reciterId,
              surah_number: parsed.surah,
              verse_number: parsed.verse,
              segment_index: segmentIndex + 1,
              word_number: word.word_number,
              start_time_ms: word.start_time_ms,
              end_time_ms: word.end_time_ms,
              time_base: 'surah',
              source_file: path.relative(dataRoot, segmentsFile).replaceAll('\\','/')
            });
          }
        }
      }
    } else if (ayahOnlyFile) {
      const ayahMap = await readJson(ayahOnlyFile);
      for (const [key, item] of Object.entries(ayahMap ?? {})) {
        const parsed = parseAyahKey(key);
        const surah = toInt(item?.surah_number) ?? parsed?.surah;
        const verse = toInt(item?.ayah_number) ?? parsed?.verse;
        if (!surah || !verse) continue;
        const words = (item?.segments ?? []).map(normalizeWordSegment).filter(Boolean);
        if (words.length) hasWordSegments = true;
        if (item?.audio_url) hasAyahAudio = true;
        const durationRaw = toFinite(item?.duration);
        const durationMs = durationRaw === null ? null : (durationRaw > 1000 ? durationRaw : durationRaw * 1000);
        await sinks.ayah_bayah_ayahs.add({
          reciter_id: source.reciterId,
          source_resource_id: source.sourceResourceId,
          surah_number: surah,
          verse_number: verse,
          audio_mode: 'ayah',
          time_base: 'ayah',
          audio_url: item?.audio_url,
          duration_ms: durationMs,
          timestamp_from_ms: null,
          timestamp_to_ms: null,
          segments_count: words.length,
          source_file: path.relative(dataRoot, ayahOnlyFile).replaceAll('\\','/')
        });
        for (const [segmentIndex, word] of words.entries()) {
          await sinks.ayah_bayah_segments.add({
            reciter_id: source.reciterId,
            surah_number: surah,
            verse_number: verse,
            segment_index: segmentIndex + 1,
            word_number: word.word_number,
            start_time_ms: word.start_time_ms,
            end_time_ms: word.end_time_ms,
            time_base: 'ayah',
            source_file: path.relative(dataRoot, ayahOnlyFile).replaceAll('\\','/')
          });
        }
      }
    } else {
      warnings.push({ code: 'AYAH_BAYAH_SOURCE_WITHOUT_JSON', source: source.sourceKey, message: 'No supported JSON data file was found for this source.' });
    }

    await sinks.ayah_bayah_reciters.add({
      reciter_id: source.reciterId,
      source_resource_id: source.sourceResourceId,
      reciter_ar: reciter.reciter_ar,
      reciter_en: reciter.reciter_en,
      rewaya_ar: reciter.rewaya_ar,
      rewaya_en: reciter.rewaya_en,
      source_key: source.sourceKey,
      source_type: sourceType,
      has_surah_audio: hasSurah ? 1 : 0,
      has_ayah_audio: hasAyahAudio ? 1 : 0,
      has_word_segments: hasWordSegments ? 1 : 0
    });
  }
}

async function writeApiReference(sinks) {
  const api = await readJson(paths.apiReference);
  await sinks.api_reference.add({
    id: 1,
    title: api.api_info?.title ?? 'Quran Data API',
    description: api.api_info?.description,
    version: api.api_info?.version ?? SCHEMA_VERSION,
    base_url: api.api_info?.base_url,
    documentation_url: api.api_info?.documentation_url,
    github_url: api.api_info?.github_url,
    json_content: JSON.stringify(api),
    statistics: JSON.stringify(api.statistics ?? {})
  });
}

async function writeSourceManifest(sinks) {
  for (const row of await sourceFileRows()) await sinks.source_files.add(row);
}

function tableInfo(sinks, generatedAt) {
  return Object.fromEntries(Object.entries(sinks).map(([name, sink]) => [name, {
    rows: sink.count,
    description: tableSchemas[name].description,
    primary_key: tableSchemas[name].primary_key,
    json: `database/${name}.json`,
    csv: `database/${name}.csv`,
    generated_at: generatedAt
  }]));
}

async function writeIndexes(formats, sinks, warnings, db, generatedAt) {
  const tables = tableInfo(sinks, generatedAt);
  const manifest = {
    project: 'Quran Data',
    schema_version: SCHEMA_VERSION,
    generated_at: generatedAt,
    complete_normalized_export: true,
    note: 'This is a normalized multi-file database. Binary image assets remain in data/ and are referenced by path rather than embedded.',
    tables,
    warnings
  };
  const schema = {
    schema_version: SCHEMA_VERSION,
    generated_at: generatedAt,
    tables: tableSchemas
  };

  if (formats.json) {
    await writePrettyJson(path.join(jsonDatabaseDir, 'manifest.json'), manifest);
    await writePrettyJson(path.join(jsonDatabaseDir, 'schema.json'), schema);
    await writePrettyJson(path.join(dataRoot, 'json', 'database.json'), {
      ...manifest,
      manifest_file: 'database/manifest.json',
      schema_file: 'database/schema.json'
    });
  }

  if (formats.csv) {
    const lines = ['dataset_name,row_count,csv_file,json_file,description'];
    const esc = (value) => `"${String(value ?? '').replaceAll('"','""')}"`;
    for (const [name, info] of Object.entries(tables)) lines.push([name, info.rows, info.csv, info.json, info.description].map(esc).join(','));
    await writeFile(path.join(dataRoot, 'csv', 'database.csv'), `${lines.join('\n')}\n`, 'utf8');
    await writePrettyJson(path.join(csvDatabaseDir, 'schema.json'), schema);
  }

  if (db) {
    const insertMeta = db.prepare('INSERT INTO schema_meta(key,value) VALUES (?,?)');
    insertMeta.run('schema_version', SCHEMA_VERSION);
    insertMeta.run('generated_at', generatedAt);
    insertMeta.run('complete_normalized_export', 'true');
    const insertManifest = db.prepare('INSERT INTO dataset_manifest(dataset_name,row_count,json_file,csv_file,description,generated_at) VALUES (?,?,?,?,?,?)');
    for (const [name, info] of Object.entries(tables)) insertManifest.run(name, info.rows, info.json, info.csv, info.description, generatedAt);
  }
  return manifest;
}

export async function run({ formats = parseFormats(), clean = true } = {}) {
  const generatedAt = new Date().toISOString();
  console.log(`🏗️ Quran Data build ${SCHEMA_VERSION} — formats: ${Object.entries(formats).filter(([,v]) => v).map(([k])=>k).join(', ')}`);
  if (!formats.json && !formats.csv && !formats.sqlite) throw new Error('No output format selected. Use --formats=json,csv,sqlite or --formats=all');

  if (clean) await cleanGenerated(formats);
  if (formats.json) await ensureDir(jsonDatabaseDir);
  if (formats.csv) await ensureDir(csvDatabaseDir);
  if (formats.sqlite) await ensureDir(path.dirname(sqlitePath));

  const [quran, pages] = await Promise.all([readJson(paths.mainQuran), readJson(paths.pages)]);
  validateMainQuran(quran);

  const warnings = [];
  const db = formats.sqlite ? new DatabaseSync(sqlitePath) : null;
  if (db) createDatabase(db);
  const stmt = statements(db);
  const sinks = await makeSinks(formats, stmt);

  try {
    if (db) db.exec('BEGIN IMMEDIATE TRANSACTION;');
    await writeBaseQuran(quran, pages, sinks);
    await writeLegacyTiming(quran, sinks, warnings);
    await writeVisualCatalogs(quran, sinks, warnings);
    await writeAyahBayah(quran, sinks, warnings);
    await writeApiReference(sinks);
    await writeSourceManifest(sinks);
    await closeSinks(sinks);
    const manifest = await writeIndexes(formats, sinks, warnings, db, generatedAt);
    if (db) {
      db.exec('COMMIT;');
      db.exec('PRAGMA foreign_keys = ON;');
      db.exec('ANALYZE;');
    }
    console.log('✅ Comprehensive data build complete.');
    console.log(JSON.stringify({ generated_at: generatedAt, tables: Object.fromEntries(Object.entries(sinks).map(([k,v]) => [k,v.count])), warnings }, null, 2));
    return manifest;
  } catch (error) {
    try { if (db) db.exec('ROLLBACK;'); } catch {}
    throw error;
  } finally {
    try { await closeSinks(Object.fromEntries(Object.entries(sinks).filter(([,s]) => s.jsonWriter?.handle || s.csvWriter?.handle))); } catch {}
    db?.close();
  }
}

if (isDirect) {
  run().catch((error) => {
    console.error('❌ buildData failed:', error);
    process.exit(1);
  });
}
