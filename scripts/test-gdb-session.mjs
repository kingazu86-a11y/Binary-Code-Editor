import fs from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { toolchainService } from '../dist-electron/main/services/toolchain/ToolchainService.js';
import { gdbSession } from '../dist-electron/main/services/debugger/GdbSession.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const toolRoot = path.join(root, 'resources/toolchains/windows-x64');
const gpp = path.join(toolRoot, 'bin/g++.exe');
const testCpp = path.join(root, 'resources/test_debug.cpp');
const testExe = path.join(root, 'resources/test_debug.exe');

const code = `#include <iostream>

int calculateSquare(int val) {
    int sq = val * val;
    return sq; // Line 6
}

int main() {
    int x = 7;
    int y = calculateSquare(x); // Line 11
    std::cout << "Result: " << y << std::endl;
    return 0;
}
`;

fs.writeFileSync(testCpp, code, 'utf-8');

const env = {
  ...process.env,
  PATH: `${path.join(toolRoot, 'bin')};${path.join(toolRoot, 'lib')};${process.env.PATH || ''}`,
  MINGW_PREFIX: toolRoot,
};

console.log('=== Compiling test_debug.cpp with -g3 ===');
const build = spawnSync(gpp, [testCpp, '-o', testExe, '-g3', '-O0'], { env, stdio: 'inherit' });
if (build.status !== 0) {
  console.error('Failed to compile debug test.');
  process.exit(1);
}

console.log('=== Testing GDB MI Session ===');
async function runGdbTest() {
  gdbSession.on('output', (data) => console.log(`[GDB ${data.type}]`, data.text.trim()));

  let hitBreakpoint = false;
  let inspectedVars = false;

  gdbSession.on('stopped', async (event) => {
    console.log('[GDB STOPPED EVENT]:', event);
    if (event.reason === 'breakpoint-hit') {
      hitBreakpoint = true;
      console.log('--> Hit breakpoint at Line', event.line, 'Func:', event.functionName);

      const stack = await gdbSession.getCallStack();
      console.log('--> Call Stack:', JSON.stringify(stack));

      const vars = await gdbSession.getVariables();
      console.log('--> Local Variables:', JSON.stringify(vars));
      inspectedVars = vars.length > 0;

      const evalVal = await gdbSession.evaluateExpression('x');
      console.log('--> Evaluated expression "x":', evalVal);

      console.log('--> Stepping over (next)...');
      await gdbSession.next();
    } else if (event.reason === 'step-end') {
      console.log('--> Stepped to Line', event.line);
      const vars = await gdbSession.getVariables();
      console.log('--> Variables after step:', JSON.stringify(vars));

      console.log('--> Continuing to end...');
      await gdbSession.continue();
    }
  });

  gdbSession.on('terminated', (data) => {
    console.log('--> Session terminated with exitCode:', data.exitCode);
    console.log('--> GDB TEST PASSED:', hitBreakpoint && inspectedVars);

    // Cleanup
    if (fs.existsSync(testCpp)) fs.unlinkSync(testCpp);
    if (fs.existsSync(testExe)) fs.unlinkSync(testExe);
    process.exit(0);
  });

  await gdbSession.startSession(testExe, [], root);
  await gdbSession.setBreakpoint(testCpp, 11);
  await gdbSession.run();
}

runGdbTest().catch((err) => {
  console.error('GDB Test Error:', err);
  process.exit(1);
});
