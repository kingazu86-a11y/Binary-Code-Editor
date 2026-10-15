import { execSync } from 'child_process';

try {
  const output = execSync('netstat -ano -p tcp', { encoding: 'utf-8' });
  const lines = output.split('\n');
  const pids = new Set();

  for (const line of lines) {
    if (line.includes(':5173') && line.includes('LISTENING')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(parseInt(pid, 10))) {
        pids.add(pid);
      }
    }
  }

  for (const pid of pids) {
    console.log(`Killing process ${pid} on port 5173...`);
    try {
      execSync(`taskkill /F /PID ${pid}`);
    } catch {}
  }
} catch (e) {
  console.log('No process found or error checking port.');
}
