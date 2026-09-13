import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleError } from '../utils/errorUtils.mjs';
import {
    loadReciterCatalogWithImages,
    listAyahBayahReciters,
    publicReciterSummary,
    resolveAyahBayahReciter,
    getSurahFromDataset,
    getVerseFromDataset,
    formatAyahRecord
} from '../services/reciterDataService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, '../../data/sqlite/database.sqlite');
const dataRootPath = path.join(__dirname, '..', '..', 'data');
const surahNamesPath = path.join(dataRootPath, 'suwer-name');

const readJsonIfExists = async (filePath) => {
    if (!await fs.pathExists(filePath)) return null;
    return fs.readJSON(filePath);
};


async function openDatabase() {
    return open({
        filename: dbFilePath,
        driver: sqlite3.Database
    });
}

const parsePositiveInteger = (value) => {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
};

const normalizeLimit = (value) => {
    const limit = parsePositiveInteger(value) || 50;
    return Math.min(limit, 500);
};

const secondsExpression = (column) => `ROUND(${column} / 1000.0, 3)`;

async function findTimingReciter(db, reciter) {
    const reciterId = parsePositiveInteger(reciter);

    if (reciterId) {
        return db.get('SELECT * FROM timing_reciters WHERE id = ?', [reciterId]);
    }

    return db.get(`
        SELECT *
        FROM timing_reciters
        WHERE name = ? OR name LIKE ?
        ORDER BY id
        LIMIT 1
    `, [reciter, `%${reciter}%`]);
}

function timingSelectSql(whereSql = '') {
    return `
        SELECT
            at.reciter_id,
            tr.name AS reciter_name,
            tr.name AS reciter_display_name,
            tr.rewaya,
            tr.folder_url,
            at.surah_number,
            at.verse_number,
            at.start_time_ms,
            at.end_time_ms,
            ${secondsExpression('at.start_time_ms')} AS start_time_seconds,
            ${secondsExpression('at.end_time_ms')} AS end_time_seconds,
            ${secondsExpression('at.start_time_ms')} AS timing_seconds,
            (at.end_time_ms - at.start_time_ms) AS duration_ms,
            ROUND((at.end_time_ms - at.start_time_ms) / 1000.0, 3) AS duration_seconds,
            geom.polygon,
            geom.x,
            geom.y,
            CASE
                WHEN geom.page_number IS NULL THEN NULL
                ELSE 'https://www.mp3quran.net/api/quran_pages_svg/' || printf('%03d', geom.page_number) || '.svg'
            END AS page,
            'https://www.mp3quran.net/api/v3/ayat_timing?surah=' || at.surah_number || '&read=' || at.reciter_id AS timing_url
        FROM ayat_timing at
        JOIN timing_reciters tr ON tr.id = at.reciter_id
        LEFT JOIN ayat_timing_geometry geom
            ON geom.surah_number = at.surah_number
            AND geom.verse_number = at.verse_number
        ${whereSql}
    `;
}

/**
 * جلب قراء التوقيت المتاحين (96 قارئا من حفص 114 سورة)
 * GET /api/timing/reciters
 */
export const getAllReciters = async (req, res) => {
    try {
        const db = await openDatabase();

        const reciters = await db.all(`
            SELECT
                tr.id AS reciter_id,
                tr.name AS reciter_name,
                tr.name AS reciter_display_name,
                tr.rewaya,
                tr.folder_url,
                tr.soar_count,
                tr.soar_link,
                COUNT(at.id) AS timings_count,
                SUM(CASE WHEN at.verse_number > 0 THEN 1 ELSE 0 END) AS verses_count,
                COUNT(DISTINCT at.surah_number) AS surahs_count
            FROM timing_reciters tr
            LEFT JOIN ayat_timing at ON at.reciter_id = tr.id
            GROUP BY tr.id
            ORDER BY tr.id
        `);

        await db.close();

        res.json({
            success: true,
            data: reciters,
            count: reciters.length
        });

    } catch (error) {
        console.error('Error fetching timing reciters:', error);
        handleError(res, 500, 'خطأ في جلب قائمة قراء التوقيت', { error: error.message });
    }
};

