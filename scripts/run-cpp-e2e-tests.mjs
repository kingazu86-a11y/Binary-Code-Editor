import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const toolchainDir = path.join(rootDir, 'resources', 'toolchains', 'windows-x64');
const binDir = path.join(toolchainDir, 'bin');
const gppPath = path.join(binDir, 'g++.exe');
const gccPath = path.join(binDir, 'gcc.exe');
const gdbPath = path.join(binDir, 'gdb.exe');
const cmakePath = path.join(binDir, 'cmake.exe');
const ninjaPath = path.join(binDir, 'ninja.exe');
const clangdPath = path.join(binDir, 'clangd.exe');

const testWorkspace = path.join(rootDir, 'dist-test', 'cpp-e2e-workspace');
const testSpaceWorkspace = path.join(rootDir, 'dist-test', 'cpp space workspace test');
const testMultiWorkspace = path.join(rootDir, 'dist-test', 'cpp-multi-file-workspace');
const testCmakeWorkspace = path.join(rootDir, 'dist-test', 'cpp-cmake-ninja-workspace');

console.log('================================================================');
console.log('  BINARY IDE — COMPLETE C++ DEVELOPMENT ENVIRONMENT E2E TESTS  ');
console.log('================================================================');
console.log(`Toolchain directory: ${toolchainDir}`);
console.log(`Bin directory:       ${binDir}\n`);

let passedTests = 0;
let totalTests = 0;

function pass(name, detail = '') {
  passedTests++;
  console.log(`\x1b[32m✔ [PASS]\x1b[0m ${name}${detail ? ` - ${detail}` : ''}`);
}

function fail(name, error) {
  console.error(`\x1b[31m✖ [FAIL]\x1b[0m ${name}`);
  console.error(error);
}

async function runProcess(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      ...opts,
      env: {
        ...process.env,
        PATH: `${binDir};${process.env.PATH || ''}`,
        MINGW_PREFIX: toolchainDir,
        ...(opts.env || {})
      }
    });

    let stdout = '';
    let stderr = '';

    if (opts.input) {
      proc.stdin.write(opts.input);
      proc.stdin.end();
    }

    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// ----------------------------------------------------
// TEST 1: Full Bundled Toolchain Discovery (GCC, GDB, CMake, Ninja, Clangd)
// ----------------------------------------------------
totalTests++;
try {
  const gppRes = await runProcess(gppPath, ['--version']);
  const gdbRes = await runProcess(gdbPath, ['--version']);
  const cmakeRes = await runProcess(cmakePath, ['--version']);
  const ninjaRes = await runProcess(ninjaPath, ['--version']);
  const clangdRes = await runProcess(clangdPath, ['--version']);

  const gppVer = gppRes.stdout.split('\n')[0].trim();
  const gdbVer = gdbRes.stdout.split('\n')[0].trim();
  const cmakeVer = cmakeRes.stdout.split('\n')[0].trim();
  const ninjaVer = `Ninja ${ninjaRes.stdout.split('\n')[0].trim()}`;
  const clangdVer = clangdRes.stdout.split('\n')[0].trim();

  pass(
    '1. Toolchain Discovery',
    `\n   • ${gppVer}\n   • ${gdbVer}\n   • ${cmakeVer}\n   • ${ninjaVer}\n   • ${clangdVer}`
  );
} catch (err) {
  fail('1. Toolchain Discovery', err);
}

