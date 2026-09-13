import { isMainModule } from './runtime.mjs';
import { run as splitData } from './splitData.mjs';
import { run as buildData } from './buildData.mjs';
import { run as verifyData } from './verifyDataPipeline.mjs';

export async function run() {
  console.log('1/3 🧩 Rebuilding split JSON files from mainDataQuran.json...');
  await splitData();
  console.log('2/3 🏗️ Building complete normalized JSON + CSV + SQLite databases...');
  await buildData({ formats: { json: true, csv: true, sqlite: true }, clean: true });
  console.log('3/3 🔎 Verifying all generated formats against source data...');
  return verifyData();
}

if (isMainModule(import.meta.url)) {
  run().catch((error) => {
    console.error('❌ data:rebuild failed:', error);
    process.exit(1);
  });
}
