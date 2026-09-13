import { cleanGenerated } from './dataPipelineLib.mjs';

await cleanGenerated({ json: true, csv: true, sqlite: true });
console.log('✅ Generated JSON/CSV/SQLite database outputs removed. Source data was not touched.');
