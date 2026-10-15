import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

console.log('========================================');
console.log('🧪 Starting VS Code Compatibility Layer Tests');
console.log('========================================\n');

// 1. Load extensionHostWorker bundle
const workerBundlePath = path.join(root, 'dist-electron/main/extensionHostWorker.js');
assert(fs.existsSync(workerBundlePath), 'extensionHostWorker.js must exist');

// Load module into runtime
const Module = (await import('module')).default;
await import(`file://${workerBundlePath.replace(/\\/g, '/')}`);

// Require vscode via the worker hook
const req = Module.createRequire(import.meta.url);
const vscode = req('vscode');
assert(vscode, 'vscode module must be resolvable via require hook');

let passedCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ----------------------------------------------------
// Test Suite 1: ExtensionContext & asAbsolutePath
// ----------------------------------------------------
console.log('--- 1. ExtensionContext & asAbsolutePath ---');

const dummyExtPath = 'C:\\Users\\test\\.binary\\extensions\\installed\\my-extension';
const { createExtensionContext } = req(workerBundlePath);
const { context } = createExtensionContext('my-extension', dummyExtPath, { name: 'my-extension', version: '1.0.0' });

test('context.asAbsolutePath is a function', () => {
  assert.strictEqual(typeof context.asAbsolutePath, 'function');
});

test('context.asAbsolutePath resolves relative path correctly', () => {
  const abs = context.asAbsolutePath('package.json');
  assert(abs.includes('package.json'));
  assert(abs.startsWith(path.normalize(dummyExtPath)));
});

test('context.asAbsolutePath handles nested paths', () => {
  const abs = context.asAbsolutePath('vendor/autoload.php');
  assert(abs.includes(path.join('vendor', 'autoload.php')));
});

test('context exposes extensionUri, storageUri, globalStorageUri, logUri as Uri instances', () => {
  assert(context.extensionUri instanceof vscode.Uri);
  assert(context.storageUri instanceof vscode.Uri);
  assert(context.globalStorageUri instanceof vscode.Uri);
  assert(context.logUri instanceof vscode.Uri);
});

test('context exposes packageJSON metadata', () => {
  assert.strictEqual(context.extension.packageJSON.name, 'my-extension');
  assert.strictEqual(context.extension.packageJSON.version, '1.0.0');
});

test('context exposes environmentVariableCollection with iterable semantics', () => {
  assert(context.environmentVariableCollection);
  context.environmentVariableCollection.replace('FOO', 'BAR');
  assert.strictEqual(context.environmentVariableCollection.get('FOO').value, 'BAR');
  const entries = [...context.environmentVariableCollection];
  assert.strictEqual(entries.length, 1);
});

// ----------------------------------------------------
// Test Suite 2: Uri Specification Compliance
// ----------------------------------------------------
console.log('\n--- 2. vscode.Uri Specification Compliance ---');

test('Uri.file creates file URI with normalized path and fsPath', () => {
  const uri = vscode.Uri.file('C:\\Users\\JohnDoe\\project\\app.ts');
  assert.strictEqual(uri.scheme, 'file');
  assert(uri.fsPath.includes('app.ts'));
});

test('Uri.joinPath joins segments correctly', () => {
  const base = vscode.Uri.file('C:\\Users\\JohnDoe\\project');
  const joined = vscode.Uri.joinPath(base, 'src', 'components', 'Button.tsx');
  assert.strictEqual(joined.scheme, 'file');
  assert(joined.fsPath.includes(path.join('src', 'components', 'Button.tsx')));
});

test('Uri.parse parses HTTP and Custom URIs', () => {
  const uri = vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=ms-python.python#overview');
  assert.strictEqual(uri.scheme, 'https');
  assert.strictEqual(uri.authority, 'marketplace.visualstudio.com');
  assert.strictEqual(uri.path, '/items');
  assert.strictEqual(uri.query, 'itemName=ms-python.python');
  assert.strictEqual(uri.fragment, 'overview');
});

test('Uri.with returns modified URI copy', () => {
  const base = vscode.Uri.file('C:\\test\\file.txt');
  const modified = base.with({ path: '/new/path.txt' });
  assert.strictEqual(modified.path, '/new/path.txt');
  assert.strictEqual(base.path !== modified.path, true);
});

test('Uri.toJSON produces $mid: 1 VS Code serialization', () => {
  const uri = vscode.Uri.file('C:\\project\\file.ts');
  const json = uri.toJSON();
  assert.strictEqual(json.$mid, 1);
  assert.strictEqual(json.scheme, 'file');
  assert(json.fsPath);
});

// ----------------------------------------------------
// Test Suite 3: TestItemCollection & Dual-Iteration
// ----------------------------------------------------
console.log('\n--- 3. TestItemCollection & Dual-Iteration ---');

const ctrl = vscode.tests.createTestController('pythonTest', 'Python Tests');
test('TestController has items of type TestItemCollection', () => {
  assert(ctrl.items);
  assert.strictEqual(typeof ctrl.items.add, 'function');
  assert.strictEqual(typeof ctrl.items.replace, 'function');
  assert.strictEqual(typeof ctrl.items.get, 'function');
  assert.strictEqual(typeof ctrl.items.delete, 'function');
});

