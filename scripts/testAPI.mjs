// اختبار API للتوقيت
const baseUrl = 'http://localhost:5000/api';

async function testAPI() {
    try {
        console.log('🧪 اختبار API للتوقيت...\n');

        // 1. اختبار جلب جميع القراء
        console.log('1️⃣ اختبار جلب جميع القراء:');
        console.log(`GET ${baseUrl}/timing/reciters`);
        
        const recitersResponse = await fetch(`${baseUrl}/timing/reciters`);
        const recitersData = await recitersResponse.json();
        
        if (recitersData.success) {
            console.log('✅ نجح جلب القراء');
            console.log(`📊 عدد القراء: ${recitersData.count}`);
            recitersData.data.forEach(r => {
                console.log(`   - ${r.reciter_name} (${r.reciter_display_name}) - ${r.verses_count} آية`);
            });
        } else {
            console.log('❌ فشل في جلب القراء');
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // 2. اختبار جلب توقيت الفاتحة للسديس
        console.log('2️⃣ اختبار جلب توقيت الفاتحة للسديس:');
        console.log(`GET ${baseUrl}/timing/sudais/1`);
        
        const timingResponse = await fetch(`${baseUrl}/timing/sudais/1`);
        const timingData = await timingResponse.json();
        
        if (timingData.success) {
            console.log('✅ نجح جلب التوقيت');
            console.log(`📖 السورة: ${timingData.surah_info.name.transliteration}`);
            console.log(`🎤 القارئ: ${timingData.reciter_info.display_name}`);
            console.log(`📊 عدد الآيات: ${timingData.count}`);
            console.log('\n📋 توقيت الآيات:');
            
            timingData.data.slice(0, 5).forEach(verse => {
                console.log(`   الآية ${verse.verse_number}: ${verse.timing_seconds}s`);
            });
            
            if (timingData.data.length > 5) {
                console.log(`   ... و ${timingData.data.length - 5} آية أخرى`);
            }
        } else {
            console.log('❌ فشل في جلب التوقيت');
            console.log('الخطأ:', timingData.message);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // 3. اختبار جلب آية واحدة
        console.log('3️⃣ اختبار جلب توقيت آية واحدة (الفاتحة آية 1):');
        console.log(`GET ${baseUrl}/timing/sudais/1/1`);
        
        const singleVerseResponse = await fetch(`${baseUrl}/timing/sudais/1/1`);
        const singleVerseData = await singleVerseResponse.json();
        
        if (singleVerseData.success) {
            console.log('✅ نجح جلب توقيت الآية');
            console.log(`📖 الآية ${singleVerseData.data.verse_number} من سورة الفاتحة`);
            console.log(`⏱️ التوقيت: ${singleVerseData.data.timing_seconds} ثانية`);
        } else {
            console.log('❌ فشل في جلب توقيت الآية');
            console.log('الخطأ:', singleVerseData.message);
        }

    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error.message);
        console.log('\n💡 تأكد من أن السيرفر يعمل على http://localhost:5000');
    }
}

// تشغيل الاختبار
testAPI();
