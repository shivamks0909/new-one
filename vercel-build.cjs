const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, 'dist');
try {
  fs.rmSync(outDir, { recursive: true, force: true });
} catch (e) {
  console.warn('Could not clean dist, continuing:', e.code);
}
fs.mkdirSync(outDir, { recursive: true });

esbuild.build({
  entryPoints: [path.join(__dirname, 'src/index.ts')],
  outfile: path.join(outDir, 'handler.js'),
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: false,
  external: ['better-sqlite3'],
  define: {
    'process.env.VERCEL': '"true"',
  },
}).then(() => {
  // Copy dashboard static files into build output
  const src = path.join(__dirname, 'src/app/public');
  const dst = path.join(outDir, 'src/app/public');
  if (fs.existsSync(src)) {
    fs.cpSync(src, dst, { recursive: true });
    console.log('Copied src/app/public -> dist/src/app/public');
  }
  console.log('Build complete: dist/handler.js');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
