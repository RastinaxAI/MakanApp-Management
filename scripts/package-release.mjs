import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const date = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
  .format(new Date())
  .replaceAll('-', '');
const destination = path.join(root, 'release');
const filename = `MakanManagement-server-${date}.tar.gz`;
const files = [
  '.dockerignore',
  '.env.docker.example',
  '.env.example',
  '.gitattributes',
  '.gitignore',
  'Dockerfile',
  'compose.yaml',
  'setup.sh',
  'README.md',
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'next-env.d.ts',
  'tsconfig.json',
  'postcss.config.mjs',
  'contracts/platform-permissions.json',
  'scripts/docker-start.mjs',
  'docs/SERVER.md',
  'docs/DEVELOPMENT.md',
  'docs/LIBRARY.md',
  'docs/INTEGRATION-154c437.md',
  'docs/INTEGRATION-80c2e61.md',
  'docs/INTEGRATION-VNEXT.md',
  'docs/PERSONAL-CLASSES.md',
];
async function collect(directory) {
  for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed in release: ${relative}`);
    if (entry.isDirectory()) await collect(relative);
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Unsupported release file: ${relative}`);
  }
}
await collect('src');
await collect('public');
const manifest = [];
for (const file of files) {
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(root + path.sep) || /[\r\n]/.test(file))
    throw new Error('Invalid release path');
  const stat = await fs.lstat(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Invalid release input: ${file}`);
  const bytes = await fs.readFile(resolved);
  manifest.push({
    file,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  });
}
await fs.mkdir(destination, { recursive: true });
const result = spawnSync('tar', ['-czf', path.join(destination, filename), '--', ...files], {
  cwd: root,
  encoding: 'utf8',
  windowsHide: true,
});
if (result.error || result.status !== 0)
  throw result.error ?? new Error(result.stderr || 'tar failed');
const archive = await fs.readFile(path.join(destination, filename));
const hash = crypto.createHash('sha256').update(archive).digest('hex');
await fs.writeFile(path.join(destination, `${filename}.sha256`), `${hash}  ${filename}\n`);
await fs.writeFile(
  path.join(destination, 'manifest.json'),
  JSON.stringify(
    { archive: filename, bytes: archive.length, sha256: hash, files: manifest },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    archive: `release/${filename}`,
    files: files.length,
    bytes: archive.length,
    sha256: hash,
  }),
);