/**
 * جلب توقيت آيات سورة معينة لقارئ معين.
 * reciter يقبل رقم القارئ من mp3quran ويفضل استخدامه مثل /api/timing/1/1.
 * GET /api/timing/:reciter/:surah_id
 */
export const getVerseTimings = async (req, res) => {
    try {
        const { reciter, surah_id } = req.params;
        const surahNumber = parsePositiveInteger(surah_id);

        if (!reciter || !surahNumber || surahNumber > 114) {
            return handleError(res, 400, 'رقم القارئ ورقم السورة مطلوبان', {
                example: '/api/timing/1/1',
                note: 'استخدم /api/timing/reciters لمعرفة أرقام القراء'
            });
        }

        const db = await openDatabase();
        const timingReciter = await findTimingReciter(db, reciter);

        if (!timingReciter) {
            await db.close();
            return handleError(res, 404, `لم يتم العثور على قارئ التوقيت ${reciter}`, {
                available_reciters_endpoint: '/api/timing/reciters'
            });
        }

        const timings = await db.all(`${timingSelectSql(`
            WHERE at.reciter_id = ? AND at.surah_number = ?
        `)}
            ORDER BY at.verse_number
        `, [timingReciter.id, surahNumber]);

        await db.close();

        if (timings.length === 0) {
            return handleError(res, 404, `لم يتم العثور على توقيت للقارئ ${reciter} في السورة ${surah_id}`, {
                available_reciters_endpoint: '/api/timing/reciters'
            });
        }

        const totalDurationMs = Math.max(...timings.map((timing) => timing.end_time_ms));

        res.json({
            success: true,
            data: {
                reciter: timingReciter.name,
                reciter_id: timingReciter.id,
                reciter_key: String(timingReciter.id),
                rewaya: timingReciter.rewaya,
                folder_url: timingReciter.folder_url,
                surah_number: surahNumber,
                verses_count: timings.filter((timing) => timing.verse_number > 0).length,
                timings_count: timings.length,
                total_duration_ms: totalDurationMs,
                total_duration_seconds: Number((totalDurationMs / 1000).toFixed(3)),
                timing_url: timings[0].timing_url,
                verses: timings
            }
        });

    } catch (error) {
        console.error('Error fetching verse timings:', error);
        handleError(res, 500, 'خطأ في جلب توقيت الآيات', { error: error.message });
    }
};

/**
 * جلب توقيت آية واحدة محددة.
 * GET /api/timing/:reciter/:surah_id/:verse_id
 */
export const getSingleVerseTiming = async (req, res) => {
    try {
        const { reciter, surah_id, verse_id } = req.params;
        const surahNumber = parsePositiveInteger(surah_id);
        const verseNumber = Number(verse_id);

        if (!reciter || !surahNumber || surahNumber > 114 || !Number.isInteger(verseNumber) || verseNumber < 0) {
            return handleError(res, 400, 'رقم القارئ ورقم السورة ورقم الآية مطلوبة', {
                example: '/api/timing/1/1/1'
            });
        }

        const db = await openDatabase();
        const timingReciter = await findTimingReciter(db, reciter);

        if (!timingReciter) {
            await db.close();
            return handleError(res, 404, `لم يتم العثور على قارئ التوقيت ${reciter}`);
        }

        const timing = await db.get(`${timingSelectSql(`
            WHERE at.reciter_id = ? AND at.surah_number = ? AND at.verse_number = ?
        `)}
            LIMIT 1
        `, [timingReciter.id, surahNumber, verseNumber]);

        await db.close();

        if (!timing) {
            return handleError(res, 404, `لم يتم العثور على توقيت للقارئ ${reciter} في السورة ${surah_id} الآية ${verse_id}`);
        }

        res.json({
            success: true,
            data: {
                reciter: timingReciter.name,
                reciter_id: timingReciter.id,
                reciter_key: String(timingReciter.id),
                ...timing
            }
        });

    } catch (error) {
        console.error('Error fetching single verse timing:', error);
        handleError(res, 500, 'خطأ في جلب توقيت الآية', { error: error.message });
    }
};

