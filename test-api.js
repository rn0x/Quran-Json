// اختبار سريع للـ API
const app = require('./api/index.js');

console.log('✅ تم تحميل الـ API بنجاح!');
console.log('📁 نوع التطبيق:', typeof app);
console.log('🚀 جاهز للنشر على Vercel');

// اختبار أن Express متاح
if (app && typeof app.listen === 'function') {
    console.log('✅ Express app صحيح ومتاح');
} else {
    console.log('❌ مشكلة في Express app');
}
