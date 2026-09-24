import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { zipSync } from 'fflate';

const root = join(import.meta.dirname, '..');
const distDir = join(root, 'dist');
const releaseDir = join(root, 'release');

const manifest = JSON.parse(readFileSync(join(distDir, 'manifest.json'), 'utf8'));

const files = {};
for (const entry of readdirSync(distDir, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const fullPath = join(entry.parentPath, entry.name);
  files[relative(distDir, fullPath).split(sep).join('/')] = readFileSync(fullPath);
}

mkdirSync(releaseDir, { recursive: true });
const outFile = join(releaseDir, `github-pr-review-2.0-v${manifest.version}.zip`);
writeFileSync(outFile, zipSync(files, { level: 9 }));

console.log(`Packaged ${Object.keys(files).length} files -> ${relative(root, outFile)}`);
