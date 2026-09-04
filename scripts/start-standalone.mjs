import { cpSync, existsSync } from 'node:fs';
import os from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = resolve(import.meta.dirname, '..');
const standaloneRoot = resolve(projectRoot, '.next', 'standalone');
const serverPath = resolve(standaloneRoot, 'server.js');

if (!existsSync(serverPath)) {
  console.error('Standalone build not found. Run "npm run build" first.');
  process.exit(1);
}

cpSync(resolve(projectRoot, '.next', 'static'), resolve(standaloneRoot, '.next', 'static'), {
  recursive: true,
});

if (existsSync(resolve(projectRoot, 'public'))) {
  cpSync(resolve(projectRoot, 'public'), resolve(standaloneRoot, 'public'), {
    recursive: true,
  });
}

const port = process.env.PORT || '3000';
const networkAddresses = Object.values(os.networkInterfaces())
  .flatMap((interfaces) => interfaces ?? [])
  .filter((networkInterface) => networkInterface.family === 'IPv4' && !networkInterface.internal)
  .map((networkInterface) => networkInterface.address);

console.log(`Accessible locally: http://localhost:${port}`);
networkAddresses.forEach((address) => {
  console.log(`Accessible on LAN: http://${address}:${port}`);
});

const server = spawn(process.execPath, [serverPath, ...process.argv.slice(2)], {
  cwd: dirname(serverPath),
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
  },
  stdio: 'inherit',
});

server.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});