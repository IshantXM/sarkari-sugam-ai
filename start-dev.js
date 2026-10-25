import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('\x1b[36m=======================================================\x1b[0m');
console.log('\x1b[1m\x1b[33m⚡ Sarkari Sugam AI — Starting Full-Stack Dev Services\x1b[0m');
console.log('\x1b[36m   • Backend API : http://localhost:5005\x1b[0m');
console.log('\x1b[36m   • Frontend App: http://localhost:5173\x1b[0m');
console.log('\x1b[36m=======================================================\x1b[0m\n');

function runService(name, colorCode, cwd, args = ['run', 'dev']) {
  const child = spawn(npmCmd, args, {
    cwd: path.resolve(__dirname, cwd),
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: isWindows,
  });

  const prefix = `\x1b[${colorCode}m[${name}]\x1b[0m `;

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) process.stdout.write(prefix + line + '\n');
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) process.stderr.write(prefix + line + '\n');
    });
  });

  child.on('close', (code) => {
    if (code !== null && code !== 0) {
      console.log(`${prefix} exited with code ${code}`);
    }
  });

  return child;
}

const backend = runService('BACKEND', '34', 'backend');
const frontend = runService('FRONTEND', '32', 'frontend');

function shutdown() {
  console.log('\n\x1b[33m[SYSTEM] Terminating Sarkari Sugam AI services gracefully...\x1b[0m');
  if (isWindows) {
    if (backend.pid) {
      try {
        spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
      } catch {
        // ignore
      }
    }
    if (frontend.pid) {
      try {
        spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
      } catch {
        // ignore
      }
    }
  } else {
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
