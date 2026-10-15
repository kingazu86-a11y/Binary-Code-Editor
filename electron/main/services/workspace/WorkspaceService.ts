import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import { WorkspaceFolder } from '../../../../src/types/extensionApi';

export class WorkspaceService extends EventEmitter {
  private workspaceRoot: string | null = null;
  private folders: WorkspaceFolder[] = [];

  setWorkspace(rootPath: string | null): void {
    this.workspaceRoot = rootPath ? path.resolve(rootPath) : null;

    if (this.workspaceRoot) {
      const name = path.basename(this.workspaceRoot);
      this.folders = [{ uri: this.workspaceRoot, name, index: 0 }];
      this.emit('onDidOpen', this.folders[0]);
    } else {
      this.folders = [];
      this.emit('onDidClose');
    }

    this.emit('onDidChange', { added: this.folders, removed: [] });
  }

  getRoot(): string | undefined {
    return this.workspaceRoot || undefined;
  }

  getWorkspaceRoot(): string | undefined {
    return this.workspaceRoot || undefined;
  }

  getFolders(): WorkspaceFolder[] {
    return [...this.folders];
  }

  getName(): string {
    return this.workspaceRoot ? path.basename(this.workspaceRoot) : '';
  }

  getWorkspace(): { id: string; name: string; path?: string; folders: WorkspaceFolder[] } {
    return {
      id: this.workspaceRoot ? Buffer.from(this.workspaceRoot).toString('base64') : 'empty',
      name: this.getName(),
      path: this.workspaceRoot || undefined,
      folders: this.getFolders(),
    };
  }

  async getFiles(extensionId: string, pattern?: string, exclude?: string): Promise<string[]> {
    if (!this.workspaceRoot) return [];

    const results: string[] = [];
    const root = this.workspaceRoot;

    const walk = (dir: string, depth = 0) => {
      if (depth > 12) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath, depth + 1);
          } else if (entry.isFile()) {
            if (!pattern || entry.name.includes(pattern) || fullPath.includes(pattern)) {
              results.push(fullPath);
            }
          }
        }
      } catch {}
    };

    walk(root);
    return results;
  }
}

export const workspaceService = new WorkspaceService();
