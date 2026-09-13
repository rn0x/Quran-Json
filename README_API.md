# 📚 Quran Data API Documentation

## 🌐 Base URLs
```
Production: https://msr-quran-data.vercel.app/api
Local:       http://localhost:5000/api
```

## 📊 API Statistics
- **16** Main Endpoints (including all routes)
- **114** Surahs
- **6,236** Verses
- **133** Audio Reciters (from audio table)
- **4** Timing Reciters (with timing data)
- **20,675** Verse Timings
- **604** Quran Page Images
- **30** Juz (Parts)
- **15** Sajda Verses

## 📋 Complete Available Endpoints

### 📘 Surahs (السور)
- `GET /surahs` - Get all surahs
- `GET /surah/:surah_id` - Get specific surah info

### 📖 Verses (الآيات)
- `GET /verses/:surah_id` - Get all verses of a surah
- `GET /verse/:surah_id/:verse_id` - Get specific verse

### 🧎‍♂️ Sajda (السجدة)
- `GET /sajda` - Get all sajda verses

### 🔊 Audio (الصوتيات)
- `GET /audio/:surah_id` - Get all audio files for a surah
- `GET /audio/:surah_id/:reciter` - Get audio files for specific reciter and surah

### 🎙️ Reciters (القراء)
- `GET /reciters` - Get all audio reciters (133 reciters from audio table)

### 📘 Juz (الأجزاء)
- `GET /juz/:juz_id` - Get all verses in a juz

### 📄 Pages (الصفحات)
- `GET /pages/:surah_id/:verse_id` - Get page number for verse

### ⏱️ Timing (التوقيت)
- `GET /timing/reciters` - Get timing reciters only (4 reciters with timing data)
- `GET /timing/:reciter/surahs` - Get available surahs for a timing reciter
- `GET /timing/:reciter/:surah_id` - Get verse timings for a surah
- `GET /timing/:reciter/:surah_id/:verse_id` - Get timing for specific verse
- `GET /timing/search` - Search timings by reciter, surah, verse (with query params)

**Available Timing Reciters:**
- `sudais` - الشيخ عبد الرحمن السديس
- `Shuraym` - الشيخ سعود الشريم  
- `Al-Juhaynee` - الشيخ عبد الله الجهني
- `Hudhaify` - الشيخ علي الحذيفي

### 🖼️ Images (الصور)
- `GET /data/quran_image/:page.png` - Get Quran page image (1-604)

### 📚 API Reference
- `GET /api-reference` - Get complete API documentation (from database)

## 🚀 Quick Start

### Basic Examples

```javascript
// Fetch all surahs
const response = await fetch('https://msr-quran-data.vercel.app/api/surahs');
const surahs = await response.json();

// Fetch verses of Al-Fatihah
const verses = await fetch('https://msr-quran-data.vercel.app/api/verses/1');
const fatihahVerses = await verses.json();

// Fetch all audio reciters (133 reciters)
const allReciters = await fetch('https://msr-quran-data.vercel.app/api/reciters');
const audioReciters = await allReciters.json();

// Fetch timing reciters only (4 reciters)
const timingReciters = await fetch('https://msr-quran-data.vercel.app/api/timing/reciters');
const timingData = await timingReciters.json();

// Fetch audio for specific reciter and surah
const specificAudio = await fetch('https://msr-quran-data.vercel.app/api/audio/1/sudais');
const sudaisAudio = await specificAudio.json();

// Fetch verse timings for Al-Fatihah by Sudais
const timings = await fetch('https://msr-quran-data.vercel.app/api/timing/sudais/1');
const fatihahTimings = await timings.json();
```

### Advanced Examples

```javascript
// Get timing for specific verse
const verseOneTiming = await fetch('https://msr-quran-data.vercel.app/api/timing/sudais/1/1');
const firstVerse = await verseOneTiming.json();

// Get all available surahs for a reciter
const surahsForSudais = await fetch('https://msr-quran-data.vercel.app/api/timing/sudais/surahs');
const availableSurahs = await surahsForSudais.json();

// Get audio files for a surah
const audioFiles = await fetch('https://msr-quran-data.vercel.app/api/audio/1');
const fatihahAudio = await audioFiles.json();

// Get page information
const pageInfo = await fetch('https://msr-quran-data.vercel.app/api/pages/1/1');
const page = await pageInfo.json();

// Get API reference documentation
const apiRef = await fetch('https://msr-quran-data.vercel.app/api/api-reference');
const documentation = await apiRef.json();
```

### 📋 Timing API Detailed Examples

```javascript
// Example 1: Get all available reciters
const recitersResponse = await fetch('https://msr-quran-data.vercel.app/api/timing/reciters');
const reciters = await recitersResponse.json();
console.log(reciters);
// Returns: List of all 4 reciters with timing data

// Example 2: Get timing for complete Al-Fatihah by Sudais
const timingResponse = await fetch('https://msr-quran-data.vercel.app/api/timing/sudais/1');
const fatihahTiming = await timingResponse.json();
console.log(fatihahTiming);

// Example 3: Get timing for first verse only
const verseTimingResponse = await fetch('https://msr-quran-data.vercel.app/api/timing/sudais/1/1');
const firstVerseTiming = await verseTimingResponse.json();
console.log(firstVerseTiming);

// Example 4: Get available surahs for Shuraym
const shurayimSurahs = await fetch('https://msr-quran-data.vercel.app/api/timing/Shuraym/surahs');
const availableSurahs = await shurayimSurahs.json();
console.log(availableSurahs);
```

