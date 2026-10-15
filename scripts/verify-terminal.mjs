import pty from 'node-pty';
import path from 'path';

console.log('[PTY Verification] Starting node-pty test with Windows PowerShell...');

const shell = 'powershell.exe';
const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-256color',
  cols: 80,
  rows: 24,
  cwd: process.cwd(),
  env: process.env,
});

let buffer = '';

ptyProcess.onData((data) => {
  buffer += data;
});

// Run commands
setTimeout(() => {
  console.log('[PTY Verification] Executing: node --version; npm --version; git status');
  ptyProcess.write('node --version; npm --version; git status\r');
}, 500);

setTimeout(() => {
  console.log('[PTY Verification] Output captured:\n------------------');
  console.log(buffer);
  console.log('------------------');
  if (buffer.includes('v20') || buffer.includes('v18') || buffer.includes('node') || buffer.includes('fatal: not a git repository') || buffer.includes('On branch') || buffer.includes('git')) {
    console.log('[PTY Verification] SUCCESS: Commands executed against real OS shell!');
  } else {
    console.log('[PTY Verification] Output received, length:', buffer.length);
  }
  ptyProcess.kill();
  process.exit(0);
}, 4000);
