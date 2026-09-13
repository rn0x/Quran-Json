import { isMainModule } from './runtime.mjs';
/**
 * سكربت مساعد لاستعلام وإدارة ملفات JSON المخزنة في قاعدة البيانات
 * يوفر دوال للبحث والاستعلام عن البيانات المدخلة
 * 
 * الاستخدام:
 * node scripts/jsonUtils.mjs
 * node scripts/jsonUtils.mjs --search=api
 * node scripts/jsonUtils.mjs --file=api_reference.json
 * node scripts/jsonUtils.mjs --list
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار قاعدة البيانات
const dbPath = path.join(__dirname, '..', 'data', 'sqlite', 'database.sqlite');

/**
 * الاتصال بقاعدة البيانات
 */
async function connectDB() {
    try {
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        return db;
    } catch (error) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
        throw error;
    }
}

/**
 * جلب جميع ملفات JSON
 */
async function getAllJsonFiles() {
    const db = await connectDB();
    try {
        const files = await db.all(`
            SELECT 
                id, file_name, file_path, content_size,
                description, version, tags, created_at, updated_at
            FROM json_files 
            ORDER BY created_at DESC
        `);
        return files;
    } finally {
        await db.close();
    }
}

/**
 * البحث في ملفات JSON
 */
async function searchJsonFiles(searchTerm) {
    const db = await connectDB();
    try {
        const files = await db.all(`
            SELECT 
                id, file_name, file_path, content_size,
                description, version, tags, created_at
            FROM json_files 
            WHERE 
                file_name LIKE ? OR 
                description LIKE ? OR 
                tags LIKE ? OR
                json_content LIKE ?
            ORDER BY created_at DESC
        `, [
            `%${searchTerm}%`,
            `%${searchTerm}%`,
            `%${searchTerm}%`,
            `%${searchTerm}%`
        ]);
        return files;
    } finally {
        await db.close();
    }
}

/**
 * جلب ملف JSON محدد مع محتواه
 */
async function getJsonFile(fileName) {
    const db = await connectDB();
    try {
        const file = await db.get(`
            SELECT * FROM json_files 
            WHERE file_name = ?
        `, [fileName]);
        
        if (file && file.json_content) {
            file.parsed_content = JSON.parse(file.json_content);
        }
        
        return file;
    } finally {
        await db.close();
    }
}

/**
 * جلب الإحصائيات
 */
async function getStatistics() {
    const db = await connectDB();
    try {
        const totalStats = await db.get(`
            SELECT 
                COUNT(*) as total_files,
                SUM(content_size) as total_size,
                AVG(content_size) as avg_size,
                MIN(created_at) as oldest_file,
                MAX(created_at) as newest_file
            FROM json_files
        `);

        const typeStats = await db.all(`
            SELECT 
                CASE 
                    WHEN file_name LIKE '%api%' THEN 'API'
                    WHEN file_name LIKE '%audio%' THEN 'Audio'
                    WHEN file_name LIKE '%timing%' THEN 'Timing'
                    WHEN file_name LIKE '%surah%' THEN 'Surah'
                    WHEN file_name LIKE '%verse%' THEN 'Verse'
                    ELSE 'Other'
                END as file_type,
                COUNT(*) as count,
                SUM(content_size) as total_size
            FROM json_files
            GROUP BY file_type
            ORDER BY count DESC
        `);

        const tagStats = await db.all(`
            SELECT 
                tags,
                COUNT(*) as count
            FROM json_files
            WHERE tags IS NOT NULL AND tags != ''
            GROUP BY tags
            ORDER BY count DESC
            LIMIT 10
        `);

        return {
            total: totalStats,
            byType: typeStats,
            byTags: tagStats
        };
    } finally {
        await db.close();
    }
}

/**
 * عرض معلومات ملف JSON بشكل منسق
 */
function displayFileInfo(file) {
    const createdDate = new Date(file.created_at).toLocaleString('ar');
    const updatedDate = file.updated_at ? new Date(file.updated_at).toLocaleString('ar') : 'غير محدد';
    const sizeKB = (file.content_size / 1024).toFixed(2);

    console.log(`
📄 معلومات الملف:
  🏷️  الاسم: ${file.file_name}
  📂 المسار: ${file.file_path}
  📏 الحجم: ${sizeKB} KB
  📝 الوصف: ${file.description || 'غير محدد'}
  🔢 الإصدار: ${file.version || 'غير محدد'}
  🏷️  العلامات: ${file.tags || 'غير محدد'}
  📅 تاريخ الإنشاء: ${createdDate}
  🔄 تاريخ التحديث: ${updatedDate}
`);
}

/**
 * عرض قائمة الملفات بشكل منسق
 */
function displayFilesList(files) {
    if (files.length === 0) {
        console.log('📭 لا توجد ملفات');
        return;
    }

    console.log(`📋 قائمة الملفات (${files.length} ملف):\n`);
    
    files.forEach((file, index) => {
        const sizeKB = (file.content_size / 1024).toFixed(2);
        const date = new Date(file.created_at).toLocaleDateString('ar');
        const tags = file.tags ? file.tags.split(',').map(tag => `#${tag}`).join(' ') : '';
        
        console.log(`${index + 1}. 📄 ${file.file_name}`);
        console.log(`   📏 ${sizeKB} KB | 📅 ${date} ${tags ? '| 🏷️ ' + tags : ''}`);
        if (file.description) {
            console.log(`   📝 ${file.description}`);
        }
        console.log('');
    });
}

/**
 * عرض الإحصائيات بشكل منسق
 */