### 📋 Timing API Response Example

```json
{
  "success": true,
  "data": {
    "reciter": "Sudais",
    "reciter_key": "sudais",
    "surah_number": 1,
    "verses_count": 8,
    "total_duration_seconds": 38.126,
    "verses": [
      {
        "verse_number": 1,
        "timing_seconds": 3.371,
        "reciter_display_name": "Sudais"
      }
    ]
  }
}
```

## 📊 Final Statistics

- **114** Surahs
- **6,236** Verses  
- **133** Audio Reciters (complete audio library)
- **4** Timing Reciters (Sudais, Shuraym, Al-Juhaynee, Hudhaify)
- **20,675** Verse Timings
- **604** Pages
- **30** Juz
- **15** Sajda Verses

## 🎯 Key Features

✅ **Complete Quran Data** - All 114 surahs with 6,236 verses  
✅ **Extensive Audio Library** - 133 different reciters  
✅ **Precise Timing Data** - 20,675 verse timings for 4 reciters  
✅ **Page-by-Page Navigation** - 604 Quran page images  
✅ **Search Capabilities** - Search timing data by multiple criteria  
✅ **API Reference** - Complete documentation stored in database  
✅ **Rate Limiting** - 300 requests/minute protection  
✅ **CORS Enabled** - Ready for web applications

## 🛡️ Rate Limiting
- **Default:** 300 requests per minute per IP
- Configurable via `API_RATE_LIMIT` environment variable

## 🌍 CORS

API supports Cross-Origin Resource Sharing (CORS) for web applications.

## 🚀 Deployment

The API is deployed on **Vercel** and available at:

- **Production:** `https://msr-quran-data.vercel.app/api`
- **Documentation:** `https://msr-quran-data.vercel.app`
- **Status:** ✅ Live and fully operational

### Performance Metrics (Vercel)

- **Response Time:** 300-800ms average
- **Uptime:** 99.9%
- **Cold Start:** ~3-5 seconds (if sleeping)
- **Region:** US-West

### Available Reciters for Timing

- **sudais** - الشيخ عبد الرحمن السديس
- **Shuraym** - الشيخ سعود الشريم  
- **Al-Juhaynee** - الشيخ عبد الله الجهني
- **Hudhaify** - الشيخ علي الحذيفي

---

### 📚 API Reference Response Example

```json
{
  "success": true,
  "data": {
    "api_info": {
      "title": "Quran Data API - مرجع شامل",
      "description": "واجهة برمجة تطبيقات شاملة للقرآن الكريم",
      "version": "3.1.0",
      "base_url": "https://msr-quran-data.vercel.app/api",
      "documentation_url": "https://msr-quran-data.vercel.app",
      "github_url": "https://github.com/Msr7799/Quran-Data"
    },
    "statistics": {
      "total_surahs": 114,
      "total_verses": 6236,
      "total_audio_reciters": 158,
      "timing_reciters": 4,
      "total_verse_timings": 20675
    },
    "endpoints": {
      "/surahs": {
        "method": "GET",
        "description": "جلب جميع السور",
        "example_url": "https://msr-quran-data.vercel.app/api/surahs"
      },
      "/timing/reciters": {
        "method": "GET", 
        "description": "جلب جميع القراء المتاحين للتوقيت",
        "example_url": "https://msr-quran-data.vercel.app/api/timing/reciters"
      }
    }
  }
}
```

## 🧪 Testing the API

You can test the API endpoints using the available methods:

```bash
# Visit documentation page
https://msr-quran-data.vercel.app

# Test API Reference endpoint
curlhttps://msr-quran-data.vercel.app/api/api-reference

# Test timing search endpoint
curl "https://msr-quran-data.vercel.app/api/timing/search?reciter=sudais&surah=1"

# Test all audio reciters
curlhttps://msr-quran-data.vercel.app/api/reciters

# Test audio by specific reciter
curlhttps://msr-quran-data.vercel.app/api/audio/1/sudais
```

---

## 📝 Quick Reference للمطور

### 🔗 URLs الأساسية:
- **Production:** `https://msr-quran-data.vercel.app/api`
- **Local Development:** `http://localhost:5000/api`
- **Documentation:** `https://msr-quran-data.vercel.app`

### 📊 إحصائيات سريعة:
- **16 Endpoints** كاملة
- **158 قارئ صوتي** (جدول audio)
- **4 قراء توقيت** (جدول ayat_timing)
- **20,675 توقيت آية** دقيق

### 🛠️ الملفات الرئيسية:
- `server/routes/apiRoutes.mjs` - جميع الراوتات
- `server/controllers/surahController.mjs` - كنترولر السور والآيات
- `server/controllers/timingController.mjs` - كنترولر التوقيتات
- `docs/api-definition.yaml` - التوثيق الكامل

### ⚡ أهم الراوتات:
```
GET /reciters                    → 158 قارئ صوتي
GET /timing/reciters             → 4 قراء توقيت  
GET /audio/:surah_id/:reciter    → صوتيات بالقارئ
GET /timing/search               → البحث في التوقيتات
GET /api-reference               → مرجع API شامل
```

### 🎯 ملاحظات للمطور:
- Rate Limit: 300 طلب/دقيقة
- جميع الاستجابات JSON
- CORS مفعل للويب أبس
- معالجة أخطاء شاملة
- التوثيق محفوظ في SQLite

---

## Made with ❤️ for the Quran community