/**
 * جلب جميع السور المتاحة لقارئ معين.
 * كل قراء حفص 114 لديهم كل السور.
 * GET /api/timing/:reciter/surahs
 */
export const getAvailableSurahs = async (req, res) => {
    try {
        const { reciter } = req.params;

        if (!reciter) {
            return handleError(res, 400, 'رقم القارئ مطلوب', {
                example: '/api/timing/1/surahs'
            });
        }

        const db = await openDatabase();
        const timingReciter = await findTimingReciter(db, reciter);

        if (!timingReciter) {
            await db.close();
            return handleError(res, 404, `لم يتم العثور على قارئ التوقيت ${reciter}`, {
                available_reciters_endpoint: '/api/timing/reciters'
            });
        }

        const surahs = await db.all(`
            SELECT
                surah_number,
                COUNT(*) AS timings_count,
                SUM(CASE WHEN verse_number > 0 THEN 1 ELSE 0 END) AS verses_count,
                MAX(end_time_ms) AS total_duration_ms,
                ROUND(MAX(end_time_ms) / 1000.0, 3) AS total_duration_seconds
            FROM ayat_timing
            WHERE reciter_id = ?
            GROUP BY surah_number
            ORDER BY surah_number
        `, [timingReciter.id]);

        await db.close();

        if (surahs.length === 0) {
            return handleError(res, 404, `لم يتم العثور على سور للقارئ ${reciter}`, {
                available_reciters_endpoint: '/api/timing/reciters'
            });
        }

        res.json({
            success: true,
            data: {
                reciter: timingReciter.name,
                reciter_id: timingReciter.id,
                reciter_key: String(timingReciter.id),
                rewaya: timingReciter.rewaya,
                surahs_count: surahs.length,
                surahs
            }
        });

    } catch (error) {
        console.error('Error fetching available surahs:', error);
        handleError(res, 500, 'خطأ في جلب السور المتاحة', { error: error.message });
    }
};

/**
 * البحث عن توقيت بمعايير مختلفة.
 * GET /api/timing/search?reciter=1&surah=1&verse=1
 */
export const searchTimings = async (req, res) => {
    try {
        const { reciter, surah, verse } = req.query;
        const limit = normalizeLimit(req.query.limit);

        let query = timingSelectSql('WHERE 1=1');
        const params = [];

        if (reciter) {
            const reciterId = parsePositiveInteger(reciter);
            if (reciterId) {
                query += ' AND at.reciter_id = ?';
                params.push(reciterId);
            } else {
                query += ' AND tr.name LIKE ?';
                params.push(`%${reciter}%`);
            }
        }

        if (surah) {
            query += ' AND at.surah_number = ?';
            params.push(parsePositiveInteger(surah));
        }

        if (verse !== undefined) {
            const verseNumber = Number(verse);
            if (Number.isInteger(verseNumber) && verseNumber >= 0) {
                query += ' AND at.verse_number = ?';
                params.push(verseNumber);
            }
        }

        query += ' ORDER BY at.reciter_id, at.surah_number, at.verse_number LIMIT ?';
        params.push(limit);

        const db = await openDatabase();
        const results = await db.all(query, params);
        await db.close();

        res.json({
            success: true,
            data: results,
            count: results.length,
            filters: { reciter, surah, verse, limit }
        });

    } catch (error) {
        console.error('Error searching timings:', error);
        handleError(res, 500, 'خطأ في البحث عن التوقيتات', { error: error.message });
    }
};

/**
 * جلب جميع القراء الصوتيين من جدول audio.
 * GET /api/reciters
 */
