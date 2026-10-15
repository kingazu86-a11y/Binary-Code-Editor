import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function patchNodePty() {
  const libAgentPath = path.join(rootDir, 'node_modules', 'node-pty', 'lib', 'conpty_console_list_agent.js');

  if (!fs.existsSync(libAgentPath)) {
    console.log('[Patch node-pty] node-pty not found in node_modules, skipping.');
    return;
  }

  let content = fs.readFileSync(libAgentPath, 'utf8');

  // Check if already patched
  if (content.includes('// Process already exited, detached, or console unavailable') || content.includes('consoleProcessList = [shellPid]')) {
    console.log('[Patch node-pty] conpty_console_list_agent.js is already patched.');
    return;
  }

  const patchedContent = `"use strict";
/**
 * Copyright (c) 2019, Microsoft Corporation (MIT License).
 * Patched to prevent "Error: AttachConsole failed" on terminated or detached processes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var shellPid = parseInt(process.argv[2], 10);
var consoleProcessList = [];
try {
    var getConsoleProcessList = utils_1.loadNativeModule('conpty_console_list').module.getConsoleProcessList;
    consoleProcessList = getConsoleProcessList(shellPid);
} catch (err) {
    // Process already exited, detached, or console unavailable
    consoleProcessList = [shellPid];
}
if (process.send) {
    process.send({ consoleProcessList: consoleProcessList });
}
process.exit(0);
//# sourceMappingURL=conpty_console_list_agent.js.map
`;

  fs.writeFileSync(libAgentPath, patchedContent, 'utf8');
  console.log('[Patch node-pty] Successfully patched node-pty conpty_console_list_agent.js');

  // Also patch src if present
  const srcAgentPath = path.join(rootDir, 'node_modules', 'node-pty', 'src', 'conpty_console_list_agent.ts');
  if (fs.existsSync(srcAgentPath)) {
    const srcPatched = `/**
 * Copyright (c) 2019, Microsoft Corporation (MIT License).
 * Patched to prevent "Error: AttachConsole failed" on terminated or detached processes.
 */

import { loadNativeModule } from './utils';

const shellPid = parseInt(process.argv[2], 10);
let consoleProcessList: number[] = [];
try {
  const getConsoleProcessList = loadNativeModule('conpty_console_list').module.getConsoleProcessList;
  consoleProcessList = getConsoleProcessList(shellPid);
} catch (err) {
  // Process already exited, detached, or console unavailable
  consoleProcessList = [shellPid];
}
if (process.send) {
  process.send({ consoleProcessList });
}
process.exit(0);
`;
    fs.writeFileSync(srcAgentPath, srcPatched, 'utf8');
  }
}

// Run directly if executed as script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  patchNodePty();
}
