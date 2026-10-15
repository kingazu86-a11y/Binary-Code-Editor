import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { FileType, FileStat } from '../../../../src/types/extensionApi';

export class FileSystemService extends EventEmitter {
  private watchers = new Map<string, fs.FSWatcher>();

  private resolvePath(uri: string): string {
    if (uri.startsWith('file://')) {
      const parsed = new URL(uri);
      return path.resolve(decodeURIComponent(parsed.pathname.replace(/^\/([a-zA-Z]:)/, '$1')));
    }
    return path.resolve(uri);
  }

  async readFile(extensionId: string, uri: string): Promise<string> {
    const absPath = this.resolvePath(uri);
    return await fsPromises.readFile(absPath, 'utf-8');
  }

  async writeFile(extensionId: string, uri: string, data: string | Buffer): Promise<void> {
    const absPath = this.resolvePath(uri);
    const parentDir = path.dirname(absPath);
    if (!fs.existsSync(parentDir)) {
      await fsPromises.mkdir(parentDir, { recursive: true });
    }

    await fsPromises.writeFile(absPath, data);
    this.emit('onDidChange', absPath);
  }

  async createFile(extensionId: string, uri: string, content = ''): Promise<void> {
    const absPath = this.resolvePath(uri);
    const parentDir = path.dirname(absPath);
    if (!fs.existsSync(parentDir)) {
      await fsPromises.mkdir(parentDir, { recursive: true });
    }

    await fsPromises.writeFile(absPath, content, { flag: 'wx' });
    this.emit('onDidCreate', absPath);
  }

  async delete(extensionId: string, uri: string, options: { recursive?: boolean } = {}): Promise<void> {
    const absPath = this.resolvePath(uri);
    const stat = await fsPromises.stat(absPath);
    if (stat.isDirectory()) {
      await fsPromises.rm(absPath, { recursive: options.recursive ?? true, force: true });
    } else {
      await fsPromises.unlink(absPath);
    }
    this.emit('onDidDelete', absPath);
  }

  async rename(extensionId: string, oldUri: string, newUri: string): Promise<void> {
    const oldPath = this.resolvePath(oldUri);
    const newPath = this.resolvePath(newUri);
    await fsPromises.rename(oldPath, newPath);
    this.emit('onDidDelete', oldPath);
    this.emit('onDidCreate', newPath);
  }

  async copy(extensionId: string, source: string, destination: string): Promise<void> {
    const srcPath = this.resolvePath(source);
    const destPath = this.resolvePath(destination);
    await fsPromises.cp(srcPath, destPath, { recursive: true });
    this.emit('onDidCreate', destPath);
  }

  async exists(extensionId: string, uri: string): Promise<boolean> {
    const absPath = this.resolvePath(uri);
    try {
      await fsPromises.access(absPath);
      return true;
    } catch {
      return false;
    }
  }

  async readDirectory(extensionId: string, uri: string): Promise<Array<[string, FileType]>> {
    const absPath = this.resolvePath(uri);
    const entries = await fsPromises.readdir(absPath, { withFileTypes: true });
    const result: Array<[string, FileType]> = [];

    for (const entry of entries) {
      let type = FileType.Unknown;
      if (entry.isFile()) type = FileType.File;
      else if (entry.isDirectory()) type = FileType.Directory;
      else if (entry.isSymbolicLink()) type = FileType.SymbolicLink;

      result.push([entry.name, type]);
    }
    return result;
  }

  async stat(extensionId: string, uri: string): Promise<FileStat> {
    const absPath = this.resolvePath(uri);
    const s = await fsPromises.stat(absPath);
    let type = FileType.Unknown;
    if (s.isFile()) type = FileType.File;
    else if (s.isDirectory()) type = FileType.Directory;
    else if (s.isSymbolicLink()) type = FileType.SymbolicLink;

    return {
      type,
      ctime: s.ctimeMs,
      mtime: s.mtimeMs,
      size: s.size,
    };
  }

  watch(extensionId: string, uri: string, options: { recursive?: boolean } = {}): string {
    const absPath = this.resolvePath(uri);
    const watchId = `watch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      const watcher = fs.watch(absPath, { recursive: options.recursive ?? true }, (eventType, filename) => {
        const full = filename ? path.join(absPath, filename) : absPath;
        if (eventType === 'rename') {
          if (fs.existsSync(full)) {
            this.emit('onDidCreate', full);
          } else {
            this.emit('onDidDelete', full);
          }
        } else {
          this.emit('onDidChange', full);
        }
      });
      this.watchers.set(watchId, watcher);
    } catch (err) {
      console.warn(`[FileSystemService] Failed to watch ${absPath}:`, err);
    }
    return watchId;
  }

  unwatch(watchId: string): void {
    const w = this.watchers.get(watchId);
    if (w) {
      w.close();
      this.watchers.delete(watchId);
    }
  }
}

export const fileSystemService = new FileSystemService();
