# دليل النشر على Vercel 

## الملفات المطلوبة
تم إنشاء الملفات التالية للتوافق مع Vercel:

- ✅ `vercel.json` - إعدادات Vercel
- ✅ `api/index.js` - نقطة دخول API  
- ✅ `.vercelignore` - ملفات يتم تجاهلها عند النشر
- ✅ `package.json` - تم إضافة script `build`

## خطوات النشر على Vercel

### 1. تسجيل الدخول إلى Vercel CLI
```bash
npx vercel login
```

### 2. النشر
```bash
npx vercel --prod
```

### أو باستخدام لوحة تحكم Vercel:
1. اذهب إلى [vercel.com](https://vercel.com)
2. اربط حساب GitHub الخاص بك
3. استورد المشروع من GitHub
4. ضع الإعدادات التالية:
   - **Build Command**: `pnpm build`
   - **Output Directory**: اتركها فارغة
   - **Install Command**: `pnpm install`

## Environment Variables
إذا كان لديك متغيرات بيئة، أضفها في لوحة تحكم Vercel:
- `PORT` (سيتم تجاهلها، Vercel يضبطها تلقائياً)
- أي متغيرات أخرى من `.env`

## الاختبار
بعد النشر، سيكون API متاحاً على:
- `https://your-app-name.vercel.app/api/surahs`
- `https://your-app-name.vercel.app/api/verse/1/1` 
- `https://your-app-name.vercel.app/docs`

## ملاحظات مهمة
1. قاعدة البيانات SQLite ستعمل في وضع القراءة فقط
2. أقصى مدة تنفيذ 30 ثانية للطلب الواحد
3. جميع الطلبات ستمر عبر `api/index.js`
