import * as esbuild from 'esbuild';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const outFile = path.join(root, 'scripts', 'inspect-manifest.cjs');
const args = process.argv.slice(2);

try {
  esbuild.buildSync({
    entryPoints: [path.join(root, 'scripts', 'inspect-manifest.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: outFile,
    format: 'cjs',
    sourcemap: false,
  });

  const result = spawnSync(process.execPath, [outFile, ...args], {
    stdio: 'inherit',
    cwd: root,
  });

  process.exit(result.status ?? 0);
} finally {
  try {
    if (fs.existsSync(outFile)) {
      fs.unlinkSync(outFile);
    }
  } catch {}
}
