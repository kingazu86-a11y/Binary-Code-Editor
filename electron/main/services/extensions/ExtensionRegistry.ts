import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  ExtensionState,
  RegistryExtensionEntry,
  RegistrySchema,
  NormalizedManifest,
} from '../../../../src/types/extensionRegistry';
import { VSCodeExtensionManifestParser } from './VSCodeExtensionManifestParser';

export class ExtensionRegistry {
  private static instance: ExtensionRegistry | null = null;

  public readonly rootDir: string;
  public readonly installedDir: string;
  public readonly stagingDir: string;
  public readonly disabledDir: string;
  public readonly quarantineDir: string;
  public readonly registryPath: string;
  public readonly backupPath: string;

  private schemaVersion = 1;
  private entries = new Map<string, RegistryExtensionEntry>();
  private isInitialized = false;

  constructor(customRootDir?: string) {
    this.rootDir = customRootDir || path.join(os.homedir(), '.binary', 'extensions');
    this.installedDir = path.join(this.rootDir, 'installed');
    this.stagingDir = path.join(this.rootDir, 'staging');
    this.disabledDir = path.join(this.rootDir, 'disabled');
    this.quarantineDir = path.join(this.rootDir, 'quarantine');
    this.registryPath = path.join(this.rootDir, 'registry.json');
    this.backupPath = path.join(this.rootDir, 'registry.json.bak');
  }

  public static getInstance(customRootDir?: string): ExtensionRegistry {
    if (!this.instance) {
      this.instance = new ExtensionRegistry(customRootDir);
    }
    return this.instance;
  }

  /**
   * Initializes folder structure, loads existing registry, and reconciles on-disk extensions.
   */
  public async initialize(): Promise<void> {
    this.ensureDirectories();
    this.load();
    await this.reconcile();
    this.isInitialized = true;
  }

