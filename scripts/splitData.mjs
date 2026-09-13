import { isMainModule } from './runtime.mjs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const mainDataQuranPath = path.join(root, 'data', 'mainDataQuran.json');
const dataFolderPath = path.join(root, 'data', 'json');
const surahFolderPath = path.join(dataFolderPath, 'surah');
const versesFolderPath = path.join(dataFolderPath, 'verses');
const audioFolderPath = path.join(dataFolderPath, 'audio');

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

function validateQuranData(data) {
  if (!Array.isArray(data) || data.length !== 114) {
    throw new Error(`mainDataQuran.json يجب أن يحتوي على 114 سورة، الموجود: ${Array.isArray(data) ? data.length : 'ليس مصفوفة'}`);
  }

  let verses = 0;
  let audio = 0;
  for (const surah of data) {
    if (!Number.isInteger(Number(surah.number)) || !Array.isArray(surah.verses) || !Array.isArray(surah.audio)) {
      throw new Error(`بنية السورة غير صالحة عند السورة رقم ${surah?.number ?? 'غير معروف'}`);
    }
    verses += surah.verses.length;
    audio += surah.audio.length;
  }
  return { surahs: data.length, verses, audio };
}

export async function run() {
  // Remove only generated split folders so stale files can never survive a rebuild.
  await Promise.all([
    rm(surahFolderPath, { recursive: true, force: true }),
    rm(versesFolderPath, { recursive: true, force: true }),
    rm(audioFolderPath, { recursive: true, force: true })
  ]);

  await Promise.all([
    mkdir(dataFolderPath, { recursive: true }),
    mkdir(surahFolderPath, { recursive: true }),
    mkdir(versesFolderPath, { recursive: true }),
    mkdir(audioFolderPath, { recursive: true })
  ]);

  const quranData = await readJson(mainDataQuranPath);
  const stats = validateQuranData(quranData);

  const surahMetadata = quranData.map((surah) => ({
    number: surah.number,
    name: surah.name,
    revelation_place: surah.revelation_place,
    verses_count: surah.verses_count,
    words_count: surah.words_count,
    letters_count: surah.letters_count
  }));

  await writeJson(path.join(dataFolderPath, 'metadata.json'), surahMetadata);

  for (const surah of quranData) {
    await writeJson(path.join(surahFolderPath, `surah_${surah.number}.json`), surah);

    for (const verse of surah.verses) {
      const verseFileName = `${String(surah.number).padStart(3, '0')}_${String(verse.number).padStart(3, '0')}.json`;
      await writeJson(path.join(versesFolderPath, verseFileName), verse);
    }

    await writeJson(path.join(audioFolderPath, `audio_surah_${surah.number}.json`), surah.audio);
  }

  console.log(`✅ Split complete: ${stats.surahs} surahs, ${stats.verses} verses, ${stats.audio} audio rows.`);
  return stats;
}

if (isMainModule(import.meta.url)) {
  run().catch((error) => {
    console.error('❌ splitData failed:', error);
    process.exit(1);
  });
}
