// Import dependencies
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import cors from 'cors';
import rateLimiter from '../server/middleware/rateLimiter.mjs';
import apiRoutes from '../server/routes/apiRoutes.mjs';
import notFoundHandler from '../server/utils/notFoundHandler.mjs';
import errorHandler from '../server/utils/errorHandler.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFolderPath = path.join(__dirname, '..', 'data');
const apiDefinitionPath = path.join(__dirname, '..', 'docs', 'api-definition.yaml');
const publicFolderPath = path.join(__dirname, '..', 'server', 'public');
const publicHtmlFilePath = path.join(__dirname, '..', 'server', 'public', 'docs.html');
const readerHtmlFilePath = path.join(__dirname, '..', 'server', 'public', 'index.html');

// Create Express app
const app = express();

// Disable the X-Powered-By header
app.disable('x-powered-by');

// Enable CORS
app.use(cors());

// Serve documentation files
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

// Static assets are served without automatic index.html resolution.
app.use('/', express.static(publicFolderPath, { index: false }));

// Setup other routes
app.use(rateLimiter);
app.use('/data', express.static(dataFolderPath));
app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

// Export the app for Vercel
export default app;