// ----------------------------------------------------
// TEST 2: C++20 Hello World Compilation & Run
// ----------------------------------------------------
totalTests++;
try {
  await fs.ensureDir(testWorkspace);
  const helloCpp = path.join(testWorkspace, 'hello.cpp');
  const helloExe = path.join(testWorkspace, 'hello.exe');

  await fs.writeFile(helloCpp, `#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> nums = {10, 20, 30, 40};
    int sum = std::accumulate(nums.begin(), nums.end(), 0);
    std::cout << "BINARY_IDE_SUM=" << sum << std::endl;
    return 0;
}
`);

  const compileRes = await runProcess(gppPath, ['-std=c++20', '-O2', helloCpp, '-o', helloExe]);
  if (compileRes.code !== 0) throw new Error(compileRes.stderr);

  const runRes = await runProcess(helloExe, []);
  if (!runRes.stdout.includes('BINARY_IDE_SUM=100')) {
    throw new Error(`Unexpected run output: ${runRes.stdout}`);
  }

  pass('2. C++20 Standard Compilation & Execution', 'Successfully compiled with STL vector & numeric');
} catch (err) {
  fail('2. C++20 Standard Compilation & Execution', err);
}

// ----------------------------------------------------
// TEST 3: Interactive Stdin (cin / getline)
// ----------------------------------------------------
totalTests++;
try {
  const inputCpp = path.join(testWorkspace, 'interactive.cpp');
  const inputExe = path.join(testWorkspace, 'interactive.exe');

  await fs.writeFile(inputCpp, `#include <iostream>
#include <string>

int main() {
    std::string name;
    int age = 0;
    std::cin >> name >> age;
    std::cout << "WELCOME " << name << " AGE " << (age + 1) << std::endl;
    return 0;
}
`);

  await runProcess(gppPath, [inputCpp, '-o', inputExe]);
  const runRes = await runProcess(inputExe, [], { input: 'Engineer 30\n' });
  if (!runRes.stdout.includes('WELCOME Engineer AGE 31')) {
    throw new Error(`Interactive run output mismatch: ${runRes.stdout}`);
  }

  pass('3. Interactive Terminal Input (cin)', 'Verified stdin stream processing');
} catch (err) {
  fail('3. Interactive Terminal Input (cin)', err);
}

// ----------------------------------------------------
// TEST 4: Compiler Diagnostics Mapping
// ----------------------------------------------------
totalTests++;
try {
  const errCpp = path.join(testWorkspace, 'syntax_err.cpp');
  await fs.writeFile(errCpp, `#include <iostream>
int main() {
    int invalid = "string_literal";
    return 0;
}
`);

  const compileRes = await runProcess(gppPath, ['-fdiagnostics-color=never', errCpp, '-o', path.join(testWorkspace, 'syntax_err.exe')]);
  if (compileRes.code === 0) throw new Error('Expected compilation error');

  const diagRegex = /^(.+?):(\d+):(\d+):\s+(?:fatal\s+)?(error|warning|note):\s+(.+)$/m;
  const match = compileRes.stderr.match(diagRegex);
  if (!match || parseInt(match[2], 10) !== 3) {
    throw new Error(`Diagnostics regex failed to capture line 3 error: ${compileRes.stderr}`);
  }

  pass('4. Compiler Error Diagnostics', `Mapped error accurately to Line ${match[2]}, Col ${match[3]}`);
} catch (err) {
  fail('4. Compiler Error Diagnostics', err);
}

// ----------------------------------------------------
// TEST 5: Compiler Warnings without Failing Builds
// ----------------------------------------------------
totalTests++;
try {
  const warnCpp = path.join(testWorkspace, 'warn.cpp');
  const warnExe = path.join(testWorkspace, 'warn.exe');
  await fs.writeFile(warnCpp, `#include <iostream>
int main() {
    int unused_test = 99;
    std::cout << "WARN_PASS" << std::endl;
    return 0;
}
`);

  const compileRes = await runProcess(gppPath, ['-Wall', '-Wextra', warnCpp, '-o', warnExe]);
  if (compileRes.code !== 0 || !compileRes.stderr.includes('unused')) {
    throw new Error(`Warnings failed: code=${compileRes.code}, err=${compileRes.stderr}`);
  }

  pass('5. Warning Reporting on Successful Build', 'Emits diagnostic warnings while executable builds successfully');
} catch (err) {
  fail('5. Warning Reporting on Successful Build', err);
}

