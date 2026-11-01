import fs from 'node:fs/promises';
const source = JSON.parse(
  (await fs.readFile('contracts/openapi.json', 'utf8')).replace(/^\uFEFF/, ''),
);
const allowed = JSON.parse(await fs.readFile('contracts/client-surface.json', 'utf8'));
const operations = allowed.map((key) => {
  const [method, path] = key.split(' '),
    value = source.paths[path]?.[method.toLowerCase()];
  if (!value || path.startsWith('/api/admin/') || path.startsWith('/api/v1/auth/'))
    throw new Error('Invalid client surface: ' + key);
  return {
    path,
    method,
    parameters: value.parameters ?? [],
    body: value.requestBody?.content?.['application/json']?.schema ?? null,
    response:
      Object.entries(value.responses ?? {}).find(([code]) => /^2/.test(code))?.[1]?.content?.[
        'application/json'
      ]?.schema ?? null,
  };
});
const schemas = {};
function visit(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string') {
    const name = value.$ref.split('/').pop();
    if (!schemas[name]) {
      if (!source.components.schemas[name]) throw new Error('Missing schema: ' + name);
      schemas[name] = source.components.schemas[name];
      visit(schemas[name]);
    }
  }
  for (const child of Object.values(value)) visit(child);
}
visit(operations);
await fs.mkdir('src/generated/api', { recursive: true });
await fs.writeFile(
  'src/generated/api/client-contract.json',
  JSON.stringify({ schemas, operations }),
);
console.log(
  `Generated ${operations.length} public-account surface operations with ${Object.keys(schemas).length} reachable schemas; this is not a permission grant.`,
);