  /**
   * Ensures all partition subdirectories exist.
   */
  public ensureDirectories(): void {
    const dirs = [
      this.rootDir,
      this.installedDir,
      this.stagingDir,
      this.disabledDir,
      this.quarantineDir,
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (err: any) {
          console.error(`[ExtensionRegistry] Failed to create directory: ${dir}`, err);
        }
      }
    }
  }

  /**
   * Loads registry.json into memory. Recovers from .bak if corrupted.
   */
  public load(): boolean {
    if (!fs.existsSync(this.registryPath)) {
      // Check if backup exists
      if (fs.existsSync(this.backupPath)) {
        try {
          console.warn('[ExtensionRegistry] registry.json missing; restoring from backup...');
          fs.copyFileSync(this.backupPath, this.registryPath);
        } catch {}
      } else {
        // First run; initialize empty registry file
        this.save();
        return true;
      }
    }

    try {
      const raw = fs.readFileSync(this.registryPath, 'utf8');
      const data: RegistrySchema = JSON.parse(raw);

      if (data && typeof data.extensions === 'object') {
        this.entries.clear();
        for (const [key, entry] of Object.entries(data.extensions)) {
          if (entry && entry.id) {
            this.entries.set(entry.id.toLowerCase(), entry);
          }
        }
        return true;
      }
    } catch (err: any) {
      console.error('[ExtensionRegistry] Corrupted registry.json:', err.message);
      // Attempt recovery from backup
      if (fs.existsSync(this.backupPath)) {
        try {
          console.warn('[ExtensionRegistry] Recovering registry from backup file...');
          const rawBak = fs.readFileSync(this.backupPath, 'utf8');
          const dataBak: RegistrySchema = JSON.parse(rawBak);
          if (dataBak && typeof dataBak.extensions === 'object') {
            this.entries.clear();
            for (const [key, entry] of Object.entries(dataBak.extensions)) {
              if (entry && entry.id) {
                this.entries.set(entry.id.toLowerCase(), entry);
              }
            }
            this.save(); // Re-flush valid state
            return true;
          }
        } catch (bakErr: any) {
          console.error('[ExtensionRegistry] Backup file also corrupted:', bakErr.message);
        }
      }
    }

    return false;
  }

  /**
   * Atomic registry write:
   * 1. Write to registry.json.tmp
   * 2. Validate written JSON integrity & schema
   * 3. Make backup of existing registry.json to registry.json.bak
   * 4. Atomically swap temp file into registry.json
   */
  public save(): boolean {
    this.ensureDirectories();

    const serializable: RegistrySchema = {
      schemaVersion: this.schemaVersion,
      extensions: {},
    };

    for (const [id, entry] of this.entries.entries()) {
      serializable.extensions[entry.id] = entry;
    }

    const payload = JSON.stringify(serializable, null, 2);
    const tempFile = path.join(
      this.rootDir,
      `.registry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.tmp`
    );

    try {
      // 1. Write temp file
      fs.writeFileSync(tempFile, payload, 'utf8');

      // 2. Validate temp file integrity
      const readBack = fs.readFileSync(tempFile, 'utf8');
      const parsed = JSON.parse(readBack);
      if (!parsed || parsed.schemaVersion !== this.schemaVersion || typeof parsed.extensions !== 'object') {
        throw new Error('Registry self-validation check failed');
      }

      // 3. Backup current registry if it exists
      if (fs.existsSync(this.registryPath)) {
        try {
          fs.copyFileSync(this.registryPath, this.backupPath);
        } catch (bakErr) {
          console.warn('[ExtensionRegistry] Backup creation warning:', bakErr);
        }
      }

      // 4. Atomic rename with Windows fallback
      try {
        fs.renameSync(tempFile, this.registryPath);
      } catch (renameErr) {
        // Fallback for Windows file locks
        fs.copyFileSync(tempFile, this.registryPath);
        try {
          fs.unlinkSync(tempFile);
        } catch {}
      }

      return true;
    } catch (err: any) {
      console.error('[ExtensionRegistry] Failed to save registry atomically:', err);
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch {}
      }
      return false;
    }
  }

  /**
   * Registers or updates an extension entry in the registry.
   */
  public register(entry: RegistryExtensionEntry): void {
    if (!entry.id || !entry.id.includes('.')) {
      throw new Error(`Invalid extension ID format: "${entry.id}". Expected "publisher.name"`);
    }

    const key = entry.id.toLowerCase();
    const existing = this.entries.get(key);

    const updatedEntry: RegistryExtensionEntry = {
      ...entry,
      installedAt: existing?.installedAt || entry.installedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.entries.set(key, updatedEntry);
    this.save();
  }

  /**
   * Unregisters an extension and optionally removes its installed folder.
   */
  public unregister(id: string, removeFiles = true): boolean {
    const key = id.toLowerCase();
    const entry = this.entries.get(key);
    if (!entry) return false;

    if (removeFiles && entry.installPath && fs.existsSync(entry.installPath)) {
      try {
        fs.rmSync(entry.installPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch (rmErr) {
        console.warn(`[ExtensionRegistry] Could not remove files at ${entry.installPath}:`, rmErr);
      }
    }

    this.entries.delete(key);
    this.save();
    return true;
  }

  public get(id: string): RegistryExtensionEntry | undefined {
    return this.entries.get(id.toLowerCase());
  }

  public has(id: string): boolean {
    return this.entries.has(id.toLowerCase());
  }

  public list(filterState?: ExtensionState): RegistryExtensionEntry[] {
    const list = Array.from(this.entries.values());
    if (filterState) {
      return list.filter((e) => e.state === filterState);
    }
    return list;
  }

  public enable(id: string): boolean {
    const entry = this.get(id);
    if (!entry) return false;

    entry.enabled = true;
    entry.state = 'enabled';
    entry.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  public disable(id: string): boolean {
    const entry = this.get(id);
    if (!entry) return false;

    entry.enabled = false;
    entry.state = 'disabled';
    entry.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  public update(id: string, updates: Partial<RegistryExtensionEntry>): boolean {
    const entry = this.get(id);
    if (!entry) return false;

    Object.assign(entry, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return true;
  }

  /**
   * Validates an on-disk extension and updates its status in the registry.
   */
  public validate(id: string): boolean {
    const entry = this.get(id);
    if (!entry) return false;

    if (!fs.existsSync(entry.installPath)) {
      entry.state = 'corrupted';
      entry.manifestValid = false;
      entry.validationErrors = ['Installation path missing on filesystem'];
      this.save();
      return false;
    }

    const parseResult = VSCodeExtensionManifestParser.parseAndValidate(entry.installPath);
    if (!parseResult.valid || !parseResult.manifest) {
      entry.manifestValid = false;
      entry.state = 'invalid';
      entry.validationErrors = parseResult.errors;
      this.save();
      return false;
    }

    entry.manifestValid = true;
    entry.manifest = parseResult.manifest;
    entry.version = parseResult.manifest.version;
    entry.displayName = parseResult.manifest.displayName;
    entry.description = parseResult.manifest.description;
    entry.extensionType = parseResult.manifest.extensionType;
    if (entry.state === 'invalid' || entry.state === 'corrupted') {
      entry.state = entry.enabled ? 'enabled' : 'disabled';
    }
    this.save();
    return true;
  }

  /**
   * Reconciles on-disk extension folders with registry entries.
   * Handles:
   * 1. Subdirectory `installed/`
   * 2. Legacy pre-installed folders directly under `.binary/extensions/`
   * 3. Broken or missing folder cleanup
   */
  public async reconcile(): Promise<{ added: number; updated: number; removed: number }> {
    let added = 0;
    let updated = 0;
    let removed = 0;

    const scannedFolderPaths: string[] = [];

    // 1. Scan installed/ directory
    if (fs.existsSync(this.installedDir)) {
      try {
        const entries = fs.readdirSync(this.installedDir, { withFileTypes: true });
        for (const ent of entries) {
          if (ent.isDirectory() && !ent.name.startsWith('.')) {
            scannedFolderPaths.push(path.join(this.installedDir, ent.name));
          }
        }
      } catch {}
    }

    // 2. Scan legacy flat directory (.binary/extensions/{folder})
    // Adapt existing installations without breaking them!
    if (fs.existsSync(this.rootDir)) {
      try {
        const entries = fs.readdirSync(this.rootDir, { withFileTypes: true });
        const reservedNames = new Set(['installed', 'staging', 'disabled', 'quarantine']);
        for (const ent of entries) {
          if (ent.isDirectory() && !ent.name.startsWith('.') && !reservedNames.has(ent.name)) {
            scannedFolderPaths.push(path.join(this.rootDir, ent.name));
          }
        }
      } catch {}
    }

    const processedIds = new Set<string>();

    for (const folderPath of scannedFolderPaths) {
      try {
        const parseRes = VSCodeExtensionManifestParser.parseAndValidate(folderPath);
        if (!parseRes.valid || !parseRes.manifest) {
          // If manifest is corrupted or invalid, mark as invalid
          const folderName = path.basename(folderPath);
          const syntheticId = folderName.includes('-')
            ? folderName.slice(0, folderName.lastIndexOf('-'))
            : folderName;
          if (syntheticId.includes('.')) {
            const entry: RegistryExtensionEntry = {
              id: syntheticId,
              publisher: syntheticId.split('.')[0],
              name: syntheticId.split('.').slice(1).join('.'),
              displayName: folderName,
              version: '0.0.0',
              description: 'Invalid or unparseable extension',
              installPath: folderPath,
              enabled: false,
              state: 'invalid',
              installedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              manifestValid: false,
              extensionType: 'unknown',
              validationErrors: parseRes.errors,
            };
            this.entries.set(syntheticId.toLowerCase(), entry);
          }
          continue;
        }

        const m = parseRes.manifest;
        const key = m.id.toLowerCase();
        processedIds.add(key);

        const existing = this.entries.get(key);
        if (!existing) {
          // New discovered extension
          const newEntry: RegistryExtensionEntry = {
            id: m.id,
            publisher: m.publisher,
            name: m.name,
            displayName: m.displayName,
            version: m.version,
            description: m.description,
            installPath: folderPath,
            enabled: true,
            state: 'installed',
            installedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            manifestValid: true,
            extensionType: m.extensionType,
            manifest: m,
            icon: m.icon,
            source: 'binary',
          };
          this.entries.set(key, newEntry);
          added++;
        } else {
          // Update existing with fresh manifest
          existing.manifest = m;
          existing.manifestValid = true;
          existing.installPath = folderPath;
          existing.displayName = m.displayName;
          existing.description = m.description;
          existing.version = m.version;
          existing.extensionType = m.extensionType;
          if (m.icon) existing.icon = m.icon;
          updated++;
        }
      } catch (scanErr) {
        console.warn(`[ExtensionRegistry] Error scanning ${folderPath}:`, scanErr);
      }
    }

    // 3. Mark extensions whose files disappeared as corrupted
    for (const [key, entry] of this.entries.entries()) {
      if (entry.source === 'builtin' || entry.source === 'vscode') continue;
      if (!fs.existsSync(entry.installPath)) {
        entry.state = 'corrupted';
        entry.manifestValid = false;
        entry.validationErrors = ['Files missing on disk'];
        removed++;
      }
    }

    this.save();
    return { added, updated, removed };
  }

  /**
   * Repairs corrupted registry entries.
   */
  public async repair(): Promise<void> {
    await this.reconcile();
  }

  /**
   * SemVer version comparator:
   * Returns:
   *   1 if v1 > v2
   *  -1 if v1 < v2
   *   0 if v1 === v2
   */
  public static compareVersions(v1: string, v2: string): number {
    const clean1 = (v1 || '').split('-')[0].split('+')[0];
    const clean2 = (v2 || '').split('-')[0].split('+')[0];

    const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }

  /**
   * Promotes an extracted extension from staging into installed/ directory atomically,
   * performs duplicate check, and finalizes the registry entry.
   */
  public async promoteFromStaging(
    stagingFolderPath: string,
    manifest: NormalizedManifest
  ): Promise<RegistryExtensionEntry> {
    const destFolderName = `${manifest.publisher}.${manifest.name}-${manifest.version}`;
    const destinationFolder = path.join(this.installedDir, destFolderName);

    // Duplicate check: check if publisher.name already exists in registry
    const key = manifest.id.toLowerCase();
    const existing = this.entries.get(key);

    if (existing) {
      const cmp = ExtensionRegistry.compareVersions(manifest.version, existing.version);
      if (cmp < 0) {
        console.warn(
          `[ExtensionRegistry] Installing older version (${manifest.version}) over existing (${existing.version})`
        );
      }
    }

    // Windows-safe atomic move:
    // Move staging to destination
    if (fs.existsSync(destinationFolder)) {
      const trash = path.join(
        this.rootDir,
        `.trash-${destFolderName}-${Date.now()}`
      );
      try {
        fs.renameSync(destinationFolder, trash);
      } catch {
        fs.rmSync(destinationFolder, { recursive: true, force: true });
      }
      setTimeout(() => {
        try {
          if (fs.existsSync(trash)) fs.rmSync(trash, { recursive: true, force: true });
        } catch {}
      }, 500);
    }

    try {
      fs.renameSync(stagingFolderPath, destinationFolder);
    } catch (renameErr) {
      fs.cpSync(stagingFolderPath, destinationFolder, { recursive: true });
      try {
        fs.rmSync(stagingFolderPath, { recursive: true, force: true });
      } catch {}
    }

    // Update manifest paths to point to final destination
    const finalManifestRes = VSCodeExtensionManifestParser.parseAndValidate(destinationFolder);
    const finalManifest = finalManifestRes.valid && finalManifestRes.manifest ? finalManifestRes.manifest : manifest;

    const entry: RegistryExtensionEntry = {
      id: finalManifest.id,
      publisher: finalManifest.publisher,
      name: finalManifest.name,
      displayName: finalManifest.displayName,
      version: finalManifest.version,
      description: finalManifest.description,
      installPath: destinationFolder,
      enabled: existing ? existing.enabled : true,
      state: 'installed',
      installedAt: existing?.installedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manifestValid: true,
      extensionType: finalManifest.extensionType,
      manifest: finalManifest,
      icon: finalManifest.icon,
      source: 'binary',
    };

    this.register(entry);
    return entry;
  }
}

export const extensionRegistry = ExtensionRegistry.getInstance();
