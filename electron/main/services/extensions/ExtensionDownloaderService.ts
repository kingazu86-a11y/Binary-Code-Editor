import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';
import zlib from 'zlib';
import { app } from 'electron';

export interface DownloadProgress {
  extensionId: string;
  stage: 'downloading' | 'validating' | 'extracting' | 'completed' | 'error';
  progress: number; // 0 to 100
  bytesReceived?: number;
  totalBytes?: number;
  speed?: string;
  message?: string;
  error?: string;
}

export interface ValidatedPackage {
  filePath: string;
  id: string;
  publisher: string;
  name: string;
  version: string;
  manifest: any;
}

export class ExtensionDownloaderService {
  private cacheDir: string;

  constructor() {
    const basePath = path.join(os.homedir(), '.binary');
    this.cacheDir = path.join(basePath, 'cache', 'extension-downloads');
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[ExtensionDownloader] Failed to create dedicated cache dir, using tmpdir:', err);
      this.cacheDir = path.join(os.tmpdir(), 'binary-ext-cache');
      try {
        if (!fs.existsSync(this.cacheDir)) {
          fs.mkdirSync(this.cacheDir, { recursive: true });
        }
      } catch {}
    }
  }

  /**
   * Downloads an extension package (.vsix or .zip) from a URL into the cache directory.
   * Reports real-time throttled progress events.
   */
  async downloadPackage(
    extensionId: string,
    url: string,
    onProgress?: (progress: DownloadProgress) => void,
    maxRedirects = 8,
    idleTimeoutMs = 45000
  ): Promise<string> {
    this.ensureCacheDir();
    const safeId = extensionId.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempFileName = `${safeId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.vsix.tmp`;
    const destPath = path.join(this.cacheDir, tempFileName);

    let lastProgressTime = 0;
    let bytesReceived = 0;
    let totalBytes = 0;
    let startTime = Date.now();

    onProgress?.({
      extensionId,
      stage: 'downloading',
      progress: 0,
      bytesReceived: 0,
      totalBytes: 0,
      message: 'Connecting to download server...',
    });

    const onChunk = (received: number, total: number) => {
      bytesReceived = received;
      totalBytes = total;
      const now = Date.now();

      // Throttle progress emissions to at most every 80ms or when 100% complete
      if (now - lastProgressTime >= 80 || (total > 0 && received >= total)) {
        lastProgressTime = now;
        const percent = total > 0 ? Math.min(99, Math.round((received / total) * 100)) : 0;
        const elapsedSec = (now - startTime) / 1000;
        const bytesPerSec = elapsedSec > 0 ? received / elapsedSec : 0;
        const speed = bytesPerSec > 1024 * 1024
          ? `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
          : `${(bytesPerSec / 1024).toFixed(0)} KB/s`;

        onProgress?.({
          extensionId,
          stage: 'downloading',
          progress: percent,
          bytesReceived: received,
          totalBytes: total,
          speed,
          message: total > 0
            ? `Downloading... ${percent}% (${this.formatBytes(received)} / ${this.formatBytes(total)})`
            : `Downloading... ${this.formatBytes(received)}`,
        });
      }
    };

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        await this.cleanFile(destPath);
        await this.executeDownload(url, destPath, onChunk, maxRedirects, idleTimeoutMs);

        // Download phase complete
        onProgress?.({
          extensionId,
          stage: 'downloading',
          progress: 100,
          bytesReceived,
          totalBytes: totalBytes || bytesReceived,
          message: 'Download complete. Verifying package integrity...',
        });

        return destPath;
      } catch (err: any) {
        await this.cleanFile(destPath);
        if (attempts < maxAttempts) {
          console.warn(`[ExtensionDownloader] Attempt ${attempts} failed (${err.message}). Retrying in 1.5s...`);
          onProgress?.({
            extensionId,
            stage: 'downloading',
            progress: 0,
            message: `Connection interrupted. Retrying download (attempt ${attempts + 1}/${maxAttempts})...`,
          });
          await new Promise((r) => setTimeout(r, 1500));
          startTime = Date.now();
          bytesReceived = 0;
          totalBytes = 0;
        } else {
          throw err;
        }
      }
    }

    return destPath;
  }

  private executeDownload(
    url: string,
    destPath: string,
    onChunk: (received: number, total: number) => void,
    maxRedirects: number,
    idleTimeoutMs: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
        return reject(new Error('Exceeded maximum redirect limit'));
      }

      let req: http.ClientRequest | null = null;
      let connectTimer: NodeJS.Timeout | null = null;
      let idleTimer: NodeJS.Timeout | null = null;
      let maxTimer: NodeJS.Timeout | null = null;
      let fileStream: fs.WriteStream | null = null;
      let decompressor: zlib.Gunzip | zlib.Inflate | null = null;
      let resolved = false;

      const cleanup = () => {
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
        if (maxTimer) {
          clearTimeout(maxTimer);
          maxTimer = null;
        }
      };

      const fail = (err: Error) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        if (decompressor) {
          decompressor.destroy();
        }
        if (fileStream) {
          fileStream.destroy();
        }
        if (req) {
          req.destroy();
        }
        reject(err);
      };

      // 1. Connection timeout: 35s to establish connection and get response headers
      connectTimer = setTimeout(() => {
        fail(new Error('Connection timed out while contacting extension repository (35s)'));
      }, 35000);

      // 2. Absolute upper limit: 15 minutes for very large extensions
      maxTimer = setTimeout(() => {
        fail(new Error('Maximum download time exceeded (15 minutes)'));
      }, 900000);

      const resetIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          fail(new Error(`Download stalled: No data received for ${Math.round(idleTimeoutMs / 1000)} seconds`));
        }, idleTimeoutMs);
      };

      const client = url.startsWith('https') ? https : http;
      req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'Binary-IDE/1.0 (+https://github.com/binary-ide)',
            Accept: '*/*',
          },
        },
        (res) => {
          // Connected! Clear connection timer
          if (connectTimer) {
            clearTimeout(connectTimer);
            connectTimer = null;
          }

          // Handle HTTP redirects (301, 302, 303, 307, 308)
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            cleanup();
            res.resume(); // Ensure incoming data is drained to free socket
            const nextUrl = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, url).toString();

            this.executeDownload(nextUrl, destPath, onChunk, maxRedirects - 1, idleTimeoutMs)
              .then(resolve)
              .catch(reject);
            return;
          }

          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            cleanup();
            res.resume();
            fail(new Error(`Download failed: HTTP ${res.statusCode} ${res.statusMessage || ''}`));
            return;
          }

          const contentLengthStr = res.headers['content-length'];
          const totalBytes = contentLengthStr ? parseInt(contentLengthStr, 10) : 0;
          let bytesReceived = 0;

          const contentEncoding = (res.headers['content-encoding'] || '').toLowerCase();
          const isGzipEncoding = contentEncoding === 'gzip' || contentEncoding === 'deflate';

          fileStream = fs.createWriteStream(destPath);
          resetIdleTimer();

          res.on('data', (chunk: Buffer) => {
            resetIdleTimer(); // Reset inactivity timer on incoming chunk
            bytesReceived += chunk.length;
            onChunk(bytesReceived, totalBytes);
          });

          if (isGzipEncoding) {
            decompressor = contentEncoding === 'gzip' ? zlib.createGunzip() : zlib.createInflate();
            decompressor.on('error', (decErr) => fail(decErr));
            res.pipe(decompressor).pipe(fileStream);
          } else {
            res.pipe(fileStream);
          }

          fileStream.on('close', () => {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve();
          });

          fileStream.on('error', (streamErr) => {
            fail(streamErr);
          });

          res.on('error', (resErr) => {
            fail(resErr);
          });
        }
      );

      req.on('error', (reqErr) => {
        fail(reqErr);
      });
    });
  }

  /**
   * Performs deep pre-installation validation on the downloaded package:
   * - Checks file size and existence.
   * - Handles gzip wrapper if sent without encoding headers.
   * - Validates ZIP header magic bytes (rejects HTML/error responses).
   * - Guards against Zip-Slip path traversal attacks.
   * - Validates manifest presence (`extension/package.json`, `package.json`, or subfolder) and parses it.
   */
  async validatePackage(filePath: string, expectedId?: string): Promise<ValidatedPackage> {
    // 1. File existence & size
    if (!fs.existsSync(filePath)) {
      throw new Error(`Package file not found: ${filePath}`);
    }

    const stat = await fsPromises.stat(filePath);
    if (stat.size < 64) {
      throw new Error(`Invalid package: File is empty or corrupt (${stat.size} bytes)`);
    }

    // 2. Validate Magic Bytes:
    // Standard ZIP: 0x50 0x4B 0x03 0x04 ("PK\x03\x04")
    // GZIP: 0x1F 0x8B ("\x1f\x8b")
    const fd = await fsPromises.open(filePath, 'r');
    const headerBuffer = Buffer.alloc(4);
    await fd.read(headerBuffer, 0, 4, 0);
    await fd.close();

    let isZip = headerBuffer[0] === 0x50 && headerBuffer[1] === 0x4b &&
      (headerBuffer[2] === 0x03 || headerBuffer[2] === 0x05 || headerBuffer[2] === 0x07);

    const isGzip = headerBuffer[0] === 0x1f && headerBuffer[1] === 0x8b;

    if (isGzip) {
      // Decompress raw gzipped package (e.g. from VS Code Marketplace without content-encoding header)
      const decompressedPath = `${filePath}.decompressed.tmp`;
      try {
        await new Promise<void>((res, rej) => {
          const readStream = fs.createReadStream(filePath);
          const gunzip = zlib.createGunzip();
          const writeStream = fs.createWriteStream(decompressedPath);

          gunzip.on('error', rej);
          writeStream.on('error', rej);
          writeStream.on('close', res);

          readStream.pipe(gunzip).pipe(writeStream);
        });

        await fsPromises.copyFile(decompressedPath, filePath);
        await fsPromises.rm(decompressedPath, { force: true });
        isZip = true;
      } catch (decompErr: any) {
        await this.cleanFile(decompressedPath);
        throw new Error(`Failed to decompress gzipped package: ${decompErr.message}`);
      }
    }

    if (!isZip) {
      // Check if it's an HTML error page or JSON error returned by server
      let snippet = '';
      try {
        const textBuf = Buffer.alloc(200);
        const fdt = await fsPromises.open(filePath, 'r');
        await fdt.read(textBuf, 0, 200, 0);
        await fdt.close();
        snippet = textBuf.toString('utf-8').trim();
      } catch {}

      if (snippet.includes('<html') || snippet.includes('<!DOCTYPE') || snippet.includes('<head')) {
        throw new Error('Downloaded file is an HTML error page from the server, not a valid VSIX package.');
      }
      if (snippet.startsWith('{') && snippet.includes('error')) {
        throw new Error(`Server returned error payload: ${snippet.slice(0, 120)}`);
      }

      throw new Error('Corrupt or unrecognized package format (invalid archive magic header)');
    }

    // 3. Open archive using AdmZip & inspect entries safely
    let AdmZip: any;
    try {
      AdmZip = require('adm-zip');
    } catch {
      throw new Error('adm-zip module is not available in runtime');
    }

    let zip: any;
    try {
      zip = new AdmZip(filePath);
    } catch (zipErr: any) {
      throw new Error(`Corrupted archive structure: ${zipErr.message || 'Cannot parse ZIP structure'}`);
    }

    const entries: any[] = zip.getEntries();
    if (!entries || entries.length === 0) {
      throw new Error('Corrupted package: Archive contains no entries');
    }

    // 4. Zip-Slip Security Check (prevent path traversal attacks)
    for (const entry of entries) {
      const rawName = entry.entryName.replace(/\\/g, '/');
      const normalized = path.posix.normalize(rawName.replace(/^\/+/, ''));
      if (
        normalized.startsWith('..') ||
        path.posix.isAbsolute(normalized) ||
        /^[a-zA-Z]:/.test(rawName)
      ) {
        throw new Error(`Security Exception: Unsafe file path detected in package (${entry.entryName})`);
      }
    }

    // 5. Manifest presence and schema validation
    // Look for package.json in extension/, root, or immediate subfolder
    const manifestEntry =
      entries.find((e) => {
        const cleanName = e.entryName.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
        return cleanName === 'extension/package.json';
      }) ||
      entries.find((e) => {
        const cleanName = e.entryName.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
        return cleanName === 'package.json';
      }) ||
      entries.find((e) => {
        const cleanName = e.entryName.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
        return cleanName.endsWith('/package.json') && !cleanName.includes('node_modules');
      });

    if (!manifestEntry) {
      throw new Error('Invalid VSIX: package.json manifest is missing in the package archive');
    }

    let manifest: any;
    try {
      const rawText = manifestEntry.getData().toString('utf-8');
      manifest = JSON.parse(rawText);
    } catch (parseErr: any) {
      throw new Error(`Invalid manifest in package: Failed to parse package.json (${parseErr.message})`);
    }

    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Corrupted package: package.json manifest is not a valid JSON object');
    }

    const name = manifest.name;
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid manifest: package.json is missing required "name" field');
    }

    const publisher = manifest.publisher || (expectedId ? expectedId.split('.')[0] : 'community');
    const version = manifest.version || '1.0.0';
    const computedId = `${publisher}.${name}`.toLowerCase();

    if (expectedId && expectedId.toLowerCase() !== computedId && !expectedId.toLowerCase().includes(name.toLowerCase())) {
      console.warn(`[ExtensionDownloader] Warning: expected ID ${expectedId} does not match package manifest ID ${computedId}`);
    }

    return {
      filePath,
      id: `${publisher}.${name}`,
      publisher,
      name,
      version,
      manifest,
    };
  }

  async cleanFile(filePath?: string): Promise<void> {
    if (!filePath) return;
    try {
      if (fs.existsSync(filePath)) {
        await fsPromises.rm(filePath, { force: true });
      }
    } catch (err) {
      console.warn(`[ExtensionDownloader] Failed to remove temp file ${filePath}:`, err);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

export const extensionDownloaderService = new ExtensionDownloaderService();
