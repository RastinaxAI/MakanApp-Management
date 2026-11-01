import { constants, accessSync, mkdirSync } from 'node:fs';

// Validate runtime settings before listening; do not print environment values or secrets.
try {
  if (!/^[a-f0-9]{64}$/i.test(process.env.SESSION_SECRET ?? '')) {
    throw new Error('SESSION_SECRET must contain 64 hexadecimal characters. See docs/SERVER.md.');
  }
  for (const key of ['BACKEND_BASE_URL', 'APP_ORIGIN']) {
    const url = new URL(process.env[key]);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error(`${key} must be an HTTP(S) origin.`);
    }
  }
  for (const key of ['PLATFORM_OWNER_ROLE_KEYS']) {
    const value = JSON.parse(process.env[key] ?? '[]');
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      throw new Error(`${key} must be a JSON array of strings.`);
    }
  }
  const bindings = JSON.parse(process.env.PERMISSION_BINDINGS ?? '{}');
  if (
    !bindings ||
    Array.isArray(bindings) ||
    typeof bindings !== 'object' ||
    Object.values(bindings).some((value) => typeof value !== 'string')
  ) {
    throw new Error('PERMISSION_BINDINGS must be a JSON object of strings.');
  }
  const directory = process.env.SESSION_DIRECTORY;
  if (!directory) throw new Error('SESSION_DIRECTORY is required.');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  accessSync(directory, constants.W_OK);
} catch (error) {
  console.error(`MakanApp startup failed: ${error.message}`);
  process.exit(1);
}

await import('./server.js');
