import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Basic Classes & Utilities
// ─────────────────────────────────────────────────────────────────────────────

export class Disposable {
  private _isDisposed = false;
  constructor(private readonly _callOnDispose: () => void) {}

  public dispose(): void {
    if (!this._isDisposed) {
      this._isDisposed = true;
      try {
        this._callOnDispose();
      } catch (e) {
        console.error('[VSCodeShim Disposable] Exception on dispose:', e);
      }
    }
  }

  public static from(...disposables: { dispose(): any }[]): Disposable {
    return new Disposable(() => {
      for (const d of disposables) {
        if (d && typeof d.dispose === 'function') {
          d.dispose();
        }
      }
    });
  }
}

export class EventEmitter<T = any> {
  private _listeners: Array<(e: T) => any> = [];

  public get event(): (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]) => Disposable {
    return (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]) => {
      const bound = thisArgs ? listener.bind(thisArgs) : listener;
      this._listeners.push(bound);
      const res = new Disposable(() => {
        const idx = this._listeners.indexOf(bound);
        if (idx !== -1) this._listeners.splice(idx, 1);
      });
      if (disposables && Array.isArray(disposables)) {
        disposables.push(res);
      }
      return res;
    };
  }

  public fire(data?: T): void {
    const copy = [...this._listeners];
    for (const listener of copy) {
      try {
        listener(data as T);
      } catch (err) {
        console.error('[VSCodeShim EventEmitter] Listener error:', err);
      }
    }
  }

  public dispose(): void {
    this._listeners = [];
  }
}

export class CancellationTokenSource {
  private _token = {
    isCancellationRequested: false,
    onCancellationRequested: new EventEmitter<void>().event,
  };

  public get token() {
    return this._token;
  }

  public cancel(): void {
    this._token.isCancellationRequested = true;
  }

  public dispose(): void {
    this.cancel();
  }
}

export class Uri {
  public readonly scheme: string;
  public readonly authority: string;
  public readonly path: string;
  public readonly query: string;
  public readonly fragment: string;

  constructor(scheme: string, authority: string, path: string, query = '', fragment = '') {
    this.scheme = scheme || '';
    this.authority = authority || '';
    this.path = path || '';
    this.query = query || '';
    this.fragment = fragment || '';
  }

  public static file(filePath: string): Uri {
    let normalized = filePath.replace(/\\/g, '/');
    if (process.platform === 'win32') {
      if (/^[a-zA-Z]:/.test(normalized)) {
        normalized = '/' + normalized;
      }
    }
    return new Uri('file', '', normalized);
  }

