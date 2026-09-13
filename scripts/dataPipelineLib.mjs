import { access, mkdir, open, readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const root = path.join(__dirname, '..');
export const dataRoot = path.join(root, 'data');
export const jsonDatabaseDir = path.join(dataRoot, 'json', 'database');
export const csvDatabaseDir = path.join(dataRoot, 'csv', 'database');
export const sqlitePath = path.join(dataRoot, 'sqlite', 'database.sqlite');
export const SCHEMA_VERSION = '3.1.0';

export const paths = {
  mainQuran: path.join(dataRoot, 'mainDataQuran.json'),
  pages: path.join(dataRoot, 'pagesQuran.json'),
  apiReference: path.join(dataRoot, 'json', 'api_reference.json'),
  legacyTimingReciters: path.join(dataRoot, 'json', 'reads_timing_data', 'ayat_timing_reads_hafs_114_only.json'),
  legacyTimingDir: path.join(dataRoot, 'json', 'reads_timing_data', 'timings_hafs_114'),
  ayahAudio: path.join(dataRoot, 'audio_verseByverse', 'ayahBayah.json'),
  ayahBayahRoot: path.join(dataRoot, 'Timming-Reciters-ayahBayah'),
  reciterImages: path.join(dataRoot, 'reciter_images'),
  surahNames: path.join(dataRoot, 'suwer-name'),
  quranImages: path.join(dataRoot, 'quran_image')
};

export const tableSchemas = {
  surahs: {
    description: 'بيانات السور الأساسية.',
    primary_key: ['number'],
    columns: ['number','name_ar','name_en','name_transliteration','revelation_place_ar','revelation_place_en','verses_count','words_count','letters_count']
  },
  verses: {
    description: 'جميع آيات القرآن مع النص والترقيم والجزء والصفحة.',
    primary_key: ['surah_number','verse_number'],
    columns: ['surah_number','number','text_ar','text_en','juz','page','sajda']
  },
  audio: {
    description: 'تلاوات السور لجميع القراء.',
    primary_key: ['reciter_id','surah_number'],
    columns: ['id','surah_number','reciter_ar','reciter_en','rewaya_ar','rewaya_en','server','link']
  },
  quran_pages: {
    description: 'فهرس صفحات المصحف وصورة كل صفحة وحدود السور والآيات.',
    primary_key: ['page_number'],
    columns: ['page_number','image_path','start_surah_number','start_verse_number','end_surah_number','end_verse_number']
  },
  timing_reciters: {
    description: 'قراء بيانات التوقيت التقليدية.',
    primary_key: ['reciter_id'],
    columns: ['id','name','rewaya','folder_url','soar_count','soar_link']
  },
  ayat_timing: {
    description: 'توقيت الآيات التقليدي بالمللي ثانية. verse_number=0 محفوظ كما ورد في المصدر للبسمـلة/المقدمات.',
    primary_key: ['reciter_id','surah_number','verse_number'],
    columns: ['reciter_id','surah_number','verse_number','start_time_ms','end_time_ms','source_file']
  },
  ayat_timing_geometry: {
    description: 'إحداثيات الآيات والصفحة من بيانات التوقيت.',
    primary_key: ['surah_number','verse_number'],
    columns: ['surah_number','verse_number','polygon','x','y','page_number']
  },
  ayah_audio_reciters: {
    description: 'قراء الصوت آية بآية وروابط bitrate المتاحة.',
    primary_key: ['reciter_id'],
    columns: ['id','name','rewaya','musshaf_type','audio_url_bit_rate_32','audio_url_bit_rate_64','audio_url_bit_rate_128']
  },
  reciter_images: {
    description: 'فهرس صور القراء؛ الصورة لا تخزن داخل قواعد البيانات وإنما يخزن مسارها.',
    primary_key: ['reciter_id'],
    columns: ['reciter_id','reciter_ar','reciter_en','file_name','image_path','duplicate_files_count']
  },
  surah_names: {
    description: 'فهرس ملفات SVG لأسماء السور.',
    primary_key: ['surah_number'],
    columns: ['surah_number','name_ar','name_en','name_transliteration','file_name','image_path']
  },
  ayah_bayah_reciters: {
    description: 'قراء بيانات التتبع الحديثة من Timming-Reciters-ayahBayah.',
    primary_key: ['reciter_id'],
    columns: ['reciter_id','source_resource_id','reciter_ar','reciter_en','rewaya_ar','rewaya_en','source_key','source_type','has_surah_audio','has_ayah_audio','has_word_segments']
  },
  ayah_bayah_surahs: {
    description: 'ملفات صوت السور لقراء التتبع الحديثة.',
    primary_key: ['reciter_id','surah_number'],
    columns: ['reciter_id','surah_number','audio_url','duration','source_file']
  },
  ayah_bayah_ayahs: {
    description: 'بيانات الآية للتتبع الحديث؛ الوقت إما داخل السورة أو داخل ملف الآية حسب time_base.',
    primary_key: ['reciter_id','surah_number','verse_number'],
    columns: ['reciter_id','source_resource_id','surah_number','verse_number','audio_mode','time_base','audio_url','duration_ms','timestamp_from_ms','timestamp_to_ms','segments_count','source_file']
  },
  ayah_bayah_segments: {
    description: 'تقسيم الكلمات في بيانات التتبع الحديث.',
    primary_key: ['reciter_id','surah_number','verse_number','segment_index'],
    columns: ['reciter_id','surah_number','verse_number','segment_index','word_number','start_time_ms','end_time_ms','time_base','source_file']
  },
  api_reference: {
    description: 'مرجع API الحالي كـ JSON خام إلى جانب أهم الحقول.',
    primary_key: ['id'],
    columns: ['id','title','description','version','base_url','documentation_url','github_url','json_content','statistics']
  },
  source_files: {
    description: 'فهرس الملفات الموجودة داخل data حتى يمكن تدقيق اكتمال المصدر والأصول البصرية.',
    primary_key: ['file_path'],
    columns: ['file_path','category','extension','size_bytes']
  }
};

const KNOWN_FOLDER_RECITER_IDS = new Map([
  ['surah-recitation-bandar-baleela', 29],
  ['ayah-recitation-saud-al-shuraim-murattal-hafs-960.json', 46],
  ['surah-recitation-abdul-rahman-al-sudais', 68],
  ['surah-recitation-abdullah-awad-al-juhani', 82],
  ['surah-recitation-ali-abdur-rahman-al-huthaify', 90],
  ['surah-recitation-maher-al-muaiqly', 101],
  ['ayah-recitation-muhammad-siddiq-al-minshawi-murattal-hafs-959.json', 112],
  ['surah-recitation-mishari-al-afasy', 131],
  ['surah-recitation-yasser-al-dosari', 152]
]);

export function knownAyahBayahReciterId(sourceKey) {
  return KNOWN_FOLDER_RECITER_IDS.get(sourceKey) ?? null;
}

export function sourceResourceId(sourceKey) {
  const match = /-(\d+)\.json$/i.exec(sourceKey);
  return match ? Number(match[1]) : null;
}

export async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

export async function cleanGenerated(formats = { json: true, csv: true, sqlite: true }) {
  const jobs = [];
  if (formats.json) {
    jobs.push(rm(jsonDatabaseDir, { recursive: true, force: true }));
    jobs.push(rm(path.join(dataRoot, 'json', 'database.json'), { force: true }));
  }
  if (formats.csv) {
    jobs.push(rm(csvDatabaseDir, { recursive: true, force: true }));
    jobs.push(rm(path.join(dataRoot, 'csv', 'database.csv'), { force: true }));
  }
  if (formats.sqlite) jobs.push(rm(sqlitePath, { force: true }));
  await Promise.all(jobs);
}

export function toFinite(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

export function normalizeArabic(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\u0600-\u06FF0-9]+/g, '')
    .trim();
}

