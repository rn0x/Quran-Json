# 📁 مجلد السكربتات - Quran Data Scripts

هذا المجلد يحتوي على السكربتات الأساسية لمعالجة وإدارة بيانات القرآن الكريم.

## 🔧 السكربتات المتاحة:

### 📊 **إدارة قاعدة البيانات:**

#### `jsonToSqlite.mjs`
- **الوظيفة:** إنشاء قاعدة بيانات SQLite من ملف JSON الرئيسي
- **الاستخدام:** `node scripts/jsonToSqlite.mjs`
- **المدخلات:** `data/mainDataQuran.json`
- **المخرجات:** `data/sqlite/database.sqlite`
- **الجداول المُنشأة:** `surahs`, `verses`, `audio`

#### `addTimingToSqlite.mjs`
- **الوظيفة:** إضافة بيانات توقيت التلاوة إلى قاعدة البيانات
- **الاستخدام:** `node scripts/addTimingToSqlite.mjs`
- **المدخلات:** `data/json/ayat_Timming/*.json`
- **الجداول المُنشأة:** `ayat_timing`
- **الدوال المصدرة:**
  - `getVerseTimings(reciterName, surahNumber)` - جلب توقيت آيات سورة
  - `getAvailableReciters()` - جلب قائمة القراء المتاحين
  - `displayVerseTimings(reciterName, surahNumber)` - عرض التوقيت بشكل منسق

#### `addApiReferenceToSqlite.mjs`
- **الوظيفة:** إضافة مرجع API إلى قاعدة البيانات
- **الاستخدام:** `node scripts/addApiReferenceToSqlite.mjs`
- **المدخلات:** `data/json/api_reference.json`
- **الجداول المُنشأة:** `api_reference`

#### `addJsonToSqlite.mjs`
- **الوظيفة:** إدخال ملفات JSON عامة إلى قاعدة البيانات
- **الاستخدام:** `node scripts/addJsonToSqlite.mjs [--file=filename] [--folder=foldername]`
- **الجداول المُنشأة:** `json_files`
- **خيارات التشغيل:**
  - بدون معاملات: إدخال جميع ملفات JSON
  - `--file=filename.json`: إدخال ملف محدد
  - `--folder=foldername`: إدخال ملفات مجلد محدد

### 📤 **تصدير البيانات:**

#### `splitData.mjs`
- **الوظيفة:** تقسيم ملف JSON الرئيسي إلى ملفات منفصلة
- **الاستخدام:** `node scripts/splitData.mjs`
- **المدخلات:** `data/mainDataQuran.json`
- **المخرجات:**
  - `data/json/metadata.json` - معلومات السور
  - `data/json/surah/surah_*.json` - ملفات السور منفصلة
  - `data/json/verses/*.json` - ملفات الآيات منفصلة
  - `data/json/audio/audio_surah_*.json` - ملفات الصوتيات منفصلة

#### `jsonToCsv.mjs`
- **الوظيفة:** تحويل ملف JSON الرئيسي إلى صيغة CSV
- **الاستخدام:** `node scripts/jsonToCsv.mjs`
- **المدخلات:** `data/mainDataQuran.json`
- **المخرجات:** `data/csv/database.csv`

### 🛠️ **مساعدات عامة:**

#### `fetchJson.mjs`
- **الوظيفة:** دالة مساعدة لجلب JSON من الإنترنت
- **الاستخدام:** `import { fetchJson } from './fetchJson.mjs'`
- **الدوال المصدرة:**
  - `fetchJson(url)` - جلب JSON من رابط

#### `translateText.mjs`
- **الوظيفة:** ترجمة النصوص باستخدام Google Translate
- **الاستخدام:** `import { translateText } from './translateText.mjs'`
- **الدوال المصدرة:**
  - `translateText(text, targetLanguage)` - ترجمة نص
  - `getTranslation(text, targetLanguage)` - ترجمة مع تخزين مؤقت

## 📋 **ترتيب التشغيل الموصى به:**

1. **`jsonToSqlite.mjs`** - إنشاء قاعدة البيانات الأساسية
2. **`addTimingToSqlite.mjs`** - إضافة بيانات التوقيت
3. **`addApiReferenceToSqlite.mjs`** - إضافة مرجع API
4. **`splitData.mjs`** - تقسيم البيانات (اختياري)
5. **`jsonToCsv.mjs`** - تصدير CSV (اختياري)

## 🎯 **ملاحظات مهمة:**

- جميع السكربتات تستخدم **ES Modules** (import/export)
- تأكد من وجود مجلد `data` والملفات المطلوبة قبل التشغيل
- السكربتات تقوم بإنشاء المجلدات المطلوبة تلقائياً
- يمكن تشغيل السكربتات بشكل منفصل أو مجتمع
- جميع السكربتات تدعم معالجة الأخطاء وإظهار رسائل واضحة

## 🚀 **للمطورين:**

يمكن استيراد الدوال المصدرة من السكربتات لاستخدامها في تطبيقات أخرى:

```javascript
// مثال: استخدام دوال التوقيت
import { getVerseTimings, displayVerseTimings } from './addTimingToSqlite.mjs';

// جلب توقيت الفاتحة للسديس
const timings = await getVerseTimings('sudais', 1);

// عرض التوقيت بشكل منسق
await displayVerseTimings('sudais', 1);
```

---

**📧 للدعم:** راجع الوثائق الرئيسية في `/docs` أو افتح issue في GitHub.
