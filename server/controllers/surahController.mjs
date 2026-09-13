import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { handleError } from '../utils/errorUtils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسارات البيانات
const metadataPath = path.join(__dirname, '..', '..', 'data', 'json', 'metadata.json');
const surahFolderPath = path.join(__dirname, '..', '..', 'data', 'json', 'surah');
const versesFolderPath = path.join(__dirname, '..', '..', 'data', 'json', 'verses');
const audioFolderPath = path.join(__dirname, '..', '..', 'data', 'json', 'audio');
const pagesQuranPath = path.join(__dirname, '..', '..', 'data', 'pagesQuran.json');


export const getAllSurahs = (req, res) => {
    try {
        const metadata = fs.readJSONSync(metadataPath);
        res.json({
            success: true,
            result: metadata
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching surah metadata.', {
            message: error.message,
        });
    }
};

export const getAllVerses = (req, res) => {
    try {
        const surahId = req.query.surah_id || req.params.surah_id;
        const surahPath = path.join(surahFolderPath, `surah_${surahId}.json`);

        if (!fs.existsSync(surahPath)) {
            return handleError(res, 404, 'The requested verses do not exist.', {
                surah_id: surahId,
            });
        }

        const surahData = fs.readJSONSync(surahPath);
        res.json({
            success: true,
            result: surahData.verses
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching verses data.', {
            message: error.message,
        });
    }
};

export const getSurah = (req, res) => {

    const surahId = req.query.surah_id || req.params.surah_id;
    const surahPath = path.join(surahFolderPath, `surah_${surahId}.json`);

    if (!fs.existsSync(surahPath)) {
        return handleError(res, 404, '⚠️ The requested surah does not exist.', {
            surah_id: surahId,
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl
        });
    }

    try {
        const surahData = fs.readJSONSync(surahPath);
        res.json({
            success: true,
            result: surahData
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching surah data.', {
            surah_id: surahId,
            message: error.message,
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl
        });
    }
};

export const getVerse = (req, res) => {
    const surahId = req.query.surah_id || req.params.surah_id;
    const verseId = req.query.verse_id || req.params.verse_id;
    const versePath = path.join(versesFolderPath, `${String(surahId).padStart(3, '0')}_${String(verseId).padStart(3, '0')}.json`);

    if (!surahId) {
        return handleError(res, 400, 'surah_id is required.', {
            message: 'Please provide a valid surah_id in the query or params.',
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl
        });
    } else if (!verseId) {
        return handleError(res, 400, 'verseId is required.', {
            message: 'Please provide a valid verseId in the query or params.',
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl
        });
    } else {
        // Fetch a specific verse
        if (!fs.existsSync(versePath)) {
            return handleError(res, 404, 'The requested verse does not exist.', {
                surah_id: surahId,
                verse_id: verseId,
                timestamp: new Date().toISOString(),
                method: req.method,
                path: req.originalUrl
            });
        }

        try {
            const verseData = fs.readJSONSync(versePath);
            res.json({
                success: true,
                result: verseData
            });
        } catch (error) {
            handleError(res, 500, 'An error occurred while fetching verse data.', {
                surah_id: surahId,
                verse_id: verseId,
                message: error.message,
                timestamp: new Date().toISOString(),
                method: req.method,
                path: req.originalUrl
            });
        }
    }
};

export const getAudio = (req, res) => {
    const surahId = req.query.surah_id || req.params.surah_id;
    const audioPath = path.join(audioFolderPath, `audio_surah_${surahId}.json`);

    if (!fs.existsSync(audioPath)) {
        return handleError(res, 404, 'The requested audio does not exist.', {
            surah_id: surahId,
        });
    }

    try {
        const audioData = fs.readJSONSync(audioPath);
        res.json({
            success: true,
            result: audioData
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching audio data.', {
            surah_id: surahId,
            message: error.message,
        });
    }
};

/**
 * جلب الملفات الصوتية لسورة وقارئ معين
 * GET /api/audio/:surah_id/:reciter
 */
