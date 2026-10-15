import fs from 'fs';
import path from 'path';
import { shell, BrowserWindow } from 'electron';
import chokidar, { FSWatcher } from 'chokidar';

export interface FileItemInfo {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
  children?: FileItemInfo[];
  isLoaded?: boolean;
}

const IGNORED_NAMES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

export const HEAVY_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-electron',
  'build',
  '.next',
  '.nuxt',
  '.output',
  'out',
  'target',
  'vendor',
  '.turbo',
  '.cache',
  '.idea',
  '.vscode',
  '.svelte-kit',
  'coverage',
  '__pycache__',
  '.pytest_cache',
  '.venv',
  'venv',
]);

export class FilesystemService {
  private watcher: FSWatcher | null = null;
  private win: BrowserWindow | null = null;

  setWindow(win: BrowserWindow) {
    this.win = win;
  }

  async readDirectory(dirPath: string, maxDepth: number = 0, currentDepth: number = 0): Promise<FileItemInfo[]> {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const items: FileItemInfo[] = [];

      // Sort directories first, then alphabetical using fast comparison
      const sortedEntries = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      });

      const subDirPromises: Promise<void>[] = [];

      for (const entry of sortedEntries) {
        if (IGNORED_NAMES.has(entry.name)) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const isDir = entry.isDirectory();

        const item: FileItemInfo = {
          id: fullPath,
          name: entry.name,
          path: fullPath,
          isDirectory: isDir,
          extension: isDir ? undefined : path.extname(entry.name).toLowerCase(),
        };

        if (isDir) {
          // Lazy directory expansion: only recurse if currentDepth < maxDepth
          // and skip heavy node_modules/.git directories
          const isHeavyDir = entry.name === 'node_modules' || entry.name === '.git';
          const isInsideHeavyDir = dirPath.includes('node_modules') || dirPath.includes('.git');

          if (currentDepth < maxDepth && !isHeavyDir && !isInsideHeavyDir) {
            const p = this.readDirectory(fullPath, maxDepth, currentDepth + 1).then((children) => {
              item.children = children;
              item.isLoaded = true;
            });
            subDirPromises.push(p);
          } else {
            item.children = [];
            item.isLoaded = false;
          }
        }

        items.push(item);
      }

      if (subDirPromises.length > 0) {
        await Promise.all(subDirPromises);
      }

      return items;
    } catch (err) {
      console.error('Error reading directory:', dirPath, err);
      return [];
    }
  }

  async readFile(filePath: string): Promise<{ content: string; encoding: string }> {
    try {
      if (!filePath) return { content: '', encoding: 'utf-8' };
      const stat = await fs.promises.stat(filePath).catch(() => null);
      if (!stat || stat.isDirectory()) {
        return { content: '', encoding: 'utf-8' };
      }
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return { content, encoding: 'utf-8' };
    } catch (err) {
      console.error(`[Filesystem] Failed to read file ${filePath}:`, err);
      return { content: '', encoding: 'utf-8' };
    }
  }

  async readImage(filePath: string): Promise<{ dataUrl?: string; size?: number; mimeType?: string; error?: string }> {
    try {
      const exists = await fs.promises.access(filePath).then(() => true).catch(() => false);
      if (!exists) {
        return { error: 'File does not exist' };
      }
      const stat = await fs.promises.stat(filePath);
      if (stat.isDirectory()) {
        return { error: 'Path is a directory, not an image file' };
      }

      // Guard: reject files over 50 MB to avoid IPC buffer overflows
      const MAX_BYTES = 50 * 1024 * 1024;
      if (stat.size > MAX_BYTES) {
        return { error: `Image is too large to display (${(stat.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 50 MB.` };
      }

      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const mimeTypes: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        bmp: 'image/bmp',
        ico: 'image/x-icon',
        avif: 'image/avif',
        tiff: 'image/tiff',
        tif: 'image/tiff',
      };
      const mimeType = mimeTypes[ext] || 'image/png';
      const buffer = await fs.promises.readFile(filePath);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      return { dataUrl, size: stat.size, mimeType };
    } catch (err: any) {
      console.error(`[Filesystem] Failed to read image ${filePath}:`, err);
      return { error: err.message || 'Failed to read image file' };
    }
  }

  async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (err) {
      console.error(`[Filesystem] Failed to write file ${filePath}:`, err);
      return false;
    }
  }

  async createFile(filePath: string, initialContent: string = ''): Promise<boolean> {
    try {
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      const exists = await fs.promises.access(filePath).then(() => true).catch(() => false);
      if (!exists) {
        await fs.promises.writeFile(filePath, initialContent, 'utf-8');
        return true;
      }
      return false; // Already exists
    } catch (err) {
      console.error(`[Filesystem] Failed to create file ${filePath}:`, err);
      return false;
    }
  }

  async createFolder(folderPath: string): Promise<boolean> {
    try {
      const exists = await fs.promises.access(folderPath).then(() => true).catch(() => false);
      if (!exists) {
        await fs.promises.mkdir(folderPath, { recursive: true });
        return true;
      }
      return false;
    } catch (err) {
      console.error(`[Filesystem] Failed to create folder ${folderPath}:`, err);
      return false;
    }
  }

  deleteEntry(targetPath: string): boolean {
    try {
      if (!fs.existsSync(targetPath)) return false;
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
      return true;
    } catch (err) {
      console.error(`[Filesystem] Failed to delete entry ${targetPath}:`, err);
      return false;
    }
  }

  async trashEntry(targetPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(targetPath)) return false;
      await shell.trashItem(targetPath);
      return true;
    } catch (err) {
      console.error(`[Filesystem] Failed to trash entry ${targetPath}:`, err);
      return false;
    }
  }

  async renameEntry(oldPath: string, newPath: string): Promise<boolean> {
    try {
      // Guard: no-op if paths are identical (avoids EPERM on Windows)
      if (path.resolve(oldPath) === path.resolve(newPath)) return true;
      if (!fs.existsSync(oldPath)) return false;
      const parentDir = path.dirname(newPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      await fs.promises.rename(oldPath, newPath);
      return true;
    } catch (err) {
      console.error(`[Filesystem] Failed to rename ${oldPath} to ${newPath}:`, err);
      return false;
    }
  }

  duplicateEntry(srcPath: string): string {
    if (!fs.existsSync(srcPath)) throw new Error(`Source not found: ${srcPath}`);
    const dir = path.dirname(srcPath);
    const ext = path.extname(srcPath);
    const base = path.basename(srcPath, ext);

    let counter = 1;
    let newPath = path.join(dir, `${base} copy${ext}`);
    while (fs.existsSync(newPath)) {
      counter++;
      newPath = path.join(dir, `${base} copy ${counter}${ext}`);
    }

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.cpSync(srcPath, newPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, newPath);
    }
    return newPath;
  }

  revealInExplorer(targetPath: string): void {
    if (fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath);
    }
  }

  watchDirectory(dirPath: string): boolean {
    if (this.watcher) {
      const prevWatcher = this.watcher;
      this.watcher = null;
      prevWatcher.close().catch(() => {});
    }

    if (!fs.existsSync(dirPath)) return false;

    // Filter to completely ignore heavy directories and temporary lock files
    const shouldIgnore = (testPath: string) => {
      const normalized = testPath.replace(/\\/g, '/');
      const parts = normalized.split('/');
      for (const part of parts) {
        if (HEAVY_IGNORED_DIRS.has(part) || IGNORED_NAMES.has(part)) {
          return true;
        }
      }
      const filename = parts[parts.length - 1];
      if (
        filename.endsWith('.tmp') ||
        filename.endsWith('.swp') ||
        filename.startsWith('~') ||
        filename.startsWith('.#')
      ) {
        return true;
      }
      return false;
    };

    try {
      this.watcher = chokidar.watch(dirPath, {
        ignored: shouldIgnore,
        persistent: true,
        ignoreInitial: true,
        depth: 5,
        followSymlinks: false,
        usePolling: false,
      });

      let notifyTimer: NodeJS.Timeout | null = null;
      let pendingEvents: { type: string; path: string }[] = [];

      const flushEvents = () => {
        if (this.win && !this.win.isDestroyed() && pendingEvents.length > 0) {
          const lastEvent = pendingEvents[pendingEvents.length - 1];
          this.win.webContents.send('fs:event', lastEvent);
        }
        pendingEvents = [];
        notifyTimer = null;
      };

      const notify = (type: string, changedPath: string) => {
        pendingEvents.push({ type, path: changedPath });
        if (!notifyTimer) {
          notifyTimer = setTimeout(flushEvents, 100);
        }
      };

      this.watcher
        .on('add', (p) => notify('add', p))
        .on('change', (p) => notify('change', p))
        .on('unlink', (p) => notify('unlink', p))
        .on('addDir', (p) => notify('addDir', p))
        .on('unlinkDir', (p) => notify('unlinkDir', p))
        .on('error', (err) => console.warn('[Filesystem Watcher] Watch error:', err));

      return true;
    } catch (err) {
      console.error('[Filesystem Watcher] Failed to initialize watcher:', err);
      return false;
    }
  }

  unwatchDirectory(): boolean {
    if (this.watcher) {
      const prevWatcher = this.watcher;
      this.watcher = null;
      prevWatcher.close().catch(() => {});
      return true;
    }
    return false;
  }
}

export const filesystemService = new FilesystemService();
