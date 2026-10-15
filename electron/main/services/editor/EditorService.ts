import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { Range, Position, Selection } from '../../../../src/types/extensionApi';

export interface DocumentSnapshot {
  uri: string;
  fileName: string;
  languageId: string;
  version: number;
  text: string;
  isDirty: boolean;
  lineCount: number;
}

export interface ActiveEditorSnapshot {
  uri: string;
  document: DocumentSnapshot;
  selection: Selection;
  selections: Selection[];
  visibleRanges: Range[];
}

export class EditorService extends EventEmitter {
  private documents = new Map<string, DocumentSnapshot>();
  private activeEditor: ActiveEditorSnapshot | null = null;
  private win: BrowserWindow | null = null;

  setWindow(win: BrowserWindow | null): void {
    this.win = win;
  }

  syncDocument(uri: string, languageId: string, version: number, text: string, isDirty = false): DocumentSnapshot {
    const lines = text.split('\n');
    const fileName = uri.replace(/\\/g, '/').split('/').pop() || uri;
    const isNew = !this.documents.has(uri);

    const doc: DocumentSnapshot = {
      uri,
      fileName,
      languageId,
      version,
      text,
      isDirty,
      lineCount: lines.length,
    };

    this.documents.set(uri, doc);

    if (isNew) {
      this.emit('onDidOpenDocument', doc);
    } else {
      this.emit('onDidChangeTextDocument', {
        document: doc,
        contentChanges: [{ text }],
      });
    }

    if (this.activeEditor && this.activeEditor.uri === uri) {
      this.activeEditor.document = doc;
    }

    return doc;
  }

  saveDocument(uri: string): void {
    const doc = this.documents.get(uri);
    if (doc) {
      doc.isDirty = false;
      this.emit('onDidSaveDocument', doc);
    }
  }

  closeDocument(uri: string): void {
    const doc = this.documents.get(uri);
    if (doc) {
      this.documents.delete(uri);
      this.emit('onDidCloseDocument', doc);
    }
    if (this.activeEditor && this.activeEditor.uri === uri) {
      this.activeEditor = null;
      this.emit('onDidChangeActiveEditor', null);
    }
  }

  setActiveEditor(uri: string, selection?: any, visibleRanges?: any[]): void {
    const doc = this.documents.get(uri) || {
      uri,
      fileName: uri.replace(/\\/g, '/').split('/').pop() || uri,
      languageId: '',
      version: 1,
      text: '',
      isDirty: false,
      lineCount: 1,
    };

    const defaultSelection: Selection = {
      start: { line: selection?.startLineNumber ?? 1, character: selection?.startColumn ?? 1 },
      end: { line: selection?.endLineNumber ?? 1, character: selection?.endColumn ?? 1 },
      anchor: { line: selection?.selectionStartLineNumber ?? 1, character: selection?.selectionStartColumn ?? 1 },
      active: { line: selection?.positionLineNumber ?? 1, character: selection?.positionColumn ?? 1 },
    };

    this.activeEditor = {
      uri,
      document: doc,
      selection: defaultSelection,
      selections: [defaultSelection],
      visibleRanges: visibleRanges || [{ start: { line: 1, character: 1 }, end: { line: doc.lineCount, character: 1 } }],
    };

    this.emit('onDidChangeActiveEditor', this.activeEditor);
    if (selection) {
      this.emit('onDidChangeSelection', {
        textEditor: this.activeEditor,
        selections: [defaultSelection],
      });
    }
  }

  getActiveEditor(): ActiveEditorSnapshot | null {
    return this.activeEditor;
  }

  getDocument(uri: string): DocumentSnapshot | undefined {
    return this.documents.get(uri);
  }

  getOpenDocuments(): DocumentSnapshot[] {
    return Array.from(this.documents.values());
  }

  getText(uri: string): string {
    const doc = this.documents.get(uri);
    return doc ? doc.text : '';
  }

  async insertText(uri: string, position: Position, text: string): Promise<boolean> {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('editor:insertText', { uri, position, text });
      return true;
    }
    return false;
  }

  async replaceRange(uri: string, range: Range, text: string): Promise<boolean> {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('editor:replaceRange', { uri, range, text });
      return true;
    }
    return false;
  }

  async showDocument(uri: string, options?: { viewColumn?: number; preserveFocus?: boolean }): Promise<boolean> {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('editor:openFile', { filePath: uri, options });
      return true;
    }
    return false;
  }

  setDecorations(uri: string, decorationKey: string, ranges: Range[]): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('editor:setDecorations', { uri, decorationKey, ranges });
    }
  }
}

export const editorService = new EditorService();
