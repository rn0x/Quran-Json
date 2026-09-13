import express from 'express';
import config from './config.mjs';
import cors from 'cors';
import rateLimiter from './middleware/rateLimiter.mjs';
import apiRoutes from './routes/apiRoutes.mjs';
import notFoundHandler from './utils/notFoundHandler.mjs';
import errorHandler from './utils/errorHandler.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFolderPath = path.join(__dirname, '..', 'data');
const apiDefinitionPath = path.join(__dirname,'..', 'docs','api-definition.yaml');
const publicFolderPath = path.join(__dirname, 'public');
const publicHtmlFilePath = path.join(__dirname, 'public', 'docs.html');
const readerHtmlFilePath = path.join(__dirname, 'public', 'index.html');

const app = express();

// Disable the X-Powered-By header
app.disable('x-powered-by');

// تفعيل CORS
app.use(cors());

// تقديم ملفات الوثائق من مجلد public
app.get('/docs/api-definition.yaml', (req, res) => {
    res.set('Cache-Control', 'no-store, max-age=0');
    res.type('yaml');
    res.sendFile(apiDefinitionPath);
});

// استخدم تحويلًا دائمًا كي تكون /docs هي النسخة الأساسية المفهرسة.
app.get('/', (req, res) => {
    res.redirect(308, '/docs');
});
app.get('/docs', (req, res) => {
    res.sendFile(publicHtmlFilePath);
});
app.get('/reader', (req, res) => {
    res.sendFile(readerHtmlFilePath);
});

// تقديم الأصول الثابتة بدون جعل index.html الصفحة الافتراضية للمجلد.
app.use('/', express.static(publicFolderPath, { index: false }));
// إعداد باقي المسارات
app.use(rateLimiter);
app.use('/data', express.static(dataFolderPath));
app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

// تصدير التطبيق للاستخدام مع Vercel
export default app;

// تشغيل الخادم محلياً فقط
if (process.env.NODE_ENV !== 'production') {
    app.listen(config.port, () => {
        console.log(`[QURAN-DATA]-[${new Date().toISOString()}] 🚀 Server: ${config.localOrigin}`);
        console.log(`[QURAN-DATA] API:  ${config.localApiBaseUrl}`);
        console.log(`[QURAN-DATA] Docs: ${config.localOrigin}/docs`);
    });
}
