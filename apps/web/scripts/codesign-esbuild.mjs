import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (process.platform !== 'darwin') {
  process.exit(0);
}

const targets = [
  'node_modules/esbuild/bin/esbuild',
  'node_modules/@esbuild/darwin-arm64/bin/esbuild',
  'node_modules/@esbuild/darwin-x64/bin/esbuild',
  'node_modules/@esbuild/darwin-universal/bin/esbuild',
].filter((path) => existsSync(path));

if (!targets.length) {
  process.exit(0);
}

try {
  execFileSync('codesign', ['--force', '--sign', '-', ...targets], {
    stdio: 'inherit',
  });
} catch {
  console.warn('codesign failed; you may need to sign esbuild manually.');
}
