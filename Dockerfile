# استخدام صورة Node.js الرسمية كأساس
FROM node:18

# تعيين مجلد العمل
WORKDIR /usr/src/app

# نسخ ملفات package.json و package-lock.json إلى مجلد العمل
COPY package*.json ./

# تثبيت التبعيات
RUN npm install

# نسخ جميع ملفات المشروع إلى مجلد العمل
COPY . .

# فتح المنفذ
EXPOSE 5000

# تشغيل تطبيق الويب
CMD [ "npm", "start" ]
