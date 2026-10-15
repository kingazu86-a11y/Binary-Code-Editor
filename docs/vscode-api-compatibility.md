# Binary VS Code API Compatibility Specification & Matrix

## Architecture Overview

Binary hosts unmodified VS Code extensions in an isolated child process (`ExtensionHostProcess` ➔ `extensionHostWorker`).

```
┌──────────────────────────────────────────────┐
│             VS Code Extension                │
│    (e.g., ms-python, DEVSENSE composer)      │
└──────────────────────┬───────────────────────┘
                       │ require("vscode")
┌──────────────────────▼───────────────────────┐
│     Binary VS Code API Compatibility Layer    │
│            (vscodeApiShim.ts)                │
├──────────────────────────────────────────────┤
│  • ExtensionContext (asAbsolutePath, etc.)   │
│  • Uri (joinPath, parse, file, toJSON)       │
│  • Collections (TestItemCollection, etc.)    │
│  • Namespaces (workspace, window, etc.)      │
│  • Resilient Proxy with fallback iterators   │
└──────────────────────┬───────────────────────┘
                       │ IPC
┌──────────────────────▼───────────────────────┐
│       Binary Extension Host Process          │
│          (ExtensionHostProcess.ts)           │
└──────────────────────┬───────────────────────┘
                       │ IPC
┌──────────────────────▼───────────────────────┐
│        Binary Main Process & Renderer        │
└──────────────────────────────────────────────┘
```

---

## Compatibility Matrix

| API Namespace / Class | Status | Implementation Details | Test Coverage |
| :--- | :--- | :--- | :--- |
| **`ExtensionContext`** | **FULL** | `asAbsolutePath`, `extensionUri`, `storageUri`, `globalStorageUri`, `logUri`, `workspaceState`, `globalState`, `secrets`, `environmentVariableCollection`, `extensionMode` | Tested with `DEVSENSE.composer-php-vscode` & unit tests |
| **`Uri`** | **FULL** | `Uri.file`, `Uri.parse`, `Uri.joinPath`, `Uri.from`, `with`, `toString`, `toJSON` (`$mid: 1`), Windows drive letter normalization (`/c:/...` ↔ `C:\...`) | Verified cross-platform |
| **`TestItemCollection`** | **FULL** | Dual-iteration proxy (`for [id, item] of c`, `for item of c`, `[...c]`), `add`, `delete`, `get`, `replace`, `forEach`, `values`, `entries`, `keys`, `size` | Verified with `ms-python.python` patterns |
| **`commands`** | **FULL** | `registerCommand`, `executeCommand` (supports built-in `setContext`), `getCommands`, isolated lifecycle tracking | Verified with worker execution |
| **`Disposable`** | **FULL** | `Disposable.from`, `dispose()`, safe execution | Verified |
| **`EventEmitter`** | **FULL** | `event`, `fire`, `dispose` | Verified |
| **`WorkspaceEdit`** | **FULL** | `insert`, `replace`, `delete`, `createFile`, `deleteFile`, `renameFile`, `entries()`, `has()`, `size`, iterable `[Symbol.iterator]` | Verified |
| **`DiagnosticCollection`** | **FULL** | `set`, `get`, `has`, `delete`, `clear`, `forEach`, `dispose`, iterable `[Symbol.iterator]` yielding `[Uri, readonly Diagnostic[]]` | Verified |
| **`workspace.fs`** | **FULL** | `readFile`, `writeFile`, `stat`, `delete`, `rename`, `copy`, `createDirectory`, `readDirectory` | Backed by Node `fs.promises` |
| **`workspace`** | **PARTIAL** | `workspaceFolders`, `getConfiguration`, `asRelativePath`, `findFiles`, `createFileSystemWatcher`, `openTextDocument`, `applyEdit`, document lifecycle events | Core functionality operational |
| **`window`** | **PARTIAL** | `showInformationMessage`, `showWarningMessage`, `showErrorMessage`, `showQuickPick`, `showInputBox`, `withProgress`, `createTerminal`, `createOutputChannel`, `createStatusBarItem`, editor change events, `activeColorTheme` | UI notifications and channels connected to Binary services |
| **`extensions`** | **FULL** | `getExtension`, `all`, `onDidChange`, populates `packageJSON`, `isActive`, `extensionUri` | Verified |
| **`languages`** | **PARTIAL** | `createDiagnosticCollection`, provider registrations (stubs returning disposables) | Diagnostic collection functional |
| **`debug`** | **PARTIAL** | `startDebugging`, `stopDebugging`, session events, breakpoints | Stubbed with resilient proxy fallbacks |
| **`tasks`** | **PARTIAL** | `registerTaskProvider`, `fetchTasks`, `executeTask` | Stubbed with resilient proxy fallbacks |
| **`env`** | **FULL** | `appName`, `appRoot`, `language`, `machineId`, `sessionId`, `uiKind`, `clipboard` | Verified |
| **`scm`** | **STUB** | Resilient proxy fallback with empty collections and disposables | Controlled compatibility fallback |
| **`authentication`** | **STUB** | Resilient proxy fallback | Controlled compatibility fallback |
| **`notebooks`** | **STUB** | Resilient proxy fallback | Controlled compatibility fallback |

---

## Special Compatibility Semantics

### 1. Dual-Iteration Semantics on Collections
Certain VS Code extensions loop over `TestItemCollection` using destructuring (`for (const [id, item] of controller.items)`), while others loop expecting the item directly (`for (const item of controller.items)`). Binary implements `TestItemEntry` — an array `[id, item]` that also proxies properties (`entry.id`, `entry.label`, `entry.children`) to `item`.
This allows `[...collection]`, `new Map(collection)`, `for..of` destructuring, and direct item iteration to all work simultaneously.

### 2. Telemetry Fault Tolerance
Many VS Code extensions include telemetry SDKs (`applicationinsights`, `vscode-extension-telemetry`) that attempt to communicate with Microsoft endpoints such as `dc.services.visualstudio.com`. When running offline or when DNS is unavailable, these calls produce `ENOTFOUND` rejections.
Binary treats these errors as non-fatal warnings (`isTelemetryError`), preventing them from terminating the extension host or marking extensions as crashed.

### 3. Resilient Proxy Iterator Fallback
Un-shimmed or future VS Code namespaces are guarded by `createResilientProxy`. Every fallback proxy returned implements `[Symbol.iterator]: function* () {}`, guaranteeing that spread syntax (`[...vscode.futureApi()]`) will return `[]` rather than throwing `TypeError: Spread syntax requires ...iterable[Symbol.iterator] to be a function`.