  public static parse(value: string, _strict?: boolean): Uri {
    try {
      const url = new URL(value);
      return new Uri(
        url.protocol.replace(':', ''),
        url.host,
        url.pathname,
        url.search.replace(/^\?/, ''),
        url.hash.replace(/^#/, '')
      );
    } catch {
      return Uri.file(value);
    }
  }

  public static joinPath(base: Uri, ...pathSegments: string[]): Uri {
    if (!pathSegments || pathSegments.length === 0) {
      return base;
    }
    const joined = path.posix.join(base.path, ...pathSegments.map((s) => s.replace(/\\/g, '/')));
    return new Uri(base.scheme, base.authority, joined, base.query, base.fragment);
  }

  public static from(components: {
    scheme: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri {
    return new Uri(
      components.scheme,
      components.authority || '',
      components.path || '',
      components.query || '',
      components.fragment || ''
    );
  }

  public with(change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri {
    return new Uri(
      change.scheme !== undefined ? change.scheme : this.scheme,
      change.authority !== undefined ? change.authority : this.authority,
      change.path !== undefined ? change.path : this.path,
      change.query !== undefined ? change.query : this.query,
      change.fragment !== undefined ? change.fragment : this.fragment
    );
  }

  public toString(skipEncoding?: boolean): string {
    if (this.scheme === 'file') {
      return `file://${this.path}`;
    }
    return `${this.scheme}://${this.authority}${this.path}${this.query ? '?' + this.query : ''}${this.fragment ? '#' + this.fragment : ''}`;
  }

  public toJSON(): any {
    return {
      $mid: 1,
      scheme: this.scheme,
      authority: this.authority,
      path: this.path,
      query: this.query,
      fragment: this.fragment,
      fsPath: this.fsPath,
      external: this.toString(),
    };
  }

  public static revive(data: any): Uri {
    if (!data) return data;
    if (data instanceof Uri) return data;
    if (data.$mid === 1 || data.scheme) {
      return Uri.from(data);
    }
    return data;
  }

  public get fsPath(): string {
    if (process.platform === 'win32') {
      let p = this.path;
      if (p.startsWith('/') && /^\/[a-zA-Z]:/.test(p)) {
        p = p.slice(1);
      }
      return p.replace(/\//g, '\\');
    }
    return this.path;
  }
}

export class Position {
  constructor(public readonly line: number, public readonly character: number) {}

  public isBefore(other: Position): boolean {
    if (this.line < other.line) return true;
    if (this.line > other.line) return false;
    return this.character < other.character;
  }

  public isBeforeOrEqual(other: Position): boolean {
    return this.isBefore(other) || (this.line === other.line && this.character === other.character);
  }

  public isAfter(other: Position): boolean {
    return !this.isBeforeOrEqual(other);
  }

  public isAfterOrEqual(other: Position): boolean {
    return !this.isBefore(other);
  }

  public isEqual(other: Position): boolean {
    return this.line === other.line && this.character === other.character;
  }

  public translate(lineDelta = 0, characterDelta = 0): Position {
    return new Position(this.line + lineDelta, this.character + characterDelta);
  }

  public with(line?: number, character?: number): Position {
    return new Position(line !== undefined ? line : this.line, character !== undefined ? character : this.character);
  }
}

export class Range {
  public readonly start: Position;
  public readonly end: Position;

  constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
  constructor(start: Position, end: Position);
  constructor(a: number | Position, b: number | Position, c?: number, d?: number) {
    if (typeof a === 'number' && typeof b === 'number' && typeof c === 'number' && typeof d === 'number') {
      this.start = new Position(a, b);
      this.end = new Position(c, d);
    } else if (a instanceof Position && b instanceof Position) {
      this.start = a;
      this.end = b;
    } else {
      this.start = new Position(0, 0);
      this.end = new Position(0, 0);
    }
  }

  public get isEmpty(): boolean {
    return this.start.isEqual(this.end);
  }

  public get isSingleLine(): boolean {
    return this.start.line === this.end.line;
  }

  public contains(positionOrRange: Position | Range): boolean {
    if (positionOrRange instanceof Position) {
      return positionOrRange.isAfterOrEqual(this.start) && positionOrRange.isBeforeOrEqual(this.end);
    } else if (positionOrRange instanceof Range) {
      return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
    }
    return false;
  }
}

export class Selection extends Range {
  public readonly anchor: Position;
  public readonly active: Position;

  constructor(anchorLine: number, anchorCharacter: number, activeLine: number, activeCharacter: number);
  constructor(anchor: Position, active: Position);
  constructor(a: number | Position, b: number | Position, c?: number, d?: number) {
    if (a instanceof Position && b instanceof Position) {
      super(a, b);
      this.anchor = a;
      this.active = b;
    } else if (typeof a === 'number' && typeof b === 'number' && typeof c === 'number' && typeof d === 'number') {
      super(a, b, c, d);
      this.anchor = new Position(a, b);
      this.active = new Position(c, d);
    } else {
      super(0, 0, 0, 0);
      this.anchor = new Position(0, 0);
      this.active = new Position(0, 0);
    }
  }

  public get isReversed(): boolean {
    return this.anchor.isAfter(this.active);
  }
}

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export class Diagnostic {
  public code?: string | number;
  public source?: string;
  public relatedInformation?: any[];

  constructor(
    public range: Range,
    public message: string,
    public severity: DiagnosticSeverity = DiagnosticSeverity.Error
  ) {}
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export class ThemeColor {
  constructor(public id: string) {}
}

export class ThemeIcon {
  constructor(public id: string, public color?: ThemeColor) {}
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class TreeItem {
  public label?: string;
  public iconPath?: string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;
  public description?: string;
  public tooltip?: string;
  public command?: any;
  public collapsibleState?: TreeItemCollapsibleState;
  public contextValue?: string;

  constructor(label: string, collapsibleState = TreeItemCollapsibleState.None) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

export enum CompletionItemKind {
  Text = 0,
  Method = 1,
  Function = 2,
  Constructor = 3,
  Field = 4,
  Variable = 5,
  Class = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Unit = 10,
  Value = 11,
  Enum = 12,
  Keyword = 13,
  Snippet = 14,
  Color = 15,
  File = 16,
  Reference = 17,
  Folder = 18,
  EnumMember = 19,
  Constant = 20,
  Struct = 21,
  Event = 22,
  Operator = 23,
  TypeParameter = 24,
  User = 25,
  Issue = 26,
}

export enum CompletionItemTag {
  Deprecated = 1,
}

export class SnippetString {
  public value: string;
  constructor(value = '') {
    this.value = value;
  }
  public appendText(string: string): SnippetString {
    this.value += string;
    return this;
  }
  public appendTabstop(number = 0): SnippetString {
    this.value += `$${number}`;
    return this;
  }
  public appendPlaceholder(value: string | ((snippet: SnippetString) => any), number?: number): SnippetString {
    this.value += `\${${number || 1}:${value}}`;
    return this;
  }
  public appendChoice(values: readonly string[], number?: number): SnippetString {
    this.value += `\${${number || 1}|${values.join(',')}|}`;
    return this;
  }
  public appendVariable(name: string, defaultValue: string | ((snippet: SnippetString) => any)): SnippetString {
    this.value += `\${${name}:${defaultValue}}`;
    return this;
  }
}

export class MarkdownString {
  public value: string;
  public isTrusted?: boolean;
  public supportThemeIcons?: boolean;
  public supportHtml?: boolean;

  constructor(value = '', supportThemeIcons = false) {
    this.value = value;
    this.supportThemeIcons = supportThemeIcons;
  }

  public appendText(value: string): MarkdownString {
    this.value += value;
    return this;
  }

  public appendMarkdown(value: string): MarkdownString {
    this.value += value;
    return this;
  }

  public appendCodeblock(value: string, language = ''): MarkdownString {
    this.value += `\n\`\`\`${language}\n${value}\n\`\`\`\n`;
    return this;
  }
}

export class CompletionItem {
  public label: string | any;
  public kind?: CompletionItemKind;
  public tags?: CompletionItemTag[];
  public detail?: string;
  public documentation?: string | MarkdownString;
  public sortText?: string;
  public filterText?: string;
  public preselect?: boolean;
  public insertText?: string | SnippetString;
  public range?: Range | { inserting: Range; replacing: Range };
  public commitCharacters?: string[];
  public keepWhitespace?: boolean;
  public command?: any;

  constructor(label: string | any, kind?: CompletionItemKind) {
    this.label = label;
    this.kind = kind;
  }
}

export class Hover {
  public contents: Array<MarkdownString | string | { language: string; value: string }>;
  public range?: Range;

  constructor(
    contents: MarkdownString | string | Array<MarkdownString | string | { language: string; value: string }>,
    range?: Range
  ) {
    this.contents = Array.isArray(contents) ? contents : [contents];
    this.range = range;
  }
}

export class Location {
  constructor(public uri: Uri, public rangeOrPosition: Range | Position) {}
  public get range(): Range {
    if (this.rangeOrPosition instanceof Position) {
      return new Range(this.rangeOrPosition, this.rangeOrPosition);
    }
    return this.rangeOrPosition;
  }
}

export class CodeLens {
  public range: Range;
  public command?: any;
  public isResolved = false;

  constructor(range: Range, command?: any) {
    this.range = range;
    this.command = command;
  }
}

export class CodeActionKind {
  public static readonly Empty = new CodeActionKind('');
  public static readonly QuickFix = new CodeActionKind('quickfix');
  public static readonly Refactor = new CodeActionKind('refactor');
  public static readonly RefactorExtract = new CodeActionKind('refactor.extract');
  public static readonly RefactorInline = new CodeActionKind('refactor.inline');
  public static readonly RefactorMove = new CodeActionKind('refactor.move');
  public static readonly RefactorRewrite = new CodeActionKind('refactor.rewrite');
  public static readonly Source = new CodeActionKind('source');
  public static readonly SourceOrganizeImports = new CodeActionKind('source.organizeImports');
  public static readonly SourceFixAll = new CodeActionKind('source.fixAll');

  constructor(public readonly value: string) {}

  public append(parts: string): CodeActionKind {
    return new CodeActionKind(this.value ? `${this.value}.${parts}` : parts);
  }

  public intersects(other: CodeActionKind): boolean {
    return this.value.startsWith(other.value) || other.value.startsWith(this.value);
  }

  public contains(other: CodeActionKind): boolean {
    return this.value === other.value || other.value.startsWith(this.value + '.');
  }
}

export class CodeAction {
  public title: string;
  public kind?: CodeActionKind;
  public command?: any;
  public edit?: any;
  public diagnostics?: Diagnostic[];
  public isPreferred?: boolean;

  constructor(title: string, kind?: CodeActionKind) {
    this.title = title;
    this.kind = kind;
  }
}

export class FileSystemError extends Error {
  public readonly code: string;
  constructor(uriOrMessage?: Uri | string) {
    super(typeof uriOrMessage === 'string' ? uriOrMessage : uriOrMessage?.toString() || 'FileSystemError');
    this.name = 'FileSystemError';
    this.code = 'FileSystemError';
  }

  public static FileNotFound(uri?: Uri): FileSystemError {
    const err = new FileSystemError(uri ? `File not found: ${uri.toString()}` : 'EntryNotFound');
    (err as any).code = 'FileNotFound';
    return err;
  }

  public static FileExists(uri?: Uri): FileSystemError {
    const err = new FileSystemError(uri ? `File exists: ${uri.toString()}` : 'EntryExists');
    (err as any).code = 'FileExists';
    return err;
  }

  public static FileNotADirectory(uri?: Uri): FileSystemError {
    const err = new FileSystemError(uri ? `File is not a directory: ${uri.toString()}` : 'EntryNotADirectory');
    (err as any).code = 'FileNotADirectory';
    return err;
  }

  public static FileIsADirectory(uri?: Uri): FileSystemError {
    const err = new FileSystemError(uri ? `File is a directory: ${uri.toString()}` : 'EntryIsADirectory');
    (err as any).code = 'FileIsADirectory';
    return err;
  }

  public static NoPermissions(uri?: Uri): FileSystemError {
    const err = new FileSystemError(uri ? `No permissions: ${uri.toString()}` : 'NoPermissions');
    (err as any).code = 'NoPermissions';
    return err;
  }

  public static Unavailable(uri?: Uri): FileSystemError {
    const err = new FileSystemError(uri ? `Unavailable: ${uri.toString()}` : 'Unavailable');
    (err as any).code = 'Unavailable';
    return err;
  }
}

export class TestItemEntry extends Array {
  constructor(id: string, item: any) {
    super();
    this.push(id, item);
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) return (target as any)[prop];
        if (item && prop in item) return item[prop];
        return undefined;
      },
      has(target, prop) {
        return prop in target || (item && prop in item);
      },
    });
  }
}

export class TestItemCollection implements Iterable<any> {
  private _items = new Map<string, any>();

  get size(): number {
    return this._items.size;
  }

  add(item: any): void {
    if (item && item.id) {
      this._items.set(item.id, item);
    }
  }

  delete(id: string): void {
    this._items.delete(id);
  }

  get(id: string): any | undefined {
    return this._items.get(id);
  }

  replace(items: readonly any[]): void {
    this._items.clear();
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item && item.id) {
          this._items.set(item.id, item);
        }
      }
    }
  }

  forEach(callback: (item: any, collection: TestItemCollection) => unknown, thisArg?: any): void {
    for (const item of this._items.values()) {
      callback.call(thisArg, item, this);
    }
  }

  values(): IterableIterator<any> {
    return this._items.values();
  }

  entries(): IterableIterator<[string, any]> {
    return this._items.entries();
  }

  keys(): IterableIterator<string> {
    return this._items.keys();
  }

  [Symbol.iterator](): Iterator<any> {
    const entries: any[] = [];
    for (const [id, item] of this._items.entries()) {
      entries.push(new TestItemEntry(id, item));
    }
    return entries[Symbol.iterator]();
  }
}

export class TestItem {
  public readonly id: string;
  public uri?: any;
  public children: TestItemCollection;
  public parent?: TestItem;
  public canResolveChildren = false;
  public busy = false;
  public label: string;
  public description?: string;
  public range?: any;
  public error?: any;
  public sortText?: string;
  public tags: readonly any[] = [];

