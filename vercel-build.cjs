const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '.vercel_build');
try {
  fs.rmSync(outDir, { recursive: true, force: true });
} catch (e) {
  // Windows EPERM on locked files; handler.js will be overwritten by esbuild anyway
  console.warn('Could not clean .vercel_build, continuing:', e.code);
}
fs.mkdirSync(outDir, { recursive: true });

esbuild.build({
  entryPoints: [path.join(__dirname, 'src/index.ts')],
  outfile: path.join(outDir, 'handler.js'),
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
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
    console.log('Copied src/app/public -> .vercel_build/src/app/public');
  }
  console.log('Build complete: .vercel_build/handler.js');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
