import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dataRootPath = path.join(__dirname, '..', '..', 'data');
export const reciterBasePath = path.join(dataRootPath, 'Timming-Reciters-ayahBayah');
export const reciterImagesPath = path.join(dataRootPath, 'reciter_images');
export const reciterImagesManifestPath = path.join(reciterImagesPath, 'manifest.json');
export const surahOnePath = path.join(dataRootPath, 'json', 'surah', 'surah_1.json');

let reciterCatalogCache = null;
let ayahBayahRecitersCache = null;

export const readJsonIfExists = async (filePath) => {
    try {
        const raw = await fsp.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
    }
};

const asArray = (value) => Array.isArray(value) ? value : [];
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function extractAudioCatalog(source) {
    if (Array.isArray(source)) return source;
    if (!isObject(source)) return [];

    const candidates = [
        source.audio,
        source.result?.audio,
        source.data?.audio,
        source.surah?.audio,
        source.result,
        source.data
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;
    }

    return [];
}

export async function loadAudioCatalog() {
    const source = await readJsonIfExists(surahOnePath);
    return extractAudioCatalog(source)
        .filter((item) => item && Number.isInteger(Number(item.id)))
        .map((item) => ({
            id: Number(item.id),
            reciter: {
                ar: item.reciter?.ar || item.reciter_ar || null,
                en: item.reciter?.en || item.reciter_en || null
            },
            rewaya: {
                ar: item.rewaya?.ar || item.rewaya_ar || null,
                en: item.rewaya?.en || item.rewaya_en || null
            },
            server: item.server || null,
            link: item.link || null
        }))
        .sort((a, b) => a.id - b.id);
}

function publicDataUrl(relativePath) {
    if (!relativePath) return null;
    const normalized = String(relativePath).replace(/\\/g, '/').replace(/^\/+/, '');
    return `/data/${normalized.split('/').map(encodeURIComponent).join('/')}`;
}

export function relativeDataUrl(fileOrFolderPath) {
    return publicDataUrl(path.relative(dataRootPath, fileOrFolderPath));
}

async function getReciterImageFileMap() {
    const map = new Map();
    if (!fs.existsSync(reciterImagesPath)) return map;

    const entries = await fsp.readdir(reciterImagesPath);
    for (const fileName of entries) {
        const match = /^(\d{3})-(.+)\.(jpe?g|png|webp)$/i.exec(fileName);
        if (!match) continue;
        const id = Number(match[1]);
        if (!map.has(id)) map.set(id, fileName);
    }
    return map;
}

export async function loadReciterCatalogWithImages({ refresh = false } = {}) {
    if (reciterCatalogCache && !refresh) return reciterCatalogCache;

    const [catalog, manifestRaw, imageFiles] = await Promise.all([
        loadAudioCatalog(),
        readJsonIfExists(reciterImagesManifestPath),
        getReciterImageFileMap()
    ]);

    const manifest = asArray(manifestRaw);
    const manifestById = new Map(
        manifest
            .filter((item) => Number.isInteger(Number(item?.id)))
            .map((item) => [Number(item.id), item])
    );

    if (catalog.length) {
        reciterCatalogCache = catalog.map((item) => {
            const manifestItem = manifestById.get(item.id) || {};
            const file = imageFiles.get(item.id) || manifestItem.file || null;
            return {
                ...item,
                name: item.reciter.ar || item.reciter.en || manifestItem.name || null,
                image: {
                    file,
                    url: file ? publicDataUrl(`reciter_images/${file}`) : null
                },
                source_page: manifestItem.source_page || null,
                matched_name: manifestItem.matched_name || null
            };
        });
        return reciterCatalogCache;
    }

    // Fallback only if surah_1.json is unavailable.
    reciterCatalogCache = manifest.map((item) => {
        const id = Number.isInteger(Number(item?.id)) ? Number(item.id) : null;
        const file = (id && imageFiles.get(id)) || item.file || null;
        return {
            id,
            reciter: { ar: item.name || null, en: null },
            rewaya: { ar: null, en: null },
            server: null,
            link: null,
            name: item.name || null,
            image: {
                file,
                url: file ? publicDataUrl(`reciter_images/${file}`) : null
            },
            source_page: item.source_page || null,
            matched_name: item.matched_name || null
        };
    });
    return reciterCatalogCache;
}

