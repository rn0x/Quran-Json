import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Cross-platform direct-execution check for ESM scripts.
 * Works on Windows and POSIX paths.
 */
export function isMainModule(metaUrl) {
  if (!process.argv[1]) return false;

  const modulePath = path.resolve(fileURLToPath(metaUrl));
  const entryPath = path.resolve(process.argv[1]);

  return process.platform === 'win32'
    ? modulePath.toLowerCase() === entryPath.toLowerCase()
    : modulePath === entryPath;
}