function mojibakePenalty(value) {
  return [...String(value ?? '')].filter((c) => '╪┘╦╩▒▓│─'.includes(c)).length;
}

export function chooseBestReciterImage(fileNames, expectedArabic = '') {
  const target = normalizeArabic(expectedArabic);
  return [...fileNames].sort((a, b) => {
    const score = (name) => {
      const stem = name.replace(/^\d{3}-/, '').replace(/\.[^.]+$/, '');
      const normalized = normalizeArabic(stem);
      let value = 0;
      if (target && normalized === target) value += 10000;
      if (target && (normalized.includes(target) || target.includes(normalized))) value += 2500;
      value += [...stem].filter((c) => /[\u0600-\u06FF]/.test(c)).length * 10;
      value -= mojibakePenalty(stem) * 1000;
      if (/\.jpe?g$/i.test(name)) value += 5;
      return value;
    };
    return score(b) - score(a) || a.localeCompare(b, 'ar');
  })[0] ?? null;
}

export function extractPageNumber(pageUrl) {
  const match = String(pageUrl ?? '').match(/\/(\d{1,3})\.(?:svg|png|jpg|jpeg|webp)$/i);
  return match ? Number(match[1]) : null;
}

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export class BufferedFile {
  constructor(filePath, threshold = 1024 * 1024) {
    this.filePath = filePath;
    this.threshold = threshold;
    this.handle = null;
    this.buffer = '';
  }
  async open() {
    await ensureDir(path.dirname(this.filePath));
    this.handle = await open(this.filePath, 'w');
  }
  async append(text) {
    this.buffer += text;
    if (this.buffer.length >= this.threshold) await this.flush();
  }
  async flush() {
    if (!this.buffer) return;
    const value = this.buffer;
    this.buffer = '';
    await this.handle.write(value);
  }
  async close() {
    await this.flush();
    await this.handle?.close();
    this.handle = null;
  }
}

