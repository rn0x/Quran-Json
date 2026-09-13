import { isMainModule } from './runtime.mjs';
import { run as buildData } from './buildData.mjs';
export async function run() { return buildData({ formats: { json: false, csv: false, sqlite: true }, clean: true }); }
if (isMainModule(import.meta.url)) run().catch((e) => { console.error('❌ jsonToSqlite failed:', e); process.exit(1); });