export const getAllAudioReciters = async (req, res) => {
    try {
        // data/json/surah/surah_1.json is the canonical source for the reciter ID.
        // The numeric ID is also the prefix used by data/reciter_images (001-, 002-, ...).
        const catalog = await loadReciterCatalogWithImages();

        if (catalog.length) {
            return res.json({
                success: true,
                data: catalog.map((item) => ({
                    id: item.id,
                    reciter: item.reciter,
                    reciter_name_ar: item.reciter?.ar || null,
                    reciter_name_en: item.reciter?.en || null,
                    rewaya: item.rewaya,
                    server: item.server,
                    link: item.link,
                    image: item.image,
                    image_url: item.image?.url || null
                })),
                count: catalog.length,
                id_source: 'data/json/surah/surah_1.json',
                image_mapping: 'reciter.id -> data/reciter_images/NNN-*'
            });
        }

        // Database fallback for installations that do not ship the JSON data directory.
        const db = await openDatabase();
        const reciters = await db.all(`
            SELECT DISTINCT reciter_ar AS reciter_name_ar, reciter_en AS reciter_name_en
            FROM audio
            ORDER BY reciter_name_ar
        `);
        await db.close();
        return res.json({
            success: true,
            data: reciters,
            count: reciters.length,
            warning: 'Canonical reciter IDs/images were unavailable because surah_1.json was not found.'
        });
    } catch (error) {
        console.error('Error fetching audio reciters:', error);
        handleError(res, 500, 'خطأ في جلب جميع القراء الصوتيين', { error: error.message });
    }
};

const pad3 = (value) => String(value).padStart(3, '0');

