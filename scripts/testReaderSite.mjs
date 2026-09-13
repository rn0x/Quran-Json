import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listAyahBayahReciters, loadReciterCatalogWithImages, getSurahFromDataset } from '../server/services/reciterDataService.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const publicDir = path.join(root, 'server', 'public');
const dataDir = path.join(root, 'data');
let failed = false;
const ok = (condition, message) => { console.log(`${condition ? '✅' : '❌'} ${message}`); if (!condition) failed = true; };

for (const file of ['index.html','reader.css','reader.js','uthmanic_hafs.ttf','docs.html']) {
  ok(fs.existsSync(path.join(publicDir,file)), `public/${file}`);
}
const html = fs.readFileSync(path.join(publicDir,'index.html'),'utf8');
const js = fs.readFileSync(path.join(publicDir,'reader.js'),'utf8');
const docs = fs.readFileSync(path.join(publicDir,'docs.html'),'utf8');
const docsCss = fs.readFileSync(path.join(publicDir,'style.css'),'utf8');
const redocBundle = fs.readFileSync(path.join(publicDir,'redoc.standalone.js'),'utf8');
const redocSourceMap = JSON.parse(fs.readFileSync(path.join(publicDir,'redoc.standalone.js.map'),'utf8'));
const openapi = fs.readFileSync(path.join(root,'docs','api-definition.yaml'),'utf8');
ok(html.includes('المصحف التفاعلي') && html.includes('api-lab'), 'واجهة القارئ ومختبر API موجودان');
ok(js.includes('/api/ayah-bayah/') && js.includes('/api/reciter-images') && js.includes('/api/surah/'), 'الواجهة مربوطة بمسارات API الفعلية');
ok(js.includes('/api/pages/') && js.includes('/api/ayah-bayah/reciters') && js.includes('/api/ayah-audio/reciters') && js.includes('/api/api-reference'), 'مختبر API يغطي جميع مجموعات أوامر الإصدار 3.1.0');
ok(html.includes('id="apiVisualOutput"') && js.includes('renderVisualOutput') && js.includes('preview: "pages"') && js.includes('preview: "reciters"') && js.includes('preview: "surah-names"'), 'مختبر API يعرض صفحات المصحف وصور القراء وأسماء السور بصريًا');
ok(html.includes('id="routeForm"') && html.includes('id="routeInput"') && js.includes('normalizeRoute') && js.includes('submitCustomRoute'), 'مختبر API يقبل route مخصصًا ويعرض نتيجته');
ok(html.includes('viewport-fit=cover') && docs.includes('viewport-fit=cover') && /@media \(max-width: 420px\)/.test(docsCss), 'صفحتا المصحف والوثائق تدعمان شاشات الهواتف والحواف الآمنة');
ok(js.includes('syncNativePlaybackTracking') && js.includes('addEventListener("play", syncNativePlaybackTracking)') && js.includes('addEventListener("seeked"'), 'التتبع يعمل عند التشغيل والتحريك من مشغل الصوت الأصلي');
ok(docs.includes('href="/index.html"') && docs.includes('الموقع التجريبي'), 'docs.html يحتوي زر الموقع التجريبي في الناف بار');
const redocInitIndex = docs.indexOf('Redoc.init(');
const redocLoadingIndex = docs.indexOf('redocContainer.innerHTML');
ok(redocLoadingIndex >= 0 && redocLoadingIndex < redocInitIndex, 'رسالة تحميل ReDoc تسبق التهيئة ولا تستبدل القائمة بعدها');
ok(/menuToggle:\s*true/.test(docs), 'قائمة ReDoc تسمح بفتح القسم النشط وإغلاقه');
ok(!docsCss.includes('[role="menu"] > li > ul'), 'لا يوجد CSS يجبر جميع خيارات ReDoc على الظهور');
ok(!/^tags:/m.test(openapi) && !/^x-tagGroups:/m.test(openapi) && !/^\s{6}tags:/m.test(openapi), 'جميع مسارات ReDoc مسطحة في القائمة الرئيسية دون dropdown');
ok(['/reciter-images:', '/surah-names:', '/ayah-bayah/reciters:'].every(path => openapi.includes(path)), 'صور القراء والسور والتتبع مضمّنة في القائمة الرئيسية');
ok(/#redoc-container\s*\{[^}]*max-height:\s*85vh;[^}]*overflow-y:\s*auto;/s.test(docsCss), 'حاوية ReDoc محدودة الارتفاع وتستخدم تمريرًا داخليًا مثل النسخة القديمة');
ok(!/#redoc-container\s*\{[^}]*max-height:\s*none\s*!important/s.test(docsCss), 'لا يوجد override يمدد ReDoc بطول جميع العمليات');
ok(redocBundle.includes('"group" !== this.type && (this.expanded = !1);'), 'ReDoc يطوي القسم السابق عند اختيار قسم جديد');
ok(redocBundle.includes('down: "0deg"'), 'دوران سهم ReDoc يستخدم قيمة CSS صالحة');
ok(Array.isArray(redocSourceMap.sources) && redocSourceMap.sources.length > 0 && typeof redocSourceMap.mappings === 'string', 'ملف source map صالح بعد تعديل ReDoc');
ok(docs.includes('style.css?v=3.1.0-natural-redoc-menu-2') && docs.includes('redoc.standalone.js?v=3.1.0-natural-redoc-menu-2'), 'أصول ReDoc تستخدم إصدار cache جديدًا');
ok(openapi.includes('version: 3.1.0') && openapi.includes('/ayah-bayah/{reciter_id}/{surah_id}/{verse_id}') && openapi.includes('shuraim_960'), 'أمثلة القراء والتتبع موجودة داخل OpenAPI/ReDoc v3.1.0');

const svgCount = fs.readdirSync(path.join(dataDir,'suwer-name')).filter(x=>/^\d{3}\.svg$/i.test(x)).length;
ok(svgCount===114, `صور أسماء السور: ${svgCount}/114`);

const catalog = await loadReciterCatalogWithImages({refresh:true});
const imageCount = catalog.filter(x=>x.image?.url).length;
ok(catalog.length===158, `فهرس القراء: ${catalog.length}/158`);
ok(imageCount===158, `صور القراء المربوطة: ${imageCount}/158`);

const tracked = await listAyahBayahReciters({refresh:true});
ok(tracked.length===9, `مجموعات التتبع: ${tracked.length}/9`);
const expected = new Map([[29,'surah-by-surah'],[46,'ayah-by-ayah'],[68,'surah-by-surah'],[82,'surah-by-surah'],[90,'surah-by-surah'],[101,'surah-by-surah'],[112,'ayah-by-ayah'],[131,'surah-by-surah'],[152,'surah-by-surah']]);
for (const [id,type] of expected) {
  const r=tracked.find(x=>x.id===id);
  ok(Boolean(r) && r.recitation_type===type, `القارئ ${id}: ${type}`);
}
const sudais = tracked.find(x=>x.id===68);
const huthaify = tracked.find(x=>x.id===90);
const minshawi = tracked.find(x=>x.id===112);
const s1 = getSurahFromDataset(sudais._dataset,1);
const h1 = getSurahFromDataset(huthaify._dataset,1);
const m1 = getSurahFromDataset(minshawi._dataset,1);
ok(Boolean(s1?.chapterAudio?.audio_url) && s1.records.length===7, 'السديس: صوت سورة الفاتحة + 7 سجلات تتبع');
ok(Boolean(h1?.chapterAudio?.audio_url) && h1.records.length===7 && h1.records.every(x=>x.segments.length>0), 'الحذيفي: صوت سورة الفاتحة + تتبع الآيات والكلمات');
ok(!m1?.chapterAudio && m1.records.length===7 && m1.records.every(x=>x.audio_url), 'المنشاوي: 7 ملفات آية-بآية للفاتحة');

if (failed) process.exitCode=1;
else console.log('🎉 READER_SITE_TESTS_OK');
