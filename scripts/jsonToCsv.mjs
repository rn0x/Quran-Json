import { isMainModule } from './runtime.mjs';
import { run as buildData } from './buildData.mjs';
export async function run() { return buildData({ formats: { json: false, csv: true, sqlite: false }, clean: true }); }
if (isMainModule(import.meta.url)) run().catch((e) => { console.error('❌ jsonToCsv failed:', e); process.exit(1); });
