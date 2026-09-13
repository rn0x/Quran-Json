/**
 * سكربت اختبار سريع لعمليات إدخال واستعلام ملفات JSON
 * يختبر العمليات الأساسية ويعرض أمثلة للاستخدام
 */

import { getAllJsonFiles, getJsonFile, searchJsonFiles } from './jsonUtils.mjs';

async function runTests() {
    console.log('🧪 بدء اختبار عمليات ملفات JSON...\n');

    try {
        // اختبار 1: جلب جميع الملفات
        console.log('📋 اختبار 1: جلب جميع ملفات JSON');
        const allFiles = await getAllJsonFiles();
        console.log(`✅ تم العثور على ${allFiles.length} ملف`);
        
        if (allFiles.length > 0) {
            console.log(`📄 آخر ملف: ${allFiles[0].file_name}`);
        }

        // اختبار 2: البحث عن ملفات API
        console.log('\n🔍 اختبار 2: البحث عن ملفات API');
        const apiFiles = await searchJsonFiles('api');
        console.log(`✅ تم العثور على ${apiFiles.length} ملف API`);

        // اختبار 3: جلب ملف محدد
        if (allFiles.length > 0) {
            const fileName = allFiles[0].file_name;
            console.log(`\n📄 اختبار 3: جلب الملف ${fileName}`);
            const specificFile = await getJsonFile(fileName);
            
            if (specificFile) {
                console.log(`✅ تم جلب الملف بنجاح`);
                console.log(`📏 حجم المحتوى: ${specificFile.json_content.length} حرف`);
                
                // تحليل المحتوى
                try {
                    const parsed = JSON.parse(specificFile.json_content);
                    const keys = Object.keys(parsed);
                    console.log(`🔑 المفاتيح الرئيسية: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
                } catch (error) {
                    console.log('⚠️ تحذير: لا يمكن تحليل محتوى JSON');
                }
            }
        }

        // اختبار 4: البحث بكلمات مختلفة
        console.log('\n🔍 اختبار 4: اختبار البحث المتقدم');
        const searchTerms = ['reference', 'audio', 'timing', 'metadata'];
        
        for (const term of searchTerms) {
            const results = await searchJsonFiles(term);
            console.log(`  "${term}": ${results.length} ملف`);
        }

        console.log('\n🎉 انتهت جميع الاختبارات بنجاح!');

    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error.message);
    }
}

// تشغيل الاختبارات
runTests();