function normalizeLatin(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\b(abdur|abdel|abdal|abd ar|abd al)\b/g, 'abdul')
        .replace(/\b(as|ash|ad)\b/g, 'al')
        .replace(/hudhaify|huthaifi|huthaify/g, 'huthaify')
        .replace(/dussary|dossary|dosary/g, 'dosari')
        .replace(/muaiqly|muaiqili|muayqili|muaiqly/g, 'muaiqly')
        .replace(/afasy|afassy|afasi/g, 'afasy')
        .replace(/juhany|juhani/g, 'juhani')
        .replace(/shuraim|shuraym/g, 'shuraim')
        .replace(/minshawi|minshawy/g, 'minshawi')
        .replace(/baleela|balilah/g, 'baleela')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function normalizeArabic(value) {
    return String(value || '')
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

function folderToNameHint(folderName) {
    return normalizeLatin(folderName)
        .replace(/^surah recitation /, '')
        .replace(/^ayah recitation /, '')
        .replace(/ murattal hafs \d+ json$/, '')
        .replace(/ murattal hafs \d+$/, '')
        .replace(/ hafs \d+ json$/, '')
        .replace(/ hafs \d+$/, '')
        .replace(/ \d+ json$/, '')
        .replace(/ \d+$/, '')
        .trim();
}


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

const KNOWN_FOLDER_ARABIC_NAMES = new Map([
    ['surah-recitation-abdul-rahman-al-sudais', 'عبدالرحمن السديس'],
    ['surah-recitation-abdullah-awad-al-juhani', 'عبدالله عواد الجهني'],
    ['surah-recitation-ali-abdur-rahman-al-huthaify', 'علي الحذيفي'],
    ['surah-recitation-bandar-baleela', 'بندر بليله'],
    ['surah-recitation-maher-al-muaiqly', 'ماهر المعيقلي'],
    ['surah-recitation-mishari-al-afasy', 'مشاري العفاسي'],
    ['surah-recitation-yasser-al-dosari', 'ياسر الدوسري'],
    ['ayah-recitation-muhammad-siddiq-al-minshawi-murattal-hafs-959.json', 'محمد صديق المنشاوي'],
    ['ayah-recitation-saud-al-shuraim-murattal-hafs-960.json', 'سعود الشريم']
]);

function nameScore(hint, candidate) {
    if (!hint || !candidate) return 0;
    if (hint === candidate) return 100;
    if (hint.includes(candidate) || candidate.includes(hint)) return 90;

    const left = new Set(hint.split(/\s+/).filter(Boolean));
    const right = new Set(candidate.split(/\s+/).filter(Boolean));
    if (!left.size || !right.size) return 0;

    let common = 0;
    for (const token of left) if (right.has(token)) common += 1;
    return Math.round((common / Math.max(left.size, right.size)) * 80);
}

function isHafs(item) {
    const ar = String(item?.rewaya?.ar || '');
    const en = String(item?.rewaya?.en || '').toLowerCase();
    return ar.includes('حفص') || en.includes('hafs');
}

export function matchCatalogReciter(catalog, folderName) {
    const exactId = KNOWN_FOLDER_RECITER_IDS.get(folderName);
    if (exactId) {
        const exactById = catalog.find((item) => item.id === exactId);
        if (exactById) return exactById;
    }

    const exactArabic = KNOWN_FOLDER_ARABIC_NAMES.get(folderName);
    if (exactArabic) {
        const target = normalizeArabic(exactArabic);
        const exactMatches = catalog
            .filter((item) => normalizeArabic(item.reciter?.ar) === target)
            .sort((a, b) => Number(isHafs(b)) - Number(isHafs(a)) || a.id - b.id);
        if (exactMatches.length) return exactMatches[0];
    }

    const hint = folderToNameHint(folderName);
    const ranked = catalog
        .map((item) => {
            const score = nameScore(hint, normalizeLatin(item.reciter?.en));
            return { item, score: score + (isHafs(item) ? 5 : 0) };
        })
        .filter(({ score }) => score >= 45)
        .sort((a, b) => b.score - a.score || a.item.id - b.item.id);

    return ranked[0]?.item || null;
}

function parseSourceRecitationId(folderName) {
    const match = /-(\d+)\.json$/i.exec(folderName);
    return match ? Number(match[1]) : null;
}

async function findJsonFiles(folderPath, maxDepth = 2, depth = 0) {
    if (depth > maxDepth || !fs.existsSync(folderPath)) return [];
    const entries = await fsp.readdir(folderPath, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
            results.push(fullPath);
        } else if (entry.isDirectory() && depth < maxDepth) {
            results.push(...await findJsonFiles(fullPath, maxDepth, depth + 1));
        }
    }
    return results;
}

