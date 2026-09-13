import { isMainModule } from './runtime.mjs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const dbPath = path.join(root, 'data', 'sqlite', 'database.sqlite');
const jsonBasePath = path.join(root, 'data', 'json');

function createJsonTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS json_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      file_type TEXT NOT NULL DEFAULT 'json',
      json_content TEXT NOT NULL,
      content_size INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT,
      version TEXT DEFAULT '1.0.0',
      is_active INTEGER DEFAULT 1,
      tags TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_json_files_name ON json_files(file_name);
    CREATE INDEX IF NOT EXISTS idx_json_files_type ON json_files(file_type);
    CREATE INDEX IF NOT EXISTS idx_json_files_created ON json_files(created_at);
  `);
}

function ensureJsonTable(db) {
  const existing = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='json_files'").get();
  if (!existing) {
    createJsonTable(db);
    return;
  }

  const sql = String(existing.sql ?? '').replace(/\s+/g, ' ').toLowerCase();
  const hasPathUnique = /file_path\s+text\s+not\s+null\s+unique/.test(sql);
  if (hasPathUnique) {
    createJsonTable(db);
    return;
  }

  console.log('ℹ️ Migrating json_files key from file_name to file_path...');
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.exec(`
      DROP INDEX IF EXISTS idx_json_files_name;
      DROP INDEX IF EXISTS idx_json_files_type;
      DROP INDEX IF EXISTS idx_json_files_created;
      ALTER TABLE json_files RENAME TO json_files_v30_old;
    `);
    createJsonTable(db);
    db.exec(`
      INSERT OR REPLACE INTO json_files (
        id, file_name, file_path, file_type, json_content, content_size,
        created_at, updated_at, description, version, is_active, tags
      )
      SELECT id, file_name, file_path, file_type, json_content, content_size,
             created_at, updated_at, description, version, is_active, tags
      FROM json_files_v30_old;
      DROP TABLE json_files_v30_old;
    `);
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

function extractMetadata(jsonData, fileName) {
  const description = jsonData?.api_info?.description ?? jsonData?.description ?? jsonData?.metadata?.description ?? '';
  const version = jsonData?.api_info?.version ?? jsonData?.version ?? jsonData?.metadata?.version ?? '1.0.0';
  const tags = [];
  const lower = fileName.toLowerCase();
  for (const tag of ['api', 'reference', 'metadata', 'audio', 'surah', 'verse', 'timing']) {
    if (lower.includes(tag)) tags.push(tag);
  }
  return { description: String(description ?? ''), version: String(version ?? '1.0.0'), tags: tags.join(',') };
}

async function findJsonFiles(dirPath, basePath = '') {
  const results = [];
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.join(basePath, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      results.push(...await findJsonFiles(fullPath, relativePath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      results.push({ fullPath, relativePath, name: entry.name });
    }
  }
  return results;
}

function parseArguments() {
  const options = { specificFile: null, specificFolder: null, includeGenerated: false, showHelp: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--file=')) options.specificFile = arg.slice('--file='.length);
    else if (arg.startsWith('--folder=')) options.specificFolder = arg.slice('--folder='.length);
    else if (arg === '--include-generated') options.includeGenerated = true;
    else if (arg === '--help' || arg === '-h') options.showHelp = true;
  }
  return options;
}

function showHelp() {
  console.log(`Usage:\n  node scripts/addJsonToSqlite.mjs\n  node scripts/addJsonToSqlite.mjs --file=api_reference.json\n  node scripts/addJsonToSqlite.mjs --folder=audio\n  node scripts/addJsonToSqlite.mjs --include-generated\n\nBy default data/json/database is excluded to avoid duplicating the complete normalized export inside SQLite.`);
}

export async function run(options = parseArguments()) {
  if (options.showHelp) {
    showHelp();
    return { processed: 0 };
  }

  let files;
  if (options.specificFile) {
    files = [{
      fullPath: path.join(jsonBasePath, options.specificFile),
      relativePath: `json/${options.specificFile}`.replaceAll('\\', '/'),
      name: path.basename(options.specificFile)
    }];
  } else if (options.specificFolder) {
    files = await findJsonFiles(path.join(jsonBasePath, options.specificFolder), `json/${options.specificFolder}`);
  } else {
    files = await findJsonFiles(jsonBasePath, 'json');
  }

  if (!options.includeGenerated) {
    files = files.filter((file) => !file.relativePath.startsWith('json/database/') && file.relativePath !== 'json/database.json');
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const db = new DatabaseSync(dbPath);
  try {
    ensureJsonTable(db);
    const upsert = db.prepare(`
      INSERT INTO json_files (
        file_name, file_path, file_type, json_content, content_size,
        description, version, tags, updated_at
      ) VALUES (?, ?, 'json', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(file_path) DO UPDATE SET
        file_name=excluded.file_name,
        json_content=excluded.json_content,
        content_size=excluded.content_size,
        description=excluded.description,
        version=excluded.version,
        tags=excluded.tags,
        is_active=1,
        updated_at=CURRENT_TIMESTAMP
    `);

    let successful = 0;
    let totalBytes = 0;
    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      for (const file of files) {
        const content = await readFile(file.fullPath, 'utf8');
        const parsed = JSON.parse(content);
        const info = await stat(file.fullPath);
        const metadata = extractMetadata(parsed, file.name);
        upsert.run(
          file.name,
          file.relativePath,
          content,
          Number(info.size),
          metadata.description,
          metadata.version,
          metadata.tags
        );
        successful += 1;
        totalBytes += Number(info.size);
      }
      db.exec('COMMIT;');
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }

    const stored = Number(db.prepare('SELECT COUNT(*) AS count FROM json_files').get().count);
    console.log(`✅ JSON SQLite import complete: processed=${successful}, stored=${stored}, bytes=${totalBytes}.`);
    return { processed: successful, stored, totalBytes };
  } finally {
    db.close();
  }
}

if (isMainModule(import.meta.url)) {
  run().catch((error) => {
    console.error('❌ addJsonToSqlite failed:', error);
    process.exit(1);
  });
}
