import fs from 'node:fs';
import path from 'node:path';
import {
  loadReciterCatalogWithImages,
  listAyahBayahReciters,
  resolveAyahBayahReciter,
  getSurahFromDataset,
  getVerseFromDataset,
  clearReciterDataCaches,
  dataRootPath
} from '../server/services/reciterDataService.mjs';

const expectedMappings = new Map([
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

const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
};

const ok = (message) => console.log(`✅ ${message}`);

console.log(`📁 Data root: ${dataRootPath}`);
if (!fs.existsSync(dataRootPath)) {
  fail('مجلد data غير موجود.');
  process.exit();
}

clearReciterDataCaches();
const catalog = await loadReciterCatalogWithImages({ refresh: true });
console.log(`👥 Canonical reciters: ${catalog.length}`);
if (catalog.length !== 158) fail(`المتوقع 158 قارئًا في surah_1.json، الموجود ${catalog.length}`);

const missingImages = catalog.filter((item) => !item.image?.file || !fs.existsSync(path.join(dataRootPath, 'reciter_images', item.image.file)));
if (missingImages.length) fail(`هناك ${missingImages.length} قارئًا بلا صورة محلية صالحة`);
else ok('كل 158 قارئًا مربوط بصورة محلية موجودة');

const badImages = catalog.filter((item) => !item.image?.file?.startsWith(`${String(item.id).padStart(3, '0')}-`));
if (badImages.length) fail(`وجدت ${badImages.length} صورة لا تطابق قاعدة ID -> NNN-prefix`);
else ok('ID -> reciter image prefix mapping صحيح لكل القراء');

const surahNameDir = path.join(dataRootPath, 'suwer-name');
const surahNameFiles = fs.readdirSync(surahNameDir).filter((name) => /^\d{3}\.svg$/i.test(name));
if (surahNameFiles.length !== 114) fail(`صور أسماء السور: المتوقع 114، الموجود ${surahNameFiles.length}`);
else ok('صور أسماء السور 001.svg..114.svg كاملة');

const tracked = await listAyahBayahReciters({ refresh: true });
console.log(`🎙️ Tracking datasets: ${tracked.length}`);
if (tracked.length !== expectedMappings.size) fail(`المتوقع ${expectedMappings.size} مجموعات تتبع، الموجود ${tracked.length}`);

for (const [folder, expectedId] of expectedMappings) {
  const item = tracked.find((r) => r.folder_name === folder);
  if (!item) {
    fail(`مجلد التتبع غير مقروء: ${folder}`);
    continue;
  }
  if (item.id !== expectedId) fail(`${folder}: ID المتوقع ${expectedId} لكن الناتج ${item.id}`);
  const expectedPrefix = `${String(expectedId).padStart(3, '0')}-`;
  if (!item.image?.file?.startsWith(expectedPrefix)) fail(`${folder}: الصورة لا تبدأ بـ ${expectedPrefix}`);
  if (item.surah_count !== 114) fail(`${folder}: عدد السور ${item.surah_count} بدل 114`);
  if (item.timed_ayah_count !== 6236) {
    fail(`${folder}: عدد الآيات الموقّتة ${item.timed_ayah_count} بدل 6236`);
  }
  ok(`${item.name} | id=${item.id} | QUL=${item.source_recitation_id ?? '-'} | ${item.recitation_type} | surahs=${item.surah_count} | timed=${item.timed_ayah_count}`);
}

for (const [identifier, expectedId, label] of [
  [68, 68, 'السديس'],
  [959, 112, 'المنشاوي'],
  [960, 46, 'الشريم']
]) {
  const item = await resolveAyahBayahReciter(identifier);
  if (!item) {
    fail(`تعذر resolve لـ ${identifier}`);
    continue;
  }
  if (item.id !== expectedId) fail(`${label}: ${identifier} يجب أن يحل إلى ID ${expectedId} لكن الناتج ${item.id}`);
  const surah1 = getSurahFromDataset(item._dataset, 1);
  const ayah1 = getVerseFromDataset(item._dataset, 1, 1);
  if (!surah1) fail(`${label}: سورة الفاتحة غير موجودة`);
  if (!ayah1) fail(`${label}: الفاتحة 1:1 غير موجودة`);
  if (identifier === 68 && !ayah1?.record?.timestamp_to) fail('السديس 1:1 لا يحتوي timestamp_to');
  if ((identifier === 959 || identifier === 960) && !ayah1?.record?.audio_url) fail(`${label} 1:1 لا يحتوي audio_url`);
  ok(`${label}: endpoint data source verified for ${identifier}/1/1`);
}

if (!process.exitCode) console.log('🎉 RECITER_DATA_TESTS_OK');
