import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extensionRegistry, ExtensionRegistry } from './ExtensionRegistry';
import { VSCodeExtensionManifestParser } from './VSCodeExtensionManifestParser';
import type { RegistryExtensionEntry } from '../../../../src/types/extensionRegistry';

export interface IExtractedExtension {
  id: string;
  name: string;
  publisher: string;
  version: string;
  folderPath: string;
  manifest: any;
  registryEntry?: RegistryExtensionEntry;
}

export class VsixInstallerService {
  private registry: ExtensionRegistry;

  constructor(private readonly extensionsDirectory: string) {
    this.registry = ExtensionRegistry.getInstance(extensionsDirectory);
  }

  /**
   * Installs an extension from a validated .vsix archive following the production-ready flow:
   * 1. Extract into staging/
   * 2. Locate package.json
   * 3. Parse manifest with VSCodeExtensionManifestParser (metadata-only, strict)
   * 4. Validate manifest & verify relative paths (prevent EXTENSION_PATH_TRAVERSAL)
   * 5. Atomically promote into installed/ directory
   * 6. Finalize registry entry in ExtensionRegistry
   */
  async installFromVsix(
    vsixFilePath: string,
    onProgress?: (stage: 'extracting', progress: number, message?: string) => void
  ): Promise<IExtractedExtension> {
    if (!fsSync.existsSync(vsixFilePath)) {
      throw new Error(`VSIX package not found: ${vsixFilePath}`);
    }

    onProgress?.('extracting', 55, 'Opening package archive...');

    let AdmZip: any;
    try {
      AdmZip = require('adm-zip');
    } catch {
      throw new Error('Archive decompression module (adm-zip) is unavailable in runtime');
    }

    let zip: any;
    try {
      zip = new AdmZip(vsixFilePath);
    } catch (zipErr: any) {
      throw new Error(`Cannot parse archive file: ${zipErr.message || 'Corrupted archive'}`);
    }

    const entries: any[] = zip.getEntries();
    if (!entries || entries.length === 0) {
      throw new Error('Package contains no files or is corrupted');
    }

    // Identify package.json manifest in archive to establish prefix
    let manifestEntry = entries.find((e) => {
      const clean = e.entryName.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
      return clean === 'extension/package.json';
    });
    if (!manifestEntry) {
      manifestEntry = entries.find((e) => {
        const clean = e.entryName.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
        return clean === 'package.json';
      });
    }
    if (!manifestEntry) {
      manifestEntry = entries.find((e) => {
        const clean = e.entryName.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
        return clean.endsWith('/package.json') && !clean.includes('node_modules');
      });
    }

    if (!manifestEntry) {
      throw new Error('Corrupt VSIX: package.json missing in archive contents');
    }

    // Ensure staging directory exists
    const stagingBase = this.registry.stagingDir;
    if (!fsSync.existsSync(stagingBase)) {
      fsSync.mkdirSync(stagingBase, { recursive: true });
    }

    const stagingFolder = path.join(
      stagingBase,
      `staging-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    );

    // Determine root prefix inside the archive (e.g. "extension/" or "")
    let rootPrefix = '';
    const cleanManifestPath = manifestEntry.entryName.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
    if (cleanManifestPath.includes('package.json')) {
      const dir = path.posix.dirname(cleanManifestPath);
      if (dir && dir !== '.') {
        rootPrefix = `${dir}/`;
      }
    }

    try {
      if (fsSync.existsSync(stagingFolder)) {
        fsSync.rmSync(stagingFolder, { recursive: true, force: true });
      }
      fsSync.mkdirSync(stagingFolder, { recursive: true });

      onProgress?.('extracting', 60, `Extracting ${entries.length} package files into staging...`);

      let processedCount = 0;
      const totalEntries = entries.length;

      for (let i = 0; i < totalEntries; i++) {
        const entry = entries[i];
        const rawName = entry.entryName.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');

        let targetRelPath = rawName;
        if (rootPrefix && rawName.startsWith(rootPrefix)) {
          targetRelPath = rawName.slice(rootPrefix.length);
        } else if (rawName === 'extension.vsixmanifest') {
          targetRelPath = '.vsixmanifest';
        } else if (rootPrefix && !rawName.startsWith(rootPrefix)) {
          // Skip packaging wrapper files outside extension root
          continue;
        }

        // Prevent Zip-Slip or path traversal during extraction
        if (!targetRelPath || targetRelPath.includes('..') || path.isAbsolute(targetRelPath)) {
          continue;
        }

        const targetAbsPath = path.join(stagingFolder, targetRelPath);

        if (entry.isDirectory) {
          if (!fsSync.existsSync(targetAbsPath)) {
            fsSync.mkdirSync(targetAbsPath, { recursive: true });
          }
        } else {
          const parentDir = path.dirname(targetAbsPath);
          if (!fsSync.existsSync(parentDir)) {
            fsSync.mkdirSync(parentDir, { recursive: true });
          }
          try {
            const fileData = entry.getData();
            if (fileData) {
              fsSync.writeFileSync(targetAbsPath, fileData);
            }
          } catch (entryErr) {
            console.warn(`[VsixInstallerService] Could not extract ${rawName}:`, entryErr);
          }
        }

        processedCount++;

        // Yield to the event loop every 30 files for UI responsiveness
        if (processedCount % 30 === 0 || processedCount === totalEntries) {
          const pct = Math.round(60 + (processedCount / totalEntries) * 25); // 60% to 85%
          onProgress?.('extracting', pct, `Extracting files (${processedCount}/${totalEntries})...`);
          await new Promise((resolve) => setImmediate(resolve));
        }
      }

      onProgress?.('extracting', 88, 'Validating extension manifest and path security...');

      // 3. Locate package.json in staging and parse with VSCodeExtensionManifestParser
      const parseResult = VSCodeExtensionManifestParser.parseAndValidate(stagingFolder);

      if (!parseResult.valid || !parseResult.manifest) {
        const errMsg = parseResult.errors.join('; ');
        const error = new Error(`Manifest validation failed: ${errMsg}`);
        (error as any).code = parseResult.errorCode || 'INVALID_MANIFEST';
        (error as any).errors = parseResult.errors;
        throw error;
      }

      const normalizedManifest = parseResult.manifest;

      onProgress?.('extracting', 94, 'Promoting extension to installed registry...');

      // 4. Atomically promote from staging into installed/ and update registry
      const registryEntry = await this.registry.promoteFromStaging(stagingFolder, normalizedManifest);

      // Clean older version folders of the same extension
      this.cleanupPreviousVersions(registryEntry.publisher, registryEntry.name, registryEntry.version);

      // 5. Apply executable permissions on Unix systems
      await this.ensureExecutionPermissions(registryEntry.installPath);

      onProgress?.('extracting', 99, 'Installation finalized');

      return {
        id: registryEntry.id,
        name: registryEntry.name,
        publisher: registryEntry.publisher,
        version: registryEntry.version,
        folderPath: registryEntry.installPath,
        manifest: normalizedManifest,
        registryEntry,
      };
    } finally {
      // 6. Safely clean staging folder if still existing
      try {
        if (fsSync.existsSync(stagingFolder)) {
          fsSync.rmSync(stagingFolder, { recursive: true, force: true });
        }
      } catch {}
    }
  }

  /**
   * Removes older versions of the given extension to prevent duplicate obsolete directories.
   */
  private cleanupPreviousVersions(publisher: string, name: string, currentVersion: string): void {
    try {
      const targetDirs = [this.registry.installedDir, this.extensionsDirectory];
      for (const targetDir of targetDirs) {
        if (!fsSync.existsSync(targetDir)) continue;
        const prefix = `${publisher.toLowerCase()}.${name.toLowerCase()}-`;
        const currentFolder = `${publisher}.${name}-${currentVersion}`.toLowerCase();
        const entries = fsSync.readdirSync(targetDir, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const entryLower = entry.name.toLowerCase();
          if (entryLower.startsWith(prefix) && entryLower !== currentFolder) {
            const oldPath = path.join(targetDir, entry.name);
            try {
              fsSync.rmSync(oldPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
            } catch (err) {
              console.warn(`[VsixInstallerService] Could not remove old version folder ${entry.name}:`, err);
            }
          }
        }
      }
    } catch {}
  }

  /**
   * Recursively applies chmod 755 to folders and scripts on Unix systems.
   */
  async ensureExecutionPermissions(targetDir: string): Promise<void> {
    if (os.platform() === 'win32') return;

    try {
      const items = await fs.readdir(targetDir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(targetDir, item.name);
        if (item.isDirectory()) {
          await fs.chmod(fullPath, 0o755);
          await this.ensureExecutionPermissions(fullPath);
        } else {
          const ext = path.extname(item.name).toLowerCase();
          if (['.sh', '.js', '.bin', '.exe', ''].includes(ext)) {
            await fs.chmod(fullPath, 0o755);
          }
        }
      }
    } catch (err) {
      console.warn(`[VsixInstallerService] chmod warning on ${targetDir}:`, err);
    }
  }
}