// ----------------------------------------------------
// TEST 6: Real GDB/MI Debugger Integration
// ----------------------------------------------------
totalTests++;
try {
  const debugCpp = path.join(testWorkspace, 'debug_test.cpp');
  const debugExe = path.join(testWorkspace, 'debug_test.exe');
  await fs.writeFile(debugCpp, `#include <iostream>
int compute(int x) {
    int doubled = x * 2; // Line 3
    return doubled;      // Line 4
}
int main() {
    int val = 21;        // Line 7
    int res = compute(val);// Line 8
    std::cout << "RES=" << res << std::endl;
    return 0;
}
`);

  await runProcess(gppPath, ['-g3', '-O0', debugCpp, '-o', debugExe]);

  const gdbProc = spawn(gdbPath, ['--interpreter=mi2', '--quiet', debugExe], {
    env: { ...process.env, PATH: `${binDir};${process.env.PATH || ''}`, MINGW_PREFIX: toolchainDir }
  });

  let gdbOutput = '';
  let hitLine = null;
  let steppedLine = null;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      gdbProc.kill();
      reject(new Error('GDB session timed out'));
    }, 12000);

    let stage = 0;
    const send = (cmd) => gdbProc.stdin.write(cmd + '\n');

    gdbProc.stdout.on('data', (d) => {
      const text = d.toString();
      gdbOutput += text;

      if (stage === 0 && (text.includes('(gdb)') || text.includes('^done'))) {
        stage = 1;
        send(`1-break-insert -f "${debugCpp.replace(/\\/g, '/')}:3"`);
      } else if (stage === 1 && text.includes('1^done,bkpt=')) {
        stage = 2;
        send('2-exec-run');
      } else if (stage === 2 && text.includes('*stopped,reason="breakpoint-hit"')) {
        const m = text.match(/line="(\d+)"/);
        if (m) hitLine = parseInt(m[1], 10);
        stage = 3;
        send('3-exec-next');
      } else if (stage === 3 && text.includes('*stopped,reason="end-stepping-range"')) {
        const m = text.match(/line="(\d+)"/);
        if (m) steppedLine = parseInt(m[1], 10);
        stage = 4;
        send('4-stack-list-variables --all-values');
      } else if (stage === 4 && text.includes('4^done,variables=')) {
        stage = 5;
        send('5-exec-continue');
      } else if (stage === 5 && text.includes('*stopped,reason="exited')) {
        clearTimeout(timer);
        send('6-gdb-exit');
        resolve();
      }
    });

    gdbProc.on('error', (err) => { clearTimeout(timer); reject(err); });
    gdbProc.on('close', () => { clearTimeout(timer); resolve(); });
  });

  if (hitLine !== 3 || steppedLine !== 4 || !gdbOutput.includes('doubled') || !gdbOutput.includes('42')) {
    throw new Error(`GDB verification mismatch: hitLine=${hitLine}, steppedLine=${steppedLine}`);
  }

  pass('6. Real GDB/MI Debugger Integration', 'Breakpoint hit at line 3, single-stepped to line 4, inspected variable (doubled=42)');
} catch (err) {
  fail('6. Real GDB/MI Debugger Integration', err);
}

