import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { VSCodeExtensionManifestParser } from '../electron/main/services/extensions/VSCodeExtensionManifestParser';
import { ExtensionRegistry } from '../electron/main/services/extensions/ExtensionRegistry';

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 Starting Extension Registry & Parser Tests');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  const testTempDir = path.join(os.tmpdir(), `binary-test-extensions-${Date.now()}`);
  fs.mkdirSync(testTempDir, { recursive: true });

  try {
    // ----------------------------------------------------
    // TEST SUITE 1: Manifest Parser - Standard VS Code Manifest
    // ----------------------------------------------------
    console.log('\n--- 1. Standard VS Code Extension Parsing ---');
    const validExtDir = path.join(testTempDir, 'valid-ext');
    fs.mkdirSync(validExtDir, { recursive: true });
    fs.writeFileSync(path.join(validExtDir, 'index.js'), 'module.exports = {};');
    fs.writeFileSync(
      path.join(validExtDir, 'package.json'),
      JSON.stringify({
        name: 'prettier-vscode',
        publisher: 'esbenp',
        version: '10.1.0',
        displayName: 'Prettier - Code formatter',
        description: 'Code formatter using prettier',
        main: './index.js',
        engines: {
          vscode: '^1.75.0',
        },
        contributes: {
          commands: [{ command: 'prettier.format', title: 'Format Document' }],
        },
      })
    );

    const parseResult = VSCodeExtensionManifestParser.parseAndValidate(validExtDir);
    assert(parseResult.valid === true, 'Valid manifest parsed successfully');
    assert(parseResult.manifest?.id === 'esbenp.prettier-vscode', 'VS Code ID constructed as publisher.name');
    assert(parseResult.manifest?.version === '10.1.0', 'Version parsed');
    assert(parseResult.manifest?.compatibility.requiredVSCodeVersion === '^1.75.0', 'Engines.vscode parsed');
    assert(parseResult.manifest?.extensionType === 'node', 'Extension type detected as node');
    assert(parseResult.manifest?.contributes.commands?.[0].command === 'prettier.format', 'Commands contributed');

    // ----------------------------------------------------
    // TEST SUITE 2: Security & Path Traversal Prevention
    // ----------------------------------------------------
    console.log('\n--- 2. Security & Path Traversal (EXTENSION_PATH_TRAVERSAL) ---');

    // Case 2a: Relative traversal in main
    const traversalExtDir = path.join(testTempDir, 'traversal-ext');
    fs.mkdirSync(traversalExtDir, { recursive: true });
    fs.writeFileSync(
      path.join(traversalExtDir, 'package.json'),
      JSON.stringify({
        name: 'evil-ext',
        publisher: 'attacker',
        version: '1.0.0',
        main: '../../../../Windows/System32/cmd.exe',
      })
    );

    const traversalRes = VSCodeExtensionManifestParser.parseAndValidate(traversalExtDir);
    assert(traversalRes.valid === false, 'Traversal manifest rejected');
    assert(traversalRes.errorCode === 'EXTENSION_PATH_TRAVERSAL', 'Emits EXTENSION_PATH_TRAVERSAL error code for relative ..');

    // Case 2b: Absolute path in main
    const absPathExtDir = path.join(testTempDir, 'abs-path-ext');
    fs.mkdirSync(absPathExtDir, { recursive: true });
    fs.writeFileSync(
      path.join(absPathExtDir, 'package.json'),
      JSON.stringify({
        name: 'abs-path-ext',
        publisher: 'attacker',
        version: '1.0.0',
        main: 'C:\\Windows\\System32\\cmd.exe',
      })
    );

    const absRes = VSCodeExtensionManifestParser.parseAndValidate(absPathExtDir);
    assert(absRes.valid === false, 'Absolute path manifest rejected');
    assert(absRes.errorCode === 'EXTENSION_PATH_TRAVERSAL', 'Emits EXTENSION_PATH_TRAVERSAL error code for absolute path');

    // Case 2c: Traversal in contributes.themes
    const themeTraversalDir = path.join(testTempDir, 'theme-traversal-ext');
    fs.mkdirSync(themeTraversalDir, { recursive: true });
    fs.writeFileSync(
      path.join(themeTraversalDir, 'package.json'),
      JSON.stringify({
        name: 'theme-traversal',
        publisher: 'attacker',
        version: '1.0.0',
        contributes: {
          themes: [{ label: 'Malicious Theme', path: '../../../../etc/shadow' }],
        },
      })
    );

    const themeRes = VSCodeExtensionManifestParser.parseAndValidate(themeTraversalDir);
    assert(themeRes.valid === false, 'Theme path traversal rejected');
    assert(themeRes.errorCode === 'EXTENSION_PATH_TRAVERSAL', 'Emits EXTENSION_PATH_TRAVERSAL error code for themes[]');

    // ----------------------------------------------------
    // TEST SUITE 3: Extension Type Detection
    // ----------------------------------------------------
    console.log('\n--- 3. Extension Type Detection ---');

    // Theme only
    const themeOnlyDir = path.join(testTempDir, 'theme-only');
    fs.mkdirSync(themeOnlyDir, { recursive: true });
    fs.writeFileSync(
      path.join(themeOnlyDir, 'package.json'),
      JSON.stringify({
        name: 'catppuccin',
        publisher: 'catppuccin',
        version: '1.0.0',
        contributes: {
          themes: [{ label: 'Catppuccin Mocha', uiTheme: 'vs-dark', path: './themes/mocha.json' }],
        },
      })
    );
    const themeOnlyRes = VSCodeExtensionManifestParser.parseAndValidate(themeOnlyDir);
    assert(themeOnlyRes.manifest?.extensionType === 'theme', 'Detects theme extension type');

    // ----------------------------------------------------
    // TEST SUITE 4: Extension Registry Atomic Persistence & Schema
    // ----------------------------------------------------
    console.log('\n--- 4. Extension Registry Layout & Atomic Saves ---');
    const registryRootDir = path.join(testTempDir, 'registry-root');
    const registry = new ExtensionRegistry(registryRootDir);

    await registry.initialize();
    assert(fs.existsSync(registry.installedDir), 'installed/ directory created');
    assert(fs.existsSync(registry.stagingDir), 'staging/ directory created');
    assert(fs.existsSync(registry.disabledDir), 'disabled/ directory created');
    assert(fs.existsSync(registry.quarantineDir), 'quarantine/ directory created');
    assert(fs.existsSync(registry.registryPath), 'registry.json created');

    // Register an entry
    registry.register({
      id: 'esbenp.prettier-vscode',
      publisher: 'esbenp',
      name: 'prettier-vscode',
      displayName: 'Prettier - Code formatter',
      version: '10.1.0',
      description: 'Code formatter',
      installPath: validExtDir,
      enabled: true,
      state: 'installed',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manifestValid: true,
      extensionType: 'node',
    });

    assert(registry.has('esbenp.prettier-vscode'), 'Entry registered and found');
    assert(registry.has('ESBENP.PRETTIER-VSCODE'), 'Lookup is case-insensitive');

    // Check backup creation after multiple saves
    assert(fs.existsSync(registry.backupPath), 'registry.json.bak exists for crash recovery');

    // Enable / Disable
    registry.disable('esbenp.prettier-vscode');
    assert(registry.get('esbenp.prettier-vscode')?.enabled === false, 'Extension disabled in registry');
    assert(registry.get('esbenp.prettier-vscode')?.state === 'disabled', 'State updated to disabled');

    registry.enable('esbenp.prettier-vscode');
    assert(registry.get('esbenp.prettier-vscode')?.enabled === true, 'Extension enabled in registry');

    // ----------------------------------------------------
    // TEST SUITE 5: Staging Promotion & Reconciliation
    // ----------------------------------------------------
    console.log('\n--- 5. Staging Promotion & Atomic Commit ---');
    const stageDir = path.join(registry.stagingDir, 'staging-temp-test');
    fs.mkdirSync(stageDir, { recursive: true });
    fs.writeFileSync(path.join(stageDir, 'index.js'), 'module.exports = {};');
    fs.writeFileSync(
      path.join(stageDir, 'package.json'),
      JSON.stringify({
        name: 'sample-ext',
        publisher: 'binary-team',
        version: '2.0.0',
        displayName: 'Sample Extension',
        main: './index.js',
      })
    );

    const stageParse = VSCodeExtensionManifestParser.parseAndValidate(stageDir);
    assert(stageParse.valid && !!stageParse.manifest, 'Staged manifest valid');

    const promoted = await registry.promoteFromStaging(stageDir, stageParse.manifest!);
    assert(promoted.id === 'binary-team.sample-ext', 'Promoted extension has valid ID');
    assert(fs.existsSync(promoted.installPath), 'Extension moved to installed/ partition');
    assert(!fs.existsSync(stageDir), 'Staging directory cleanly cleaned');
    assert(registry.has('binary-team.sample-ext'), 'Promoted extension is in registry');

    // ----------------------------------------------------
    // TEST SUITE 6: SemVer Comparison
    // ----------------------------------------------------
    console.log('\n--- 6. SemVer Comparison ---');
    assert(ExtensionRegistry.compareVersions('1.2.3', '1.2.0') === 1, '1.2.3 > 1.2.0');
    assert(ExtensionRegistry.compareVersions('1.0.0', '1.0.0') === 0, '1.0.0 === 1.0.0');
    assert(ExtensionRegistry.compareVersions('2.0.0', '2.1.0') === -1, '2.0.0 < 2.1.0');

    // ----------------------------------------------------
    // TEST SUITE 7: Reconcile Existing Extensions in ~/.binary/extensions
    // ----------------------------------------------------
    console.log('\n--- 7. Reconcile Real User System Extensions ---');
    const realUserExtDir = path.join(os.homedir(), '.binary', 'extensions');
    if (fs.existsSync(realUserExtDir)) {
      const liveRegistry = new ExtensionRegistry(realUserExtDir);
      await liveRegistry.initialize();
      const liveList = liveRegistry.list();
      console.log(`  Found ${liveList.length} extensions in user's live directory:`);
      for (const e of liveList) {
        console.log(`    - [${e.state}] ${e.id} v${e.version} (${e.displayName})`);
      }
      assert(liveList.length >= 1, 'Live user directory successfully reconciled');
    }

  } finally {
    // Cleanup temporary test directory
    try {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n========================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal error during test run:', e);
  process.exit(1);
});
