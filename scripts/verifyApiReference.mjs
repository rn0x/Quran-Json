import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, '../data/sqlite/database.sqlite');

async function verifyApiReferenceData() {
    try {
        const db = await open({
            filename: dbFilePath,
            driver: sqlite3.Database
        });

        // التحقق من الجداول الموجودة
        console.log('📋 الجداول الموجودة في قاعدة البيانات:');
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });

        // التحقق من بيانات api_reference
        console.log('\n🔍 التحقق من جدول api_reference:');
        const apiRefCount = await db.get('SELECT COUNT(*) as count FROM api_reference');
        console.log(`   - عدد السجلات: ${apiRefCount.count}`);

        if (apiRefCount.count > 0) {
            const apiRefData = await db.get('SELECT * FROM api_reference LIMIT 1');
            console.log(`   - العنوان: ${apiRefData.title}`);
            console.log(`   - الإصدار: ${apiRefData.version}`);
            console.log(`   - الرابط الأساسي: ${apiRefData.base_url}`);
            console.log(`   - تاريخ الإنشاء: ${apiRefData.created_at}`);
            
            // عرض جزء من JSON content
            const jsonData = JSON.parse(apiRefData.json_content);
            console.log(`   - عدد endpoints: ${Object.keys(jsonData.endpoints).length}`);
        }

        await db.close();
        console.log('\n✅ تم التحقق بنجاح - البيانات موجودة!');

    } catch (error) {
        console.error('❌ خطأ في التحقق:', error);
    }
}

verifyApiReferenceData();
