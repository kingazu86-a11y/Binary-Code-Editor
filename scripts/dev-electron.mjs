import * as esbuild from 'esbuild';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import http from 'http';
import electron from 'electron';
import { patchNodePty } from './patch-node-pty.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// Ensure node-pty native list agent is patched against AttachConsole crash
patchNodePty();

let electronProcess = null;

function waitForVite(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 304) {
          resolve();
        } else {
          setTimeout(check, 300);
        }
      });
      req.on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Timeout waiting for Vite at ${url}`));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

async function compileElectron() {
  console.log('[Dev] Compiling Main process...');
  await esbuild.build({
    entryPoints: [path.join(root, 'electron/main/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(root, 'dist-electron/main/main.js'),
    external: ['electron', 'node-pty', 'chokidar', 'extract-zip', 'adm-zip'],
    format: 'cjs',
    sourcemap: 'inline',
  });

  console.log('[Dev] Compiling Preload script...');
  await esbuild.build({
    entryPoints: [path.join(root, 'electron/preload/preload.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(root, 'dist-electron/preload/preload.js'),
    external: ['electron'],
    format: 'cjs',
    sourcemap: 'inline',
  });

  console.log('[Dev] Compiling Extension Host Worker...');
  await esbuild.build({
    entryPoints: [path.join(root, 'electron/main/services/host/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(root, 'dist-electron/main/extensionHostWorker.js'),
    external: ['electron', 'node-pty', 'chokidar', 'extract-zip', 'adm-zip'],
    format: 'cjs',
    sourcemap: 'inline',
  });
}

async function start() {
  console.log('[Dev] Waiting for Vite dev server...');
  await waitForVite('http://localhost:5173');
  console.log('[Dev] Vite is live! Compiling Electron...');
  await compileElectron();

  console.log('[Dev] Launching Electron from:', electron);

  electronProcess = spawn(electron, ['.'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: 'http://localhost:5173',
    },
  });

  electronProcess.on('close', (code) => {
    console.log(`[Dev] Electron exited with code ${code}`);
    process.exit(code || 0);
  });

  electronProcess.on('error', (err) => {
    console.error('[Dev Error] Failed to launch Electron:', err);
    process.exit(1);
  });
}

start().catch((err) => {
  console.error('[Dev Error]', err);
  process.exit(1);
});