  constructor(id: string, label: string, uri?: any) {
    this.id = id;
    this.label = label;
    this.uri = uri;
    this.children = new TestItemCollection();
  }
}

export class TestTag {
  public readonly id: string;
  constructor(id: string) {
    this.id = id;
  }
}

export class TestMessage {
  public message: string | any;
  public expectedOutput?: string;
  public actualOutput?: string;
  public location?: any;
  public contextValue?: string;

  constructor(message: string | any) {
    this.message = message;
  }
}

export class TestRunRequest {
  public readonly include?: readonly any[];
  public readonly exclude?: readonly any[];
  public readonly profile?: any;
  public readonly continuous?: boolean;

  constructor(include?: readonly any[], exclude?: readonly any[], profile?: any, continuous?: boolean) {
    this.include = include;
    this.exclude = exclude;
    this.profile = profile;
    this.continuous = continuous;
  }
}

export class WorkspaceEdit implements Iterable<[Uri, any[]]> {
  private _edits = new Map<string, any[]>();
  private _fileOperations: any[] = [];

  get size(): number {
    return this._edits.size + this._fileOperations.length;
  }

  replace(uri: Uri, range: Range, newText: string): void {
    const key = uri.toString();
    if (!this._edits.has(key)) this._edits.set(key, []);
    this._edits.get(key)!.push({ type: 'replace', range, newText });
  }

