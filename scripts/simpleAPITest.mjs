import fetch from 'node-fetch';

async function testAPI() {
    try {
        console.log('🧪 اختبار مبسط للـ API...\n');
        
        // اختبار جلب توقيت الفاتحة للسديس
        console.log('📡 طلب: GET http://localhost:5000/api/timing/sudais/1');
        const response = await fetch('http://localhost:5000/api/timing/sudais/1');
        
        console.log(`📊 حالة الاستجابة: ${response.status}`);
        console.log(`📋 نوع المحتوى: ${response.headers.get('content-type')}`);
        
        const text = await response.text();
        console.log('\n📄 محتوى الاستجابة الخام:');
        console.log(text);
        
        // محاولة تحويل إلى JSON
        try {
            const data = JSON.parse(text);
            console.log('\n✅ تم تحويل الاستجابة إلى JSON بنجاح:');
            console.log(JSON.stringify(data, null, 2));
        } catch (jsonError) {
            console.log('\n❌ فشل في تحويل الاستجابة إلى JSON:', jsonError.message);
        }
        
    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 تأكد من أن السيرفر يعمل: yarn dev');
        }
    }
}

testAPI();