test('Spread on empty controller.items evaluates to empty array', () => {
  const arr = [...ctrl.items];
  assert.deepStrictEqual(arr, []);
});

test('add and size update TestItemCollection', () => {
  const item1 = ctrl.createTestItem('test_suite_1', 'Test Suite 1');
  const item2 = ctrl.createTestItem('test_suite_2', 'Test Suite 2');
  ctrl.items.add(item1);
  ctrl.items.add(item2);
  assert.strictEqual(ctrl.items.size, 2);
  assert.strictEqual(ctrl.items.get('test_suite_1').label, 'Test Suite 1');
});

test('Dual-Iteration: Destructuring [id, item] works', () => {
  const ids = [];
  const labels = [];
  for (const [id, item] of ctrl.items) {
    ids.push(id);
    labels.push(item.label);
  }
  assert.deepStrictEqual(ids, ['test_suite_1', 'test_suite_2']);
  assert.deepStrictEqual(labels, ['Test Suite 1', 'Test Suite 2']);
});

test('Dual-Iteration: Direct item loop (for const item of ctrl.items) works', () => {
  const directLabels = [];
  for (const item of ctrl.items) {
    directLabels.push(item.label);
  }
  assert.deepStrictEqual(directLabels, ['Test Suite 1', 'Test Suite 2']);
});

test('Spread syntax [...ctrl.items] works without Symbol.iterator error', () => {
  const spread = [...ctrl.items];
  assert.strictEqual(spread.length, 2);
  assert.strictEqual(spread[0][0], 'test_suite_1');
  assert.strictEqual(spread[0].label, 'Test Suite 1');
});

test('new Map(ctrl.items) works seamlessly', () => {
  const map = new Map(ctrl.items);
  assert.strictEqual(map.size, 2);
  assert(map.has('test_suite_1'));
});

// ----------------------------------------------------
// Test Suite 4: DiagnosticCollection & WorkspaceEdit
// ----------------------------------------------------
console.log('\n--- 4. DiagnosticCollection & WorkspaceEdit ---');

const diags = vscode.languages.createDiagnosticCollection('testDiag');
test('DiagnosticCollection is iterable', () => {
  assert.strictEqual(typeof diags[Symbol.iterator], 'function');
  assert.deepStrictEqual([...diags], []);
});

test('DiagnosticCollection.set and forEach work', () => {
  const docUri = vscode.Uri.file('C:\\test\\doc.ts');
  const d = new vscode.Diagnostic(
    new vscode.Range(0, 0, 0, 5),
    'Syntax error',
    vscode.DiagnosticSeverity.Error
  );
  diags.set(docUri, [d]);
  assert.strictEqual(diags.has(docUri), true);

  let iterated = 0;
  for (const [uri, list] of diags) {
    iterated++;
    assert.strictEqual(list.length, 1);
  }
  assert.strictEqual(iterated, 1);

  diags.dispose();
  assert.strictEqual(diags.has(docUri), false);
});

test('WorkspaceEdit supports document edits, file operations, and iteration', () => {
  const edit = new vscode.WorkspaceEdit();
  const fileUri = vscode.Uri.file('C:\\test\\doc.ts');
  edit.insert(fileUri, new vscode.Position(1, 0), '// comment\n');
  edit.createFile(vscode.Uri.file('C:\\test\\newfile.ts'), { ignoreIfExists: true });

  assert.strictEqual(edit.size, 2);
  assert.strictEqual(edit.has(fileUri), true);

  const entries = [...edit];
  assert.strictEqual(entries.length, 1);
});

// ----------------------------------------------------
// Test Suite 5: Workspace.fs & Resilient Proxies
// ----------------------------------------------------
console.log('\n--- 5. Workspace.fs & Resilient Proxies ---');

test('workspace.fs is defined and provides file operations', () => {
  assert(vscode.workspace.fs);
  assert.strictEqual(typeof vscode.workspace.fs.readFile, 'function');
  assert.strictEqual(typeof vscode.workspace.fs.writeFile, 'function');
  assert.strictEqual(typeof vscode.workspace.fs.stat, 'function');
  assert.strictEqual(typeof vscode.workspace.fs.readDirectory, 'function');
});

test('Resilient proxy returns empty iterable on unknown sub-objects', () => {
  // Access non-existent API
  const nonExistent = vscode.unimplementedNamespace;
  assert.strictEqual(typeof nonExistent[Symbol.iterator], 'function');
  const arr = [...nonExistent];
  assert.deepStrictEqual(arr, []);
});

test('FileType enum is exported', () => {
  assert.strictEqual(vscode.FileType.File, 1);
  assert.strictEqual(vscode.FileType.Directory, 2);
});

console.log('\n========================================');
console.log(`📊 Compatibility Test Results: ${passedCount} Passed, 0 Failed`);
console.log('========================================\n');