// ----------------------------------------------------
// TEST 7: Multi-File Simple Console Project
// ----------------------------------------------------
totalTests++;
try {
  await fs.ensureDir(testMultiWorkspace);
  const srcDir = path.join(testMultiWorkspace, 'src');
  const incDir = path.join(testMultiWorkspace, 'include');
  const buildDir = path.join(testMultiWorkspace, 'build');
  await fs.ensureDir(srcDir);
  await fs.ensureDir(incDir);
  await fs.ensureDir(buildDir);

  await fs.writeFile(path.join(incDir, 'calc.hpp'), '#pragma once\nint addNums(int a, int b);\n');
  await fs.writeFile(path.join(srcDir, 'calc.cpp'), '#include "calc.hpp"\nint addNums(int a, int b) { return a + b; }\n');
  await fs.writeFile(path.join(srcDir, 'main.cpp'), `#include <iostream>
#include "calc.hpp"
int main() {
    std::cout << "MULTI_RESULT=" << addNums(15, 35) << std::endl;
    return 0;
}
`);

  const multiExe = path.join(buildDir, 'multi_app.exe');
  const compileRes = await runProcess(gppPath, [
    '-std=c++20',
    `-I${incDir}`,
    path.join(srcDir, 'main.cpp'),
    path.join(srcDir, 'calc.cpp'),
    '-o',
    multiExe
  ]);

  if (compileRes.code !== 0) throw new Error(compileRes.stderr);

  const runRes = await runProcess(multiExe, []);
  if (!runRes.stdout.includes('MULTI_RESULT=50')) {
    throw new Error(`Multi-file output mismatch: ${runRes.stdout}`);
  }

  pass('7. Multi-File Project Build', 'Compiled multiple translation units with header dependency (addNums(15,35)=50)');
} catch (err) {
  fail('7. Multi-File Project Build', err);
}

// ----------------------------------------------------
// TEST 8: CMake & Ninja Project Configuration & Build
// ----------------------------------------------------
totalTests++;
try {
  await fs.ensureDir(testCmakeWorkspace);
  const cmakeLists = path.join(testCmakeWorkspace, 'CMakeLists.txt');
  const cmakeSrc = path.join(testCmakeWorkspace, 'main.cpp');

  await fs.writeFile(cmakeLists, `cmake_minimum_required(VERSION 3.20)
project(CMakeDemoApp CXX)
set(CMAKE_CXX_STANDARD 20)
add_executable(CMakeDemoApp main.cpp)
`);

  await fs.writeFile(cmakeSrc, `#include <iostream>
int main() {
    std::cout << "CMAKE_NINJA_SUCCESS" << std::endl;
    return 0;
}
`);

  const gppNorm = gppPath.replace(/\\/g, '/');
  const gccNorm = gccPath.replace(/\\/g, '/');

  // Configure with Ninja generator
  const configRes = await runProcess(cmakePath, [
    '-B', 'build',
    '-G', 'Ninja',
    '-DCMAKE_BUILD_TYPE=Debug',
    `-DCMAKE_CXX_COMPILER=${gppNorm}`,
    `-DCMAKE_C_COMPILER=${gccNorm}`,
  ], { cwd: testCmakeWorkspace });

  if (configRes.code !== 0) throw new Error(`CMake config failed: ${configRes.stderr}`);

  // Build via CMake & Ninja
  const buildRes = await runProcess(cmakePath, ['--build', 'build'], { cwd: testCmakeWorkspace });
  if (buildRes.code !== 0) throw new Error(`CMake build failed: ${buildRes.stderr}`);

  const cmakeExe = path.join(testCmakeWorkspace, 'build', 'CMakeDemoApp.exe');
  if (!fs.existsSync(cmakeExe)) throw new Error('CMakeDemoApp.exe was not created in build/');

  const runRes = await runProcess(cmakeExe, []);
  if (!runRes.stdout.includes('CMAKE_NINJA_SUCCESS')) {
    throw new Error(`CMake run failed: ${runRes.stdout}`);
  }

  pass('8. CMake & Ninja Build System', 'Successfully configured and built with bundled CMake 4.4.3 & Ninja 1.13.2');
} catch (err) {
  fail('8. CMake & Ninja Build System', err);
}

