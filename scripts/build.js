#!/usr/bin/env node

import { execSync, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Step 1: Build (tsc + vite, produces dist/ with manifest.json, icons, assets)
console.log('Building extension (tsc + vite)...');
execSync('npm run build', { stdio: 'inherit', cwd: rootDir });

// Step 2: Read version from the built manifest (source of truth for the package)
const distDir = path.join(rootDir, 'dist');
const manifestPath = path.join(distDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`\n✗ dist/manifest.json not found — build did not produce expected output.`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version;

// Step 3: Package dist/ into chrome-web-store/AudioLift-v<version>.zip
const outDir = path.join(rootDir, 'chrome-web-store');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const zipFileName = `AudioLift-v${version}.zip`;
const zipPath = path.join(outDir, zipFileName);

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
  console.log(`Removed existing: ${zipFileName}`);
}

console.log('Building Chrome Web Store package...');
console.log(`Version: ${version}`);

try {
  execFileSync('zip', ['-r', '-q', zipPath, '.', '-x', '.*'], { stdio: 'inherit', cwd: distDir });

  const fileSizeInKB = (fs.statSync(zipPath).size / 1024).toFixed(0);
  console.log(`\n✓ Package created: chrome-web-store/${zipFileName}`);
  console.log(`  Size: ${fileSizeInKB} KB`);
  console.log('\nReady to upload manually to the Chrome Web Store dev console.');
} catch (error) {
  console.error('Error creating zip:', error.message);
  process.exit(1);
}
