import fetch from 'node-fetch';

const BASE_URL = 'https://msr-quran-data.vercel.app/api';
const DOCUMENTATION_URL = 'https://msr-quran-data.vercel.app';

async function testRenderAPI() {
    console.log('🧪 اختبار API المنشور على Vercel...\n');

    const tests = [
        {
            name: 'جلب جميع القراء',
            url: `${BASE_URL}/timing/reciters`,
            method: 'GET'
        },
        {
            name: 'جلب توقيت الفاتحة للسديس',
            url: `${BASE_URL}/timing/sudais/1`,
            method: 'GET'
        },
        {
            name: 'جلب توقيت آية واحدة',
            url: `${BASE_URL}/timing/sudais/1/1`,
            method: 'GET'
        },
        {
            name: 'جلب السور المتاحة للسديس',
            url: `${BASE_URL}/timing/sudais/surahs`,
            method: 'GET'
        },
        {
            name: 'جلب جميع السور',
            url: `${BASE_URL}/surahs`,
            method: 'GET'
        }
    ];

    for (const test of tests) {
        try {
            console.log(`🔍 ${test.name}`);
            console.log(`📡 ${test.method} ${test.url}`);

            const startTime = Date.now();
            const response = await fetch(test.url);
            const endTime = Date.now();

            console.log(`⏱️  الوقت: ${endTime - startTime}ms`);
            console.log(`📊 الحالة: ${response.status}`);

            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    console.log('✅ نجح');

                    // عرض معلومات إضافية حسب نوع الاختبار
                    if (test.url.includes('/timing/reciters')) {
                        console.log(`📋 عدد القراء: ${data.data.length}`);
                    } else if (test.url.includes('/timing/') && test.url.endsWith('/1')) {
                        console.log(`📖 عدد الآيات: ${data.data.verses_count}`);
                        console.log(`⏰ المدة الإجمالية: ${data.data.total_duration_seconds}s`);
                    } else if (test.url.includes('/surahs')) {
                        console.log(`📚 عدد السور: ${data.result.length}`);
                    }
                } else {
                    console.log('❌ فشل: البيانات غير صحيحة');
                }
            } else {
                console.log(`❌ فشل: HTTP ${response.status}`);
            }

        } catch (error) {
            console.log(`❌ خطأ: ${error.message}`);
        }

        console.log('-'.repeat(50));
    }

    console.log('\n🎉 انتهى اختبار API على Vercel!');
    console.log(`🌐 رابط الوثائق: ${DOCUMENTATION_URL}`);
}

testRenderAPI();