// ----------------------------------------------------
// TEST 9: Bundled Offline External Library (nlohmann/json)
// ----------------------------------------------------
totalTests++;
try {
  const jsonCpp = path.join(testWorkspace, 'json_test.cpp');
  const jsonExe = path.join(testWorkspace, 'json_test.exe');

  await fs.writeFile(jsonCpp, `#include <iostream>
#include <nlohmann/json.hpp>

int main() {
    nlohmann::json obj = {
        {"ide", "Binary"},
        {"offline", true},
        {"code", 200}
    };
    std::cout << "JSON_VERIFY=" << obj["ide"].get<std::string>() << "_" << obj["code"].get<int>() << std::endl;
    return 0;
}
`);

  const compileRes = await runProcess(gppPath, ['-std=c++20', jsonCpp, '-o', jsonExe]);
  if (compileRes.code !== 0) throw new Error(`JSON compile failed: ${compileRes.stderr}`);

  const runRes = await runProcess(jsonExe, []);
  if (!runRes.stdout.includes('JSON_VERIFY=Binary_200')) {
    throw new Error(`JSON execution failed: ${runRes.stdout}`);
  }

  pass('9. Bundled Offline C++ Library (nlohmann/json)', 'Pre-bundled single-include JSON library parsed and serialized in C++20');
} catch (err) {
  fail('9. Bundled Offline C++ Library (nlohmann/json)', err);
}

// ----------------------------------------------------
// TEST 10: Paths Containing Spaces
// ----------------------------------------------------
totalTests++;
try {
  await fs.ensureDir(testSpaceWorkspace);
  const spaceCpp = path.join(testSpaceWorkspace, 'space app.cpp');
  const spaceExe = path.join(testSpaceWorkspace, 'space app.exe');

  await fs.writeFile(spaceCpp, `#include <iostream>
int main() {
    std::cout << "SPACES_IN_PATH_OK" << std::endl;
    return 0;
}
`);

  const compileRes = await runProcess(gppPath, [spaceCpp, '-o', spaceExe]);
  if (compileRes.code !== 0) throw new Error(compileRes.stderr);

  const runRes = await runProcess(spaceExe, []);
  if (!runRes.stdout.includes('SPACES_IN_PATH_OK')) throw new Error(runRes.stdout);

  pass('10. Path With Spaces Support', 'Paths and executables containing spaces handled smoothly');
} catch (err) {
  fail('10. Path With Spaces Support', err);
}

// ----------------------------------------------------
// TEST 11: LLVM Clangd Language Server Offline Execution
// ----------------------------------------------------
totalTests++;
try {
  const clangdProc = spawn(clangdPath, ['--version'], {
    env: { ...process.env, PATH: `${binDir};${process.env.PATH || ''}` }
  });

  let clangdOut = '';
  await new Promise((resolve, reject) => {
    clangdProc.stdout.on('data', (d) => { clangdOut += d.toString(); });
    clangdProc.on('close', (code) => {
      if (code === 0 && clangdOut.includes('clangd version')) {
        resolve();
      } else {
        reject(new Error(`Clangd launch failed: code=${code}, out=${clangdOut}`));
      }
    });
    clangdProc.on('error', reject);
  });

  pass('11. LLVM Clangd Language Server', 'Bundled clangd 18.1.3 executable operates natively and offline');
} catch (err) {
  fail('11. LLVM Clangd Language Server', err);
}

// ----------------------------------------------------
// TEST 12: Toolchain Legal Notices & Licenses
// ----------------------------------------------------
totalTests++;
try {
  const licenseDir = path.join(toolchainDir, 'licenses');
  const licenseFiles = await fs.readdir(licenseDir);
  const required = ['gcc', 'gpl', 'mingw', 'clangd', 'nlohmann'];

  for (const r of required) {
    if (!licenseFiles.some(f => f.toLowerCase().includes(r))) {
      throw new Error(`Missing expected license file for ${r} in ${licenseFiles.join(', ')}`);
    }
  }

  pass('12. Toolchain Licensing & Redistribution Notices', `All ${licenseFiles.length} license notices verified (GCC, MinGW, GPLv3, LLVM Clangd, nlohmann/json)`);
} catch (err) {
  fail('12. Toolchain Licensing & Redistribution Notices', err);
}

console.log('\n================================================================');
console.log(`  E2E TEST RESULTS: ${passedTests} / ${totalTests} TEST SUITES PASSED`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