function firstNumber(...values) {
    for (const value of values) {
        const number = Number(value);
        if (Number.isInteger(number) && number > 0) return number;
    }
    return null;
}

function firstFiniteNumber(...values) {
    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const number = Number(value);
        if (Number.isFinite(number)) return number;
    }
    return null;
}

function normalizeAyahRecord(item, keyHint = null) {
    if (!isObject(item)) return null;

    const keyParts = typeof keyHint === 'string' && /^\d+:\d+$/.test(keyHint)
        ? keyHint.split(':').map(Number)
        : [];

    const surah = firstNumber(
        item.surah,
        item.surah_number,
        item.chapter,
        item.chapter_number,
        item.chapter_id,
        keyParts[0]
    );
    const ayah = firstNumber(
        item.ayah,
        item.ayah_number,
        item.verse,
        item.verse_number,
        item.verse_id,
        keyParts[1]
    );

    if (!surah || !ayah) return null;

    const audioUrl = typeof item.audio_url === 'string' ? item.audio_url
        : typeof item.url === 'string' ? item.url
        : typeof item.audio === 'string' ? item.audio
        : typeof item.audio?.url === 'string' ? item.audio.url
        : typeof item.file_url === 'string' ? item.file_url
        : null;

    return {
        surah,
        ayah,
        audio_url: audioUrl,
        segments: Array.isArray(item.segments) ? item.segments : [],
        duration_sec: firstFiniteNumber(item.duration_sec, item.duration_seconds),
        duration_ms: firstFiniteNumber(item.duration_ms),
        timestamp_from: firstFiniteNumber(item.timestamp_from, item.start_time_ms, item.start_ms),
        timestamp_to: firstFiniteNumber(item.timestamp_to, item.end_time_ms, item.end_ms),
        raw: item
    };
}

export function extractAyahRecords(source) {
    const records = [];
    const seen = new Set();

    const push = (item, keyHint = null) => {
        const normalized = normalizeAyahRecord(item, keyHint);
        if (!normalized) return false;
        const key = `${normalized.surah}:${normalized.ayah}:${normalized.audio_url || ''}`;
        if (seen.has(key)) return true;
        seen.add(key);
        records.push(normalized);
        return true;
    };

    const visit = (value, depth = 0, keyHint = null) => {
        if (depth > 3 || value == null) return;
        if (Array.isArray(value)) {
            for (const item of value) visit(item, depth + 1);
            return;
        }
        if (!isObject(value)) return;

        if (push(value, keyHint)) return;

        for (const [key, child] of Object.entries(value)) {
            if (/^\d+:\d+$/.test(key) && isObject(child)) {
                push(child, key);
                continue;
            }
            if (['data', 'ayahs', 'verses', 'items', 'records', 'result', 'recitation'].includes(key)) {
                visit(child, depth + 1);
            }
        }
    };

    visit(source);
    return records.sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);
}

function normalizeSurahAudioMap(source) {
    const map = {};
    if (!source) return map;

    const put = (surah, value) => {
        const number = firstNumber(surah);
        if (!number || number > 114) return;
        map[String(number)] = value;
    };

    if (Array.isArray(source)) {
        for (const item of source) {
            if (!isObject(item)) continue;
            const surah = firstNumber(item.surah, item.surah_number, item.chapter, item.chapter_number, item.id);
            if (surah) put(surah, item);
        }
        return map;
    }

    if (!isObject(source)) return map;

    const candidates = [source.data, source.surahs, source.audio, source.result];
    for (const candidate of candidates) {
        const nested = normalizeSurahAudioMap(candidate);
        if (Object.keys(nested).length) return nested;
    }

    for (const [key, value] of Object.entries(source)) {
        if (/^\d{1,3}$/.test(key)) put(Number(key), value);
    }

    return map;
}

