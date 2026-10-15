import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { VSCodeExtensionManifestParser } from '../electron/main/services/extensions/VSCodeExtensionManifestParser';
import { ExtensionRegistry } from '../electron/main/services/extensions/ExtensionRegistry';

async function main() {
  const targetArg = process.argv[2];

  if (targetArg) {
    // If user provided a specific path to test
    const resolved = path.resolve(targetArg);
    console.log(`\n🔍 Inspecting manifest at: ${resolved}\n`);

    if (!fs.existsSync(resolved)) {
      console.error(`❌ Path not found: ${resolved}`);
      process.exit(1);
    }

    const folder = fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
    const manifestFile = fs.statSync(resolved).isFile() ? resolved : undefined;

    const result = VSCodeExtensionManifestParser.parseAndValidate(folder, manifestFile);

    console.log('--- Parse Result ---');
    console.log('Status:', result.valid ? '✅ VALID MANIFEST' : '❌ INVALID / REJECTED');
    if (result.errorCode) {
      console.log('Error Code:', result.errorCode);
    }
    if (result.errors.length > 0) {
      console.log('Errors / Rejections:');
      result.errors.forEach((err) => console.log('  -', err));
    }

    if (result.manifest) {
      console.log('\n--- Normalized Metadata ---');
      console.log('Extension ID:', result.manifest.id);
      console.log('Publisher:', result.manifest.publisher);
      console.log('Name:', result.manifest.name);
      console.log('Display Name:', result.manifest.displayName);
      console.log('Version:', result.manifest.version);
      console.log('Extension Type:', result.manifest.extensionType);
      console.log('VS Code Compatibility:', result.manifest.compatibility);
      console.log('Main Runtime:', result.manifest.main || '(none)');
      console.log('Browser Runtime:', result.manifest.browser || '(none)');
      console.log('Activation Events:', result.manifest.activationEvents);
      console.log('Categories:', result.manifest.categories);
      console.log('Contributed Points:', Object.keys(result.manifest.contributes || {}));
      if (result.manifest.contributes.commands) {
        console.log('Contributed Commands:', result.manifest.contributes.commands.map((c: any) => c.command));
      }
      if (result.manifest.contributes.themes) {
        console.log('Contributed Themes:', result.manifest.contributes.themes.map((t: any) => t.label));
      }
    }
    process.exit(0);
  }

  // Interactive Multi-Scenario Demonstration if no path argument was passed
  console.log('===============================================================');
  console.log('🔬 VS CODE MANIFEST PARSER & REGISTRY LIVE TEST SUITE');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // SCENARIO 1: Parsing a Real Installed Extension (Pyrefly)
  // -------------------------------------------------------------
  console.log('📌 SCENARIO 1: Parsing Real Extension on your machine');
  const pyreflyPath = path.join(os.homedir(), '.binary', 'extensions', 'meta.pyrefly-1.3.0');
  if (fs.existsSync(pyreflyPath)) {
    const res = VSCodeExtensionManifestParser.parseAndValidate(pyreflyPath);
    console.log('  Target:', pyreflyPath);
    console.log('  Valid:', res.valid ? '✅ YES' : '❌ NO');
    console.log('  Extension ID:', res.manifest?.id);
    console.log('  Detected Type:', res.manifest?.extensionType);
    console.log('  VS Code Engine Required:', res.manifest?.compatibility.requiredVSCodeVersion);
    console.log('  Commands Contributed:', res.manifest?.contributes.commands?.length || 0);
    console.log('  Activation Events:', res.manifest?.activationEvents);
  } else {
    console.log('  Pyrefly path not found, skipping scenario 1.');
  }

  // -------------------------------------------------------------
  // SCENARIO 2: Testing Validation Rejections (Invalid Version, Missing Fields)
  // -------------------------------------------------------------
  console.log('\n📌 SCENARIO 2: Testing Manifest Validation & Strict SemVer Check');
  const tempDir = path.join(os.tmpdir(), `binary-manifest-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const invalidJsonDir = path.join(tempDir, 'invalid-manifest');
    fs.mkdirSync(invalidJsonDir, { recursive: true });
    fs.writeFileSync(
      path.join(invalidJsonDir, 'package.json'),
      JSON.stringify({
        name: 'broken-extension',
        // Missing publisher!
        version: 'v1.0.beta.999-invalid!!', // Invalid SemVer!
      })
    );

    const invalidRes = VSCodeExtensionManifestParser.parseAndValidate(invalidJsonDir);
    console.log('  Target: Manifest with missing publisher & invalid version');
    console.log('  Valid:', invalidRes.valid ? '✅ YES' : '❌ REJECTED AS EXPECTED');
    console.log('  Errors Detected:');
    invalidRes.errors.forEach((err) => console.log('   -', err));

    // -------------------------------------------------------------
    // SCENARIO 3: Security Attack Test (Path Traversal Rejection)
    // -------------------------------------------------------------
    console.log('\n📌 SCENARIO 3: Security Validation — Path Traversal Attack');
    const attackDir = path.join(tempDir, 'attack-manifest');
    fs.mkdirSync(attackDir, { recursive: true });
    fs.writeFileSync(
      path.join(attackDir, 'package.json'),
      JSON.stringify({
        name: 'malicious-plugin',
        publisher: 'blackhat',
        version: '1.0.0',
        main: '../../../../../../Windows/System32/cmd.exe', // Attack path
      })
    );

    const attackRes = VSCodeExtensionManifestParser.parseAndValidate(attackDir);
    console.log('  Target: Manifest trying to escape extension directory via main: "../../../../Windows/cmd.exe"');
    console.log('  Valid:', attackRes.valid ? '❌ FAILED TO BLOCK' : '🛡️ BLOCKED BY SECURITY SHIELD');
    console.log('  Security Error Code:', attackRes.errorCode);
    console.log('  Security Error Detail:', attackRes.errors[0]);

    // -------------------------------------------------------------
    // SCENARIO 4: Registry Atomic Transaction & Querying
    // -------------------------------------------------------------
    console.log('\n📌 SCENARIO 4: Extension Registry Operations');
    const customRegistryDir = path.join(tempDir, 'custom-registry');
    const customReg = new ExtensionRegistry(customRegistryDir);
    await customReg.initialize();

    console.log('  1. Registry initialized at:', customReg.rootDir);
    console.log('  2. Partitions verified:');
    console.log('     - installed/:', fs.existsSync(customReg.installedDir) ? '✅' : '❌');
    console.log('     - staging/:', fs.existsSync(customReg.stagingDir) ? '✅' : '❌');
    console.log('     - disabled/:', fs.existsSync(customReg.disabledDir) ? '✅' : '❌');
    console.log('     - registry.json:', fs.existsSync(customReg.registryPath) ? '✅' : '❌');

    // Register dummy entry
    customReg.register({
      id: 'testpub.my-demo-extension',
      publisher: 'testpub',
      name: 'my-demo-extension',
      displayName: 'Demo Extension',
      version: '1.0.0',
      description: 'Testing registry storage',
      installPath: customReg.installedDir,
      enabled: true,
      state: 'installed',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manifestValid: true,
      extensionType: 'node',
    });

    console.log('  3. Registered: testpub.my-demo-extension');
    console.log('     Has extension (case-insensitive TESTPUB.MY-DEMO-EXTENSION):', customReg.has('TESTPUB.MY-DEMO-EXTENSION') ? '✅ YES' : '❌ NO');

    // Disable
    customReg.disable('testpub.my-demo-extension');
    console.log('  4. Disabled: testpub.my-demo-extension -> state:', customReg.get('testpub.my-demo-extension')?.state);

    // Enable
    customReg.enable('testpub.my-demo-extension');
    console.log('  5. Enabled: testpub.my-demo-extension -> state:', customReg.get('testpub.my-demo-extension')?.state);

    // Check Backup
    console.log('  6. Crash Recovery Backup Created (registry.json.bak):', fs.existsSync(customReg.backupPath) ? '✅ YES' : '❌ NO');

  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n===============================================================');
  console.log('✨ All tests completed! You can also pass any folder or package.json:');
  console.log('   npm run parse:manifest -- <path-to-folder>');
  console.log('===============================================================\n');
}

main().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
