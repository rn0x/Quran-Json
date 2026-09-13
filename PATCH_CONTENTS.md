# Patch contents

This patch intentionally does **not** include the `data/` directory.

Replace/copy these files into the project root, then run:

```bash
pnpm install
pnpm run data:rebuild
```

Primary new data-pipeline files:

- `scripts/dataPipelineLib.mjs`
- `scripts/buildData.mjs`
- `scripts/rebuildData.mjs`
- `scripts/cleanGeneratedData.mjs`
- `scripts/verifyDataPipeline.mjs`

Compatibility scripts and package commands were also updated.