  insert(uri: Uri, position: Position, newText: string): void {
    const key = uri.toString();
    if (!this._edits.has(key)) this._edits.set(key, []);
    this._edits.get(key)!.push({ type: 'insert', position, newText });
  }

  delete(uri: Uri, range: Range): void {
    const key = uri.toString();
    if (!this._edits.has(key)) this._edits.set(key, []);
    this._edits.get(key)!.push({ type: 'delete', range });
  }

  has(uri: Uri): boolean {
    return this._edits.has(uri.toString());
  }

  set(uri: Uri, edits: readonly any[]): void {
    this._edits.set(uri.toString(), [...edits]);
  }

  get(uri: Uri): any[] {
    return this._edits.get(uri.toString()) || [];
  }

  entries(): [Uri, any[]][] {
    const result: [Uri, any[]][] = [];
    for (const [key, edits] of this._edits.entries()) {
      result.push([Uri.parse(key), edits]);
    }
    return result;
  }

  createFile(uri: Uri, options?: { overwrite?: boolean; ignoreIfExists?: boolean }): void {
    this._fileOperations.push({ type: 'create', uri, options });
  }

  deleteFile(uri: Uri, options?: { recursive?: boolean; ignoreIfNotExists?: boolean }): void {
    this._fileOperations.push({ type: 'delete', uri, options });
  }

  renameFile(oldUri: Uri, newUri: Uri, options?: { overwrite?: boolean; ignoreIfExists?: boolean }): void {
    this._fileOperations.push({ type: 'rename', oldUri, newUri, options });
  }

  [Symbol.iterator](): Iterator<[Uri, any[]]> {
    return this.entries()[Symbol.iterator]();
  }
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export enum ExtensionKind {
  UI = 1,
  Workspace = 2,
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

export enum UIKind {
  Desktop = 1,
  Web = 2,
}

export enum LogLevel {
  Off = 0,
  Trace = 1,
  Debug = 2,
  Info = 3,
  Warning = 4,
  Error = 5,
}

export enum TestRunProfileKind {
  Run = 1,
  Debug = 2,
  Coverage = 3,
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}