export const getAudioByReciter = (req, res) => {
    const surahId = req.query.surah_id || req.params.surah_id;
    const reciter = req.query.reciter || req.params.reciter;
    const audioPath = path.join(audioFolderPath, `audio_surah_${surahId}.json`);

    if (!fs.existsSync(audioPath)) {
        return handleError(res, 404, 'The requested audio does not exist.', {
            surah_id: surahId,
        });
    }

    try {
        const audioData = fs.readJSONSync(audioPath);
        // فلترة النتائج حسب اسم القارئ (ar أو en)
        const filtered = audioData.filter(item => {
            if (!item.reciter) return false;
            return (item.reciter.ar && item.reciter.ar.includes(reciter)) ||
                   (item.reciter.en && item.reciter.en.toLowerCase().includes(reciter.toLowerCase()));
        });
        if (filtered.length === 0) {
            return handleError(res, 404, 'لا يوجد ملفات صوتية لهذا القارئ في هذه السورة', {
                surah_id: surahId,
                reciter: reciter
            });
        }
        res.json({
            success: true,
            result: filtered
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching audio data.', {
            surah_id: surahId,
            reciter: reciter,
            message: error.message,
        });
    }
};

export const getVersesByJuz = (req, res) => {
    const juzId = parseInt(req.query.juz_id || req.params.juz_id, 10);
    const surahFiles = fs.readdirSync(surahFolderPath);

    let allVerses = [];

    try {
        for (const file of surahFiles) {
            const filePath = path.join(surahFolderPath, file);
            const surahData = fs.readJSONSync(filePath);

            if (surahData.verses) {
                const verses = surahData.verses.filter(verse => verse.juz === juzId)
                    .map(verse => ({
                        ...verse,
                        surahName: surahData.name.ar,
                        surahNumber: surahData.number
                    }));

                allVerses = allVerses.concat(verses);
            }
        }

        if (allVerses.length === 0) {
            return handleError(res, 404, 'No verses found for the specified juz.', { juzId });
        }

        res.json({
            success: true,
            result: allVerses
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching verses by juz.', {
            juz_id: juzId,
            message: error.message,
        });
    }
};

export const getSajdaVerses = (req, res) => {
    const surahFiles = fs.readdirSync(surahFolderPath);
    let sajdaVerses = [];

    try {
        for (const file of surahFiles) {
            const filePath = path.join(surahFolderPath, file);
            const surahData = fs.readJSONSync(filePath);

            if (surahData.verses) {
                const verses = surahData.verses.filter(verse => verse.sajda)
                    .map(verse => ({
                        ...verse,
                        surahName: surahData.name.ar,
                        surahNumber: surahData.number
                    }));

                sajdaVerses = sajdaVerses.concat(verses);
            }
        }

        if (sajdaVerses.length === 0) {
            return handleError(res, 404, 'No verses with sajda found.', {});
        }

        res.json({
            success: true,
            result: sajdaVerses
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching sajda verses.', {
            message: error.message,
        });
    }
};


export const getPage = (req, res) => {
    try {
        const surahId = parseInt(req.query.surah_id || req.params.surah_id, 10);
        const verseId = parseInt(req.query.verse_id || req.params.verse_id, 10);
        const page = parseInt(req.query.page, 10);

        const pagesData = fs.readJSONSync(pagesQuranPath);

        // جلب الصفحة بناءً على السورة أو الآية أو رقم الصفحة
        let result = [];

        if (page) {
            // البحث باستخدام رقم الصفحة
            result = pagesData.filter(p => p.page === page);
        } else if (surahId && verseId) {
            // البحث باستخدام رقم السورة والآية
            result = pagesData.filter(p =>
                (p.start.surah_number === surahId && p.start.verse <= verseId && p.end.verse >= verseId) ||
                (p.end.surah_number === surahId && p.end.verse >= verseId)
            );
        } else if (surahId) {
            // البحث باستخدام رقم السورة فقط
            result = pagesData.filter(p =>
                (p.start.surah_number === surahId) ||
                (p.end.surah_number === surahId)
            );
        }

        // تحقق إذا لم توجد نتيجة
        if (result.length === 0) {
            return handleError(res, 404, 'No pages found for the given query.', {
                surah_id: surahId,
                verse_id: verseId,
                page: page,
            });
        }

        // إضافة رابط الصورة لكل نتيجة
        const imageBaseUrl = '/data/quran_image';
        const enrichedResult = result.map(item => {
            return {
                page: item.page,
                image: {
                    url: `${imageBaseUrl}/${item.page}.png`,
                },
                ...item,

            };
        });

        res.json({
            success: true,
            result: enrichedResult
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching page data.', {
            message: error.message,
        });
    }
};