import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const tempExe = path.join(root, 'resources/toolchains/temp/w64devkit.exe');
const targetExtractDir = path.join(root, 'resources/toolchains');
const destDir = path.join(root, 'resources/toolchains/windows-x64');

console.log('[Extract] Starting toolchain extraction from:', tempExe);
if (!fs.existsSync(tempExe)) {
  console.error('[Extract] Source archive not found at:', tempExe);
  process.exit(1);
}

// Remove old windows-x64 and w64devkit folders
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
const w64devkitDir = path.join(targetExtractDir, 'w64devkit');
if (fs.existsSync(w64devkitDir)) {
  fs.rmSync(w64devkitDir, { recursive: true, force: true });
}

// Run self-extracting archive
const res = spawnSync(tempExe, ['-y', `-o${targetExtractDir}`], {
  stdio: 'inherit',
  windowsHide: true,
});

console.log('[Extract] Extraction finished with exit code:', res.status);

// Rename w64devkit -> windows-x64
if (fs.existsSync(w64devkitDir)) {
  fs.renameSync(w64devkitDir, destDir);
  console.log('[Extract] Successfully moved to:', destDir);
} else {
  console.error('[Extract] w64devkit directory not found after extraction.');
}

// Cleanup temp folder
try {
  fs.rmSync(path.join(root, 'resources/toolchains/temp'), { recursive: true, force: true });
} catch (e) {
  console.warn('[Extract] Temp cleanup warning:', e.message);
}
