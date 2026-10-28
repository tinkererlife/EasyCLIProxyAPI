import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(await readFile(join(root, 'fork-core-lock.json'), 'utf8'));
const arch = { arm64: 'aarch64', x64: 'amd64' }[process.arch];
if (process.platform !== 'darwin' || !arch) throw new Error('This distribution supports macOS only');
const version = (await readFile(join(root, 'core-version.txt'), 'utf8')).trim();
if (version !== lock.version) throw new Error('core-version.txt differs from fork-core-lock.json');
const asset = `CLIProxyAPI_${version}_darwin_${arch}.tar.gz`;
const expected = lock.archives[asset];
if (!/^[a-f0-9]{64}$/.test(expected ?? '')) throw new Error(`No approved hash for ${asset}`);
const directory = join(root, 'cpa-core');
await mkdir(directory, { recursive: true });
const destination = join(directory, asset);
let archive;
try { archive = await readFile(destination); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const url = `https://github.com/router-for-me/CLIProxyAPI/releases/download/v${version}/${asset}`;
  console.log(`Downloading pinned upstream core: ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Core download failed: HTTP ${response.status}`);
  archive = Buffer.from(await response.arrayBuffer());
}
const actual = createHash('sha256').update(archive).digest('hex');
if (actual !== expected) throw new Error(`Core SHA-256 mismatch: ${actual}`);
await writeFile(destination, archive);
await writeFile(join(directory, 'checksums.txt'), `${expected}  ${asset}\n`);
console.log(`Verified ${asset}: ${actual}`);
