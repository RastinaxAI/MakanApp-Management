import fs from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';
const source = JSON.parse(
  (await fs.readFile('contracts/openapi.json', 'utf8')).replace(/^\uFEFF/, ''),
);
const allowed = JSON.parse(await fs.readFile('contracts/client-surface.json', 'utf8'));
const operations = allowed.map((key) => {
  const [method, path] = key.split(' ');
  const value = source.paths[path]?.[method.toLowerCase()];
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
const paths = {};
for (const [path, methods] of Object.entries(source.paths)) {
  if (
    path.startsWith('/api/v1/auth/') ||
    path === '/api/v1/files' ||
    path.startsWith('/api/v1/files/')
  )
    paths[path] = methods;
  else
    for (const operation of operations.filter((item) => item.path === path)) {
      paths[path] ??= {};
      paths[path][operation.method.toLowerCase()] = methods[operation.method.toLowerCase()];
    }
}
const schemas = {};
function visit(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) {
    const name = value.$ref.split('/').pop();
    if (!schemas[name]) {
      if (!source.components.schemas[name]) throw new Error('Missing schema: ' + name);
      schemas[name] = source.components.schemas[name];
      visit(schemas[name]);
    }
  }
  for (const child of Object.values(value)) visit(child);
}
visit(paths);
visit(operations);
const filtered = { ...source, paths, components: { ...source.components, schemas } };
await fs.mkdir('src/generated/api', { recursive: true });
await fs.writeFile('src/generated/api/schema.d.ts', astToString(await openapiTS(filtered)));
for (const name of ['contract.json', 'client-contract.json'])
  await fs.writeFile('src/generated/api/' + name, JSON.stringify({ schemas, operations }));
const rows = operations.map(
  (o) =>
    '| `' +
    o.method +
    ' ' +
    o.path +
    '` | ' +
    (o.body?.$ref?.split('/').pop() ?? '—') +
    ' | ' +
    (o.response?.$ref?.split('/').pop() ?? o.response?.type ?? 'بدون JSON') +
    ' |',
);
await fs.writeFile(
  'docs/api-matrix.md',
  '# قرارداد اجرایی کلاینت ماکان\n\nفقط سطح مجاز حساب شخصی، دانشجو، استاد، والدین و مدیر آموزشگاه. endpointهای مالک در این runtime و SDK وجود ندارند. وجود مسیر مجوز نیست؛ سرور نشست، زمینه و دسترسی منبع را برای هر عملیات بررسی می‌کند. Auth و فایل‌ها BFF اختصاصی دارند و از واسط عمومی قابل فراخوانی نیستند.\n\n| عملیات | درخواست | پاسخ |\n| --- | --- | --- |\n' +
    rows.join('\n') +
    '\n',
);
console.log(
  'Generated ' +
    operations.length +
    ' client-only operations and ' +
    Object.keys(schemas).length +
    ' schemas; no platform-admin paths.',
);