function displayStatistics(stats) {
    console.log('\n📊 إحصائيات ملفات JSON في قاعدة البيانات:\n');

    // الإحصائيات العامة
    const totalSizeMB = (stats.total.total_size / (1024 * 1024)).toFixed(2);
    const avgSizeKB = (stats.total.avg_size / 1024).toFixed(2);
    const oldestDate = new Date(stats.total.oldest_file).toLocaleDateString('ar');
    const newestDate = new Date(stats.total.newest_file).toLocaleDateString('ar');

    console.log('📈 الإحصائيات العامة:');
    console.log(`  📁 إجمالي الملفات: ${stats.total.total_files}`);
    console.log(`  💾 إجمالي الحجم: ${totalSizeMB} MB`);
    console.log(`  📏 متوسط حجم الملف: ${avgSizeKB} KB`);
    console.log(`  📅 أقدم ملف: ${oldestDate}`);
    console.log(`  📅 أحدث ملف: ${newestDate}`);

    // الإحصائيات حسب النوع
    if (stats.byType.length > 0) {
        console.log('\n📊 التوزيع حسب النوع:');
        stats.byType.forEach(type => {
            const typeSizeKB = (type.total_size / 1024).toFixed(2);
            console.log(`  ${type.file_type}: ${type.count} ملف (${typeSizeKB} KB)`);
        });
    }

    // الإحصائيات حسب العلامات
    if (stats.byTags.length > 0) {
        console.log('\n🏷️  العلامات الأكثر استخداماً:');
        stats.byTags.forEach(tag => {
            const tagsList = tag.tags.split(',').map(t => `#${t}`).join(' ');
            console.log(`  ${tagsList}: ${tag.count} ملف`);
        });
    }
}

/**
 * عرض محتوى ملف JSON بشكل منسق
 */
function displayJsonContent(file, maxDepth = 2) {
    if (!file.parsed_content) {
        console.log('❌ لا يمكن عرض محتوى الملف');
        return;
    }

    console.log('\n📄 محتوى الملف (معاينة):');
    console.log('─'.repeat(50));
    
    try {
        const content = JSON.stringify(file.parsed_content, null, 2);
        const lines = content.split('\n');
        
        // عرض أول 20 سطر فقط
        const preview = lines.slice(0, 20).join('\n');
        console.log(preview);
        
        if (lines.length > 20) {
            console.log(`\n... (${lines.length - 20} سطر إضافي)`);
        }
    } catch (error) {
        console.error('❌ خطأ في عرض المحتوى:', error.message);
    }
    
    console.log('─'.repeat(50));
}

/**
 * معالجة المعاملات من سطر الأوامر
 */
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        search: null,
        file: null,
        list: false,
        stats: false,
        content: false,
        help: false
    };

    args.forEach(arg => {
        if (arg.startsWith('--search=')) {
            options.search = arg.split('=')[1];
        } else if (arg.startsWith('--file=')) {
            options.file = arg.split('=')[1];
        } else if (arg === '--list') {
            options.list = true;
        } else if (arg === '--stats') {
            options.stats = true;
        } else if (arg === '--content') {
            options.content = true;
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        }
    });

    return options;
}

/**
 * عرض مساعدة الاستخدام
 */
function showHelp() {
    console.log(`
🔍 سكربت مساعد لاستعلام ملفات JSON في قاعدة البيانات

📖 الاستخدام:
  node scripts/jsonUtils.mjs                      # عرض الإحصائيات
  node scripts/jsonUtils.mjs --list               # عرض جميع الملفات
  node scripts/jsonUtils.mjs --search=api         # البحث في الملفات
  node scripts/jsonUtils.mjs --file=api_reference.json  # عرض ملف محدد
  node scripts/jsonUtils.mjs --file=api_reference.json --content  # مع المحتوى
  node scripts/jsonUtils.mjs --stats              # الإحصائيات المفصلة
  node scripts/jsonUtils.mjs --help               # عرض هذه المساعدة

🔍 أمثلة البحث:
  --search=api          # البحث عن ملفات API
  --search=audio        # البحث عن ملفات الصوت
  --search=timing       # البحث عن ملفات التوقيت
  --search=reference    # البحث عن ملفات المرجع

💡 الميزات:
  ✅ عرض معلومات مفصلة عن الملفات
  ✅ البحث في الأسماء والمحتوى
  ✅ إحصائيات شاملة
  ✅ معاينة محتوى JSON
  ✅ تصفية حسب العلامات
`);
}

/**
 * الدالة الرئيسية
 */
async function main() {
    const options = parseArguments();

    if (options.help) {
        showHelp();
        return;
    }

    console.log('🔍 سكربت استعلام ملفات JSON من قاعدة البيانات\n');

    try {
        if (options.file) {
            // عرض ملف محدد
            const file = await getJsonFile(options.file);
            if (file) {
                displayFileInfo(file);
                if (options.content) {
                    displayJsonContent(file);
                }
            } else {
                console.log(`❌ الملف غير موجود: ${options.file}`);
            }

        } else if (options.search) {
            // البحث في الملفات
            console.log(`🔍 البحث عن: "${options.search}"\n`);
            const files = await searchJsonFiles(options.search);
            displayFilesList(files);

        } else if (options.list) {
            // عرض جميع الملفات
            const files = await getAllJsonFiles();
            displayFilesList(files);

        } else {
            // عرض الإحصائيات (افتراضي)
            const stats = await getStatistics();
            displayStatistics(stats);
        }

    } catch (error) {
        console.error('❌ خطأ في تنفيذ السكربت:', error.message);
        process.exit(1);
    }
}

// تصدير الدوال للاستخدام في سكربتات أخرى
export {
    connectDB,
    getAllJsonFiles,
    searchJsonFiles,
    getJsonFile,
    getStatistics
};

// تشغيل السكربت إذا تم استدعاؤه مباشرة
if (isMainModule(import.meta.url)) {
    main().catch(console.error);
}
