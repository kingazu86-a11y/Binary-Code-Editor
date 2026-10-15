import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

import { patchNodePty } from './patch-node-pty.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// Ensure node-pty native list agent is patched against AttachConsole crash
patchNodePty();

async function buildElectron() {
  console.log('[Build] Compiling Electron Main, Preload & Extension Host...');

  // Main process bundle
  await esbuild.build({
    entryPoints: [path.join(root, 'electron/main/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(root, 'dist-electron/main/main.js'),
    external: ['electron', 'node-pty', 'chokidar', 'extract-zip', 'adm-zip'],
    format: 'cjs',
    sourcemap: true,
  });

  // Preload script bundle
  await esbuild.build({
    entryPoints: [path.join(root, 'electron/preload/preload.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(root, 'dist-electron/preload/preload.js'),
    external: ['electron'],
    format: 'cjs',
    sourcemap: true,
  });

  // Extension Host Worker bundle
  await esbuild.build({
    entryPoints: [path.join(root, 'electron/main/services/host/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(root, 'dist-electron/main/extensionHostWorker.js'),
    external: ['electron', 'node-pty', 'chokidar', 'extract-zip', 'adm-zip'],
    format: 'cjs',
    sourcemap: true,
  });

  console.log('[Build] Electron compilation complete.');
}

buildElectron().catch((err) => {
  console.error('[Build Error]', err);
  process.exit(1);
});
