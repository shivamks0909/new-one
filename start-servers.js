// start-servers.js — starts Express API server on port 3001 and Next.js on port 3000
const { spawn } = require('child_process');
const path = require('path');

const cwd = process.cwd();

// Start Express API server on port 3001
const express = spawn('npx', ['tsx', 'src/index.ts'], {
  cwd,
  env: { ...process.env, PORT: '3001', NODE_ENV: 'development' },
  stdio: 'pipe',
  shell: true,
});

express.stdout.on('data', d => process.stdout.write('[EXPRESS] ' + d));
express.stderr.on('data', d => process.stderr.write('[EXPRESS ERR] ' + d));
express.on('exit', code => console.log('[EXPRESS] exited with code', code));

// Start Next.js dev server on port 3000
const nextjs = spawn('npx', ['next', 'dev', '-p', '3000'], {
  cwd,
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'pipe',
  shell: true,
});

nextjs.stdout.on('data', d => process.stdout.write('[NEXT.js] ' + d));
nextjs.stderr.on('data', d => process.stderr.write('[NEXT ERR] ' + d));
nextjs.on('exit', code => console.log('[NEXT.js] exited with code', code));

console.log('\n🚀 Both servers starting...');
console.log('📍 Next.js dashboard: http://localhost:3000/dashboard');
console.log('📍 Express API: http://localhost:3001/api/health\n');
