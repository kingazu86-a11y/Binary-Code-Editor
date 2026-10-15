import fs from 'fs';
import path from 'path';
import { sendIpcMessage } from '../ipc';
import { Uri, Range, Position, WorkspaceEdit, EventEmitter } from '../types';

export const workspaceState: Record<string, any> = {
  workspaceFolders: [] as Array<{ uri: Uri; name: string; index: number }>,
  name: undefined as string | undefined,
  rootPath: undefined as string | undefined,
  config: {} as Record<string, any>,
};

export const onDidChangeTextDocumentEmitter = new EventEmitter<any>();
export const onDidOpenTextDocumentEmitter = new EventEmitter<any>();
export const onDidCloseTextDocumentEmitter = new EventEmitter<any>();
export const onDidSaveTextDocumentEmitter = new EventEmitter<any>();

export const workspace = {
  workspaceFile: undefined,
  isTrusted: true,
  onDidGrantWorkspaceTrust: new EventEmitter<void>().event,
  onDidChangeWorkspaceFolders: new EventEmitter<any>().event,
  onDidChangeConfiguration: new EventEmitter<any>().event,
  textDocuments: [] as any[],
  getOpenTextDocuments: () => [] as any[],

  get workspaceFolders() {
    return workspaceState.workspaceFolders;
  },
  get name() {
    return workspaceState.name;
  },
  get rootPath() {
    return workspaceState.rootPath;
  },

  getConfiguration: (section?: string, _scope?: any) => {
    return {
      get: <T>(key: string, defaultValue?: T): T => {
        const fullKey = section ? `${section}.${key}` : key;
        if (workspaceState.config && fullKey in workspaceState.config) {
          return workspaceState.config[fullKey];
        }
        return defaultValue as T;
      },
      has: (key: string): boolean => {
        const fullKey = section ? `${section}.${key}` : key;
        return workspaceState.config && fullKey in workspaceState.config;
      },
      inspect: <T>(key: string) => {
        const fullKey = section ? `${section}.${key}` : key;
        const val = workspaceState.config ? workspaceState.config[fullKey] : undefined;
        return {
          key: fullKey,
          defaultValue: undefined,
          globalValue: val,
          workspaceValue: val,
          workspaceFolderValue: val,
        };
      },
      update: async (key: string, value: any): Promise<void> => {
        const fullKey = section ? `${section}.${key}` : key;
        if (!workspaceState.config) workspaceState.config = {};
        workspaceState.config[fullKey] = value;
        sendIpcMessage('workspace/configUpdate', { key: fullKey, value });
      },
    };
  },

  getWorkspaceFolder: (_uri: any) => {
    if (workspaceState.workspaceFolders && workspaceState.workspaceFolders.length > 0) {
      return workspaceState.workspaceFolders[0];
    }
    const root = workspaceState.rootPath || process.cwd();
    return {
      uri: Uri.file(root),
      name: path.basename(root),
      index: 0,
    };
  },

  asRelativePath: (pathOrUri: any, _includeWorkspaceFolder?: boolean) => {
    const root = workspaceState.rootPath || process.cwd();
    const p = typeof pathOrUri === 'string' ? pathOrUri : pathOrUri?.fsPath || '';
    return path.relative(root, p);
  },

  findFiles: async (_include?: any, _exclude?: any, _maxResults?: number) => {
    return [];
  },

  createFileSystemWatcher: (_pattern: any) => {
    return {
      onDidCreate: new EventEmitter<any>().event,
      onDidChange: new EventEmitter<any>().event,
      onDidDelete: new EventEmitter<any>().event,
      dispose: () => {},
    };
  },

  fs: {
    stat: async (uri: Uri) => {
      const stats = await fs.promises.stat(uri.fsPath);
      return {
        type: stats.isDirectory() ? 2 : stats.isFile() ? 1 : 0,
        ctime: stats.ctimeMs,
        mtime: stats.mtimeMs,
        size: stats.size,
      };
    },
    readFile: async (uri: Uri) => {
      const buf = await fs.promises.readFile(uri.fsPath);
      return new Uint8Array(buf);
    },
    writeFile: async (uri: Uri, content: Uint8Array) => {
      await fs.promises.writeFile(uri.fsPath, Buffer.from(content));
    },
    delete: async (uri: Uri, options?: { recursive?: boolean; useTrash?: boolean }) => {
      await fs.promises.rm(uri.fsPath, { recursive: options?.recursive, force: true });
    },
    rename: async (source: Uri, target: Uri, _options?: { overwrite?: boolean }) => {
      await fs.promises.rename(source.fsPath, target.fsPath);
    },
    copy: async (source: Uri, target: Uri, _options?: { overwrite?: boolean }) => {
      await fs.promises.cp(source.fsPath, target.fsPath, { recursive: true });
    },
    createDirectory: async (uri: Uri) => {
      await fs.promises.mkdir(uri.fsPath, { recursive: true });
    },
    readDirectory: async (uri: Uri): Promise<[string, number][]> => {
      const entries = await fs.promises.readdir(uri.fsPath, { withFileTypes: true });
      return entries.map((e) => [e.name, e.isDirectory() ? 2 : e.isFile() ? 1 : 0]);
    },
  },

  applyEdit: async (_edit: WorkspaceEdit): Promise<boolean> => {
    return true;
  },

  openTextDocument: async (uriOrFileNameOrOptions: any): Promise<any> => {
    let filePath = '';
    if (typeof uriOrFileNameOrOptions === 'string') {
      filePath = uriOrFileNameOrOptions;
    } else if (uriOrFileNameOrOptions && uriOrFileNameOrOptions.fsPath) {
      filePath = uriOrFileNameOrOptions.fsPath;
    }
    const uri = Uri.file(filePath || 'untitled');
    let text = '';
    if (filePath && fs.existsSync(filePath)) {
      try {
        text = fs.readFileSync(filePath, 'utf-8');
      } catch {}
    }
    const lines = text.split(/\r?\n/);
    return {
      uri,
      fileName: filePath,
      isUntitled: !filePath,
      languageId: 'plaintext',
      version: 1,
      isDirty: false,
      isClosed: false,
      lineCount: lines.length,
      lineAt: (line: number) => ({
        lineNumber: line,
        text: lines[line] || '',
        range: new Range(line, 0, line, (lines[line] || '').length),
      }),
      getText: (_range?: Range) => text,
      positionAt: (offset: number) => new Position(0, offset),
      offsetAt: (_pos: Position) => 0,
      save: async () => true,
    };
  },

  onDidChangeTextDocument: onDidChangeTextDocumentEmitter.event,
  onDidOpenTextDocument: onDidOpenTextDocumentEmitter.event,
  onDidCloseTextDocument: onDidCloseTextDocumentEmitter.event,
  onDidSaveTextDocument: onDidSaveTextDocumentEmitter.event,
};