function extractSurahSegmentMap(source) {
    const map = {};
    const visit = (value, depth = 0) => {
        if (depth > 3 || !isObject(value)) return;
        for (const [key, child] of Object.entries(value)) {
            if (/^\d+:\d+$/.test(key) && isObject(child)) {
                map[key] = child;
                continue;
            }
            if (['data', 'segments', 'ayahs', 'verses', 'result'].includes(key)) visit(child, depth + 1);
        }
    };
    visit(source);
    return map;
}

function summarizeWordSegments(records) {
    return records.reduce((sum, item) => sum + (Array.isArray(item.segments) ? item.segments.length : 0), 0);
}

export async function loadAyahBayahDataset(folderPath, folderName) {
    const surahPath = path.join(folderPath, 'surah.json');
    const segmentsPath = path.join(folderPath, 'segments.json');
    const [surahData, segmentsData] = await Promise.all([
        readJsonIfExists(surahPath),
        readJsonIfExists(segmentsPath)
    ]);

    if (surahData || segmentsData) {
        const audioFiles = normalizeSurahAudioMap(surahData);
        const segmentMap = extractSurahSegmentMap(segmentsData);
        const segmentRecords = Object.entries(segmentMap)
            .map(([key, value]) => normalizeAyahRecord(value, key))
            .filter(Boolean);

        const surahNumbers = new Set([
            ...Object.keys(audioFiles).map(Number),
            ...segmentRecords.map((item) => item.surah)
        ]);

        return {
            type: 'surah-by-surah',
            audio_files: audioFiles,
            segment_map: segmentMap,
            ayah_records: segmentRecords,
            surah_count: surahNumbers.size,
            ayah_count: segmentRecords.length,
            timed_ayah_count: segmentRecords.length,
            word_segments_count: summarizeWordSegments(segmentRecords),
            source_files: [surahPath, segmentsPath].filter((item) => fs.existsSync(item)),
            source_recitation_id: parseSourceRecitationId(folderName)
        };
    }

    const jsonFiles = await findJsonFiles(folderPath, 2);
    let allRecords = [];
    const sourceFiles = [];
    for (const jsonFile of jsonFiles) {
        const raw = await readJsonIfExists(jsonFile);
        const records = extractAyahRecords(raw);
        if (records.length) {
            allRecords = allRecords.concat(records);
            sourceFiles.push(jsonFile);
        }
    }

    const unique = new Map();
    for (const record of allRecords) {
        unique.set(`${record.surah}:${record.ayah}`, record);
    }
    const ayahRecords = [...unique.values()].sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);
    const surahs = new Set(ayahRecords.map((item) => item.surah));

    return {
        type: 'ayah-by-ayah',
        audio_files: {},
        segment_map: {},
        ayah_records: ayahRecords,
        surah_count: surahs.size,
        ayah_count: ayahRecords.length,
        timed_ayah_count: ayahRecords.filter((item) => item.segments.length).length,
        word_segments_count: summarizeWordSegments(ayahRecords),
        source_files: sourceFiles,
        source_recitation_id: parseSourceRecitationId(folderName)
    };
}