const buildAyahAudioUrl = (baseUrl, surahNumber, verseNumber) => {
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${normalizedBaseUrl}${pad3(surahNumber)}${pad3(verseNumber)}.mp3`;
};

async function findAyahAudioReciter(db, reciter) {
    const reciterId = parsePositiveInteger(reciter);

    if (reciterId) {
        return db.get('SELECT * FROM ayah_audio_reciters WHERE id = ?', [reciterId]);
    }

    return db.get(`
        SELECT *
        FROM ayah_audio_reciters
        WHERE name = ? OR name LIKE ?
        ORDER BY id
        LIMIT 1
    `, [reciter, `%${reciter}%`]);
}

const formatAyahAudioReciter = (reciter) => ({
    id: reciter.id,
    name: reciter.name,
    rewaya: reciter.rewaya,
    musshaf_type: reciter.musshaf_type,
    audio_urls: {
        32: reciter.audio_url_bit_rate_32 || '',
        64: reciter.audio_url_bit_rate_64 || '',
        128: reciter.audio_url_bit_rate_128 || ''
    }
});

/**
 * جلب قراء الصوت آية-بآية.
 * GET /api/ayah-audio/reciters
 */
export const getAyahAudioReciters = async (req, res) => {
    try {
        const db = await openDatabase();
        const reciters = await db.all(`
            SELECT *
            FROM ayah_audio_reciters
            ORDER BY id
        `);
        await db.close();

        res.json({
            success: true,
            data: reciters.map(formatAyahAudioReciter),
            count: reciters.length
        });
    } catch (error) {
        console.error('Error fetching ayah audio reciters:', error);
        handleError(res, 500, 'خطأ في جلب قراء الصوت آية-بآية', { error: error.message });
    }
};

/**
 * بناء رابط ملف صوت آية محددة لقارئ محدد.
 * GET /api/ayah-audio/:reciter/:surah_id/:verse_id?bitrate=128
 */
export const getAyahAudio = async (req, res) => {
    try {
        const { reciter, surah_id, verse_id } = req.params;
        const { bitrate } = req.query;
        const surahNumber = parsePositiveInteger(surah_id);
        const verseNumber = parsePositiveInteger(verse_id);

        if (!reciter || !surahNumber || surahNumber > 114 || !verseNumber) {
            return handleError(res, 400, 'رقم القارئ ورقم السورة ورقم الآية مطلوبة', {
                example: '/api/ayah-audio/1/1/1?bitrate=32'
            });
        }

        const db = await openDatabase();
        const audioReciter = await findAyahAudioReciter(db, reciter);
        await db.close();

        if (!audioReciter) {
            return handleError(res, 404, `لم يتم العثور على قارئ صوت آية-بآية ${reciter}`, {
                available_reciters_endpoint: '/api/ayah-audio/reciters'
            });
        }

        const availableBaseUrls = [
            { bitrate: 32, base_url: audioReciter.audio_url_bit_rate_32 },
            { bitrate: 64, base_url: audioReciter.audio_url_bit_rate_64 },
            { bitrate: 128, base_url: audioReciter.audio_url_bit_rate_128 }
        ].filter((item) => item.base_url);

        if (availableBaseUrls.length === 0) {
            return handleError(res, 404, `لا توجد روابط صوت آية-بآية للقارئ ${reciter}`);
        }

        const requestedBitrate = bitrate ? Number(bitrate) : null;
        const selectedBaseUrls = requestedBitrate
            ? availableBaseUrls.filter((item) => item.bitrate === requestedBitrate)
            : availableBaseUrls;

        if (selectedBaseUrls.length === 0) {
            return handleError(res, 404, `الجودة ${bitrate} غير متاحة لهذا القارئ`, {
                available_bitrates: availableBaseUrls.map((item) => item.bitrate)
            });
        }

        const audioFiles = selectedBaseUrls.map((item) => ({
            bitrate: item.bitrate,
            url: buildAyahAudioUrl(item.base_url, surahNumber, verseNumber)
        }));

        res.json({
            success: true,
            data: {
                reciter: formatAyahAudioReciter(audioReciter),
                surah_number: surahNumber,
                verse_number: verseNumber,
                file_name: `${pad3(surahNumber)}${pad3(verseNumber)}.mp3`,
                audio_files: audioFiles
            }
        });
    } catch (error) {
        console.error('Error building ayah audio URL:', error);
        handleError(res, 500, 'خطأ في بناء رابط صوت الآية', { error: error.message });
    }
};

export const getReciterImages = async (req, res) => {
    try {
        const catalog = await loadReciterCatalogWithImages();
        res.json({
            success: true,
            data: catalog.map((item) => ({
                id: item.id,
                name: item.name,
                reciter: item.reciter,
                rewaya: item.rewaya,
                server: item.server,
                link: item.link,
                file: item.image?.file || null,
                image: item.image,
                image_url: item.image?.url || null,
                matched_name: item.matched_name || null,
                source_page: item.source_page || null
            })),
            count: catalog.length,
            mapping_rule: 'The reciter id is matched directly to the 3-digit image filename prefix.'
        });
    } catch (error) {
        console.error('Error loading reciter images:', error);
        handleError(res, 500, 'خطأ في جلب صور القراء', { error: error.message });
    }
};

export const getSurahNames = async (req, res) => {
    try {
        const metadata = await readJsonIfExists(path.join(dataRootPath, 'json', 'metadata.json')) || [];
        const names = metadata.map((surah) => {
            const fileName = `${String(surah.number).padStart(3, '0')}.svg`;
            const filePath = path.join(surahNamesPath, fileName);
            return {
                number: surah.number,
                name: {
                    ar: surah.name?.ar || null,
                    en: surah.name?.en || null,
                    transliteration: surah.name?.transliteration || null
                },
                image_url: fs.existsSync(filePath) ? `/data/suwer-name/${fileName}` : null,
                image_file: fs.existsSync(filePath) ? fileName : null
            };
        });

        res.json({
            success: true,
            data: names,
            count: names.length
        });
    } catch (error) {
        console.error('Error loading surah names:', error);
        handleError(res, 500, 'خطأ في جلب أسماء السور', { error: error.message });
    }
};

/**
 * قائمة التسجيلات التي تحتوي على بيانات تتبع آية/كلمة.
 * يدعم نوعي QUL:
 * - surah-by-surah: surah.json + segments.json
 * - ayah-by-ayah: JSON يحتوي surah/ayah/audio_url/segments لكل آية
 */
export const getAyahBayahReciters = async (req, res) => {
    try {
        const reciters = await listAyahBayahReciters();
        res.json({
            success: true,
            data: reciters.map(publicReciterSummary),
            count: reciters.length,
            supported_types: ['surah-by-surah', 'ayah-by-ayah']
        });
    } catch (error) {
        console.error('Error loading ayah bayah reciters:', error);
        handleError(res, 500, 'خطأ في جلب قراء التسجيلات آية-بآية', { error: error.message });
    }
};

export const getAyahBayahReciterById = async (req, res) => {
    try {
        const { reciter_id } = req.params;
        const reciter = await resolveAyahBayahReciter(reciter_id);

        if (!reciter) {
            return handleError(res, 404, 'لم يتم العثور على قارئ التسجيلات آية-بآية', {
                reciter_id,
                available_reciters_endpoint: '/api/ayah-bayah/reciters'
            });
        }

        const summary = publicReciterSummary(reciter);
        res.json({
            success: true,
            data: {
                ...summary,
                audio_files: reciter._dataset.type === 'surah-by-surah'
                    ? reciter._dataset.audio_files
                    : undefined,
                sample_ayah_audio: reciter._dataset.type === 'ayah-by-ayah'
                    ? reciter._dataset.ayah_records.slice(0, 5).map(formatAyahRecord)
                    : undefined
            }
        });
    } catch (error) {
        console.error('Error loading ayah bayah reciter:', error);
        handleError(res, 500, 'خطأ في جلب تفاصيل القارئ', { error: error.message });
    }
};

export const getAyahBayahSurah = async (req, res) => {
    try {
        const { reciter_id, surah_id } = req.params;
        const surahNumber = parsePositiveInteger(surah_id);
        if (!surahNumber || surahNumber > 114) {
            return handleError(res, 400, 'رقم السورة غير صالح', { surah_id });
        }

        const reciter = await resolveAyahBayahReciter(reciter_id);
        if (!reciter) {
            return handleError(res, 404, 'لم يتم العثور على القارئ المطلوب', { reciter_id });
        }

        const result = getSurahFromDataset(reciter._dataset, surahNumber);
        if (!result) {
            return handleError(res, 404, 'لم يتم العثور على سورة القارئ', { reciter_id, surah_id });
        }

        const records = result.records.map(formatAyahRecord);
        res.json({
            success: true,
            data: {
                reciter: publicReciterSummary(reciter),
                recitation_type: reciter._dataset.type,
                surah_number: surahNumber,
                audio: result.chapterAudio,
                ayahs: records,
                segments: records.map((item) => ({
                    key: `${item.surah}:${item.ayah}`,
                    verse_number: item.ayah,
                    audio_url: item.audio_url,
                    timestamp_from: item.timestamp_from,
                    timestamp_to: item.timestamp_to,
                    duration_ms: item.duration_ms,
                    duration_sec: item.duration_sec,
                    segments: item.segments
                })),
                ayahs_count: records.length,
                segments_count: records.length,
                word_segments_count: records.reduce((sum, item) => sum + item.segments.length, 0)
            }
        });
    } catch (error) {
        console.error('Error loading ayah bayah surah data:', error);
        handleError(res, 500, 'خطأ في جلب بيانات السورة', { error: error.message });
    }
};

export const getAyahBayahVerse = async (req, res) => {
    try {
        const { reciter_id, surah_id, verse_id } = req.params;
        const surahNumber = parsePositiveInteger(surah_id);
        const verseNumber = parsePositiveInteger(verse_id);
        if (!surahNumber || surahNumber > 114 || !verseNumber) {
            return handleError(res, 400, 'رقم السورة أو الآية غير صالح', { surah_id, verse_id });
        }

        const reciter = await resolveAyahBayahReciter(reciter_id);
        if (!reciter) {
            return handleError(res, 404, 'لم يتم العثور على القارئ المطلوب', { reciter_id });
        }

        const result = getVerseFromDataset(reciter._dataset, surahNumber, verseNumber);
        if (!result) {
            return handleError(res, 404, 'لم يتم العثور على آية محددة في التسجيل', {
                reciter_id,
                surah_id,
                verse_id
            });
        }

        const verse = formatAyahRecord(result.record);
        res.json({
            success: true,
            data: {
                reciter: publicReciterSummary(reciter),
                recitation_type: reciter._dataset.type,
                surah_number: surahNumber,
                verse_number: verseNumber,
                chapter_audio: result.chapterAudio,
                ayah_audio_url: verse.audio_url,
                segment: {
                    key: `${surahNumber}:${verseNumber}`,
                    ...verse
                }
            }
        });
    } catch (error) {
        console.error('Error loading ayah bayah verse data:', error);
        handleError(res, 500, 'خطأ في جلب بيانات الآية', { error: error.message });
    }
};

