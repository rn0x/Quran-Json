// config.mjs
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, '../data/sqlite/database.sqlite');

const port = Number(process.env.PORT || 5000);
const productionOrigin = 'https://msr-quran-data.vercel.app';
const localOrigin = `http://localhost:${port}`;

const config = {
    port,
    databaseUrl: process.env.DATABASE_URL || 'sqlite://path_to_your_db',
    secretKey: process.env.SECRET_KEY || 'your_secret_key',
    apiRateLimit: Number(process.env.API_RATE_LIMIT || 200),

    // Public URLs used by API metadata/reference responses.
    // Official public production domain.
    productionOrigin,
    productionApiBaseUrl: `${productionOrigin}/api`,

    // Local development URL only.
    localOrigin,
    localApiBaseUrl: `${localOrigin}/api`
};

// Open the project SQLite database.
export const getDatabase = async () => {
    return await open({
        filename: dbFilePath,
        driver: sqlite3.Database
    });
};

export default config;
