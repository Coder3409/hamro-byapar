import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const webPort = 4173;
const apiPort = Number(process.env.EMAIL_SERVER_PORT || 4175);

function portAvailable(port) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, '127.0.0.1');
  });
}

const [webAvailable, apiAvailable] = await Promise.all([
  portAvailable(webPort),
  portAvailable(apiPort),
]);

if (!webAvailable || !apiAvailable) {
  const blocked = [!webAvailable && webPort, !apiAvailable && apiPort].filter(Boolean).join(', ');
  console.error(`\n[Hamro Byapar] Cannot start because port${blocked.includes(',') ? 's' : ''} ${blocked} ${blocked.includes(',') ? 'are' : 'is'} already in use.`);
  console.error('[Hamro Byapar] Stop the previous dev terminal with Ctrl+C, then run this command again.\n');
  process.exit(1);
}

const processes = [
  spawn(process.execPath, ['server/index.js'], {
    cwd: projectRoot,
    stdio: 'inherit',
  }),
  spawn(process.execPath, [viteCli, '--host', '0.0.0.0', '--port', String(webPort), '--strictPort', '--configLoader', 'native'], {
    cwd: projectRoot,
    stdio: 'inherit',
  }),
];

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
  process.exitCode = exitCode;
}

for (const child of processes) {
  child.on('error', (error) => {
    console.error(`[Hamro Byapar] Could not start a development process: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping && signal !== 'SIGTERM') stop(code || 1);
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
