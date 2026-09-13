import { isMainModule } from './runtime.mjs';
import { run as buildData } from './buildData.mjs';
export async function run() {
  console.warn('ℹ️ addTimingToSqlite now rebuilds the complete SQLite schema so timing, visual assets and ayah-by-ayah data stay consistent.');
  return buildData({ formats: { json: false, csv: false, sqlite: true }, clean: true });
}
if (isMainModule(import.meta.url)) run().catch((e) => { console.error('❌ addTimingToSqlite failed:', e); process.exit(1); });