export class ExportSink {
  constructor({ name, columns, json = true, csv = true, sqliteStatement = null }) {
    this.name = name;
    this.columns = columns;
    this.jsonEnabled = json;
    this.csvEnabled = csv;
    this.sqliteStatement = sqliteStatement;
    this.count = 0;
    this.jsonWriter = json ? new BufferedFile(path.join(jsonDatabaseDir, `${name}.json`)) : null;
    this.csvWriter = csv ? new BufferedFile(path.join(csvDatabaseDir, `${name}.csv`)) : null;
  }
  async open() {
    if (this.jsonWriter) { await this.jsonWriter.open(); await this.jsonWriter.append('[\n'); }
    if (this.csvWriter) { await this.csvWriter.open(); await this.csvWriter.append(`${this.columns.map(csvCell).join(',')}\n`); }
  }
  async add(row) {
    const normalized = {};
    for (const column of this.columns) normalized[column] = row[column] ?? null;
    if (this.sqliteStatement) this.sqliteStatement.run(...this.columns.map((column) => normalized[column]));
    if (this.jsonWriter) {
      const prefix = this.count ? ',\n' : '';
      await this.jsonWriter.append(prefix + JSON.stringify(normalized));
    }
    if (this.csvWriter) await this.csvWriter.append(`${this.columns.map((column) => csvCell(normalized[column])).join(',')}\n`);
    this.count += 1;
  }
  async close() {
    if (this.jsonWriter) { await this.jsonWriter.append('\n]\n'); await this.jsonWriter.close(); }
    if (this.csvWriter) await this.csvWriter.close();
  }
}

export async function listFilesRecursive(dirPath, base = dirPath) {
  const out = [];
  if (!await exists(dirPath)) return out;
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) out.push(...await listFilesRecursive(full, base));
    else if (entry.isFile()) out.push({ fullPath: full, relativePath: path.relative(base, full).replaceAll('\\','/') });
  }
  return out;
}

export function categoryForDataPath(relativePath) {
  const first = String(relativePath).split('/')[0] || 'root';
  return first.includes('.') ? 'root' : first;
}

export async function sourceFileRows() {
  const files = await listFilesRecursive(dataRoot, dataRoot);
  const excludedPrefixes = [
    'json/database/',
    'csv/database/'
  ];
  const excludedExact = new Set(['json/database.json','csv/database.csv','sqlite/database.sqlite']);
  const rows = [];
  for (const file of files) {
    if (excludedExact.has(file.relativePath) || excludedPrefixes.some((prefix) => file.relativePath.startsWith(prefix))) continue;
    const info = await stat(file.fullPath);
    rows.push({
      file_path: file.relativePath,
      category: categoryForDataPath(file.relativePath),
      extension: path.extname(file.relativePath).toLowerCase() || null,
      size_bytes: Number(info.size)
    });
  }
  rows.sort((a,b) => a.file_path.localeCompare(b.file_path));
  return rows;
}

export function audioCatalogFromQuran(quran) {
  const map = new Map();
  for (const surah of quran) {
    for (const audio of surah.audio ?? []) {
      const id = Number(audio.id);
      if (!Number.isInteger(id) || map.has(id)) continue;
      map.set(id, {
        reciter_id: id,
        reciter_ar: audio.reciter?.ar ?? null,
        reciter_en: audio.reciter?.en ?? null,
        rewaya_ar: audio.rewaya?.ar ?? null,
        rewaya_en: audio.rewaya?.en ?? null
      });
    }
  }
  return map;
}

export async function resolveAyahBayahSources() {
  if (!await exists(paths.ayahBayahRoot)) return [];
  const entries = await readdir(paths.ayahBayahRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => ({
    sourceKey: entry.name,
    folderPath: path.join(paths.ayahBayahRoot, entry.name),
    reciterId: knownAyahBayahReciterId(entry.name),
    sourceResourceId: sourceResourceId(entry.name)
  })).sort((a,b) => (a.reciterId ?? 9999) - (b.reciterId ?? 9999) || a.sourceKey.localeCompare(b.sourceKey));
}

export async function findNestedJsonFiles(dirPath, depth = 0, maxDepth = 3) {
  if (depth > maxDepth || !await exists(dirPath)) return [];
  const out = [];
  for (const entry of await readdir(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) out.push(...await findNestedJsonFiles(full, depth + 1, maxDepth));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) out.push(full);
  }
  return out;
}

export function parseAyahKey(key) {
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(String(key));
  return match ? { surah: Number(match[1]), verse: Number(match[2]) } : null;
}

export function normalizeWordSegment(segment) {
  if (!Array.isArray(segment) || segment.length < 3) return null;
  const word = toInt(segment[0]);
  const start = toFinite(segment[1]);
  const end = toFinite(segment[2]);
  if (word === null || start === null || end === null) return null;
  return { word_number: word, start_time_ms: start, end_time_ms: end };
}

export async function writePrettyJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  const handle = await open(filePath, 'w');
  try { await handle.write(`${JSON.stringify(value, null, 2)}\n`); } finally { await handle.close(); }
}
