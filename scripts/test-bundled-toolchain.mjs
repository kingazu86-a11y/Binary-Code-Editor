import fs from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const toolRoot = path.join(root, 'resources/toolchains/windows-x64');
const gpp = path.join(toolRoot, 'bin/g++.exe');
const gcc = path.join(toolRoot, 'bin/gcc.exe');
const gdb = path.join(toolRoot, 'bin/gdb.exe');
const testCpp = path.join(root, 'resources/test_hello.cpp');
const testExe = path.join(root, 'resources/test_hello.exe');

console.log('=== Checking Bundled Toolchain Files ===');
console.log('g++ exists:', fs.existsSync(gpp));
console.log('gcc exists:', fs.existsSync(gcc));
console.log('gdb exists:', fs.existsSync(gdb));

const code = `#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> nums = {10, 20, 30, 40};
    int total = std::accumulate(nums.begin(), nums.end(), 0);
    std::cout << "TEST_SUCCESS: Sum is " << total << std::endl;
    return 0;
}
`;

fs.writeFileSync(testCpp, code, 'utf-8');

const env = {
  ...process.env,
  PATH: `${path.join(toolRoot, 'bin')};${path.join(toolRoot, 'lib')};${process.env.PATH || ''}`,
  MINGW_PREFIX: toolRoot,
};

console.log('=== Compiling with bundled G++ ===');
const build = spawnSync(gpp, [testCpp, '-o', testExe, '-std=c++20', '-g3', '-Wall', '-Wextra'], {
  env,
  stdio: 'inherit',
});

console.log('Compile exit code:', build.status);
if (build.status === 0 && fs.existsSync(testExe)) {
  console.log('=== Running compiled test executable ===');
  const run = spawnSync(testExe, [], { env, stdio: 'pipe' });
  console.log('Output:', run.stdout.toString());
  console.log('Exit code:', run.status);
} else {
  console.error('Compilation failed!');
}

// Cleanup
if (fs.existsSync(testCpp)) fs.unlinkSync(testCpp);
if (fs.existsSync(testExe)) fs.unlinkSync(testExe);