function formatDatasetReciter(catalogItem, folderName, dataset, folderPath) {
    const sourceRecitationId = dataset.source_recitation_id || parseSourceRecitationId(folderName);
    const fallbackName = folderToNameHint(folderName) || folderName;

    return {
        id: catalogItem?.id ?? null,
        source_recitation_id: sourceRecitationId,
        slug: folderName,
        folder_name: folderName,
        name: catalogItem?.reciter?.ar || catalogItem?.reciter?.en || fallbackName,
        reciter: catalogItem?.reciter || { ar: null, en: fallbackName },
        rewaya: catalogItem?.rewaya || { ar: null, en: null },
        server: catalogItem?.server || null,
        link: catalogItem?.link || null,
        image: catalogItem?.image || { file: null, url: null },
        image_url: catalogItem?.image?.url || null,
        source_page: catalogItem?.source_page || null,
        recitation_type: dataset.type,
        tracking_available: dataset.timed_ayah_count > 0,
        surah_audio_available: Object.keys(dataset.audio_files || {}).length > 0,
        surah_count: dataset.surah_count,
        ayah_count: dataset.ayah_count,
        timed_ayah_count: dataset.timed_ayah_count,
        word_segments_count: dataset.word_segments_count,
        data_path: relativeDataUrl(folderPath),
        available_surahs: [...new Set([
            ...Object.keys(dataset.audio_files || {}).map(Number),
            ...dataset.ayah_records.map((item) => item.surah)
        ])].filter(Boolean).sort((a, b) => a - b)
    };
}

export async function listAyahBayahReciters({ refresh = false } = {}) {
    if (ayahBayahRecitersCache && !refresh) return ayahBayahRecitersCache;
    if (!fs.existsSync(reciterBasePath)) return [];

    const catalog = await loadReciterCatalogWithImages({ refresh });
    const entries = await fsp.readdir(reciterBasePath, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const folderPath = path.join(reciterBasePath, entry.name);
        const dataset = await loadAyahBayahDataset(folderPath, entry.name);
        const match = matchCatalogReciter(catalog, entry.name);
        const catalogItem = match
            ? catalog.find((item) => item.id === match.id) || match
            : null;

        results.push({
            ...formatDatasetReciter(catalogItem, entry.name, dataset, folderPath),
            _dataset: dataset,
            _folderPath: folderPath
        });
    }

    ayahBayahRecitersCache = results.sort((a, b) => {
        if (a.id == null && b.id != null) return 1;
        if (a.id != null && b.id == null) return -1;
        return (a.id ?? 9999) - (b.id ?? 9999) || a.folder_name.localeCompare(b.folder_name);
    });
    return ayahBayahRecitersCache;
}

export function publicReciterSummary(item) {
    const { _dataset, _folderPath, ...publicItem } = item;
    return publicItem;
}

export async function resolveAyahBayahReciter(identifier) {
    const items = await listAyahBayahReciters();
    const input = String(identifier || '').trim();
    const numeric = Number(input);
    const lower = input.toLowerCase();

    return items.find((item) =>
        (Number.isInteger(numeric) && numeric > 0 && (item.id === numeric || item.source_recitation_id === numeric)) ||
        item.folder_name.toLowerCase() === lower ||
        item.slug.toLowerCase() === lower ||
        item.folder_name.toLowerCase().includes(lower)
    ) || null;
}

export function getSurahFromDataset(dataset, surahNumber) {
    if (dataset.type === 'surah-by-surah') {
        const chapterAudio = dataset.audio_files[String(surahNumber)] ?? dataset.audio_files[surahNumber] ?? null;
        const records = dataset.ayah_records.filter((item) => item.surah === surahNumber);
        if (!chapterAudio && !records.length) return null;
        return { chapterAudio, records };
    }

    const records = dataset.ayah_records.filter((item) => item.surah === surahNumber);
    return records.length ? { chapterAudio: null, records } : null;
}

export function getVerseFromDataset(dataset, surahNumber, verseNumber) {
    const record = dataset.ayah_records.find((item) => item.surah === surahNumber && item.ayah === verseNumber) || null;
    if (!record) return null;

    const chapterAudio = dataset.type === 'surah-by-surah'
        ? (dataset.audio_files[String(surahNumber)] ?? dataset.audio_files[surahNumber] ?? null)
        : null;

    return { chapterAudio, record };
}

export function formatAyahRecord(record) {
    if (!record) return null;
    return {
        surah: record.surah,
        ayah: record.ayah,
        audio_url: record.audio_url,
        segments: record.segments,
        duration_sec: record.duration_sec,
        duration_ms: record.duration_ms,
        timestamp_from: record.timestamp_from,
        timestamp_to: record.timestamp_to
    };
}

export function clearReciterDataCaches() {
    reciterCatalogCache = null;
    ayahBayahRecitersCache = null;
}
