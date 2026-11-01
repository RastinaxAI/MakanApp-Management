import fs from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';
const source = JSON.parse(
  (await fs.readFile('contracts/openapi.json', 'utf8')).replace(/^\uFEFF/, ''),
);
const snapshot = source['x-makan-snapshot'] ?? {
  date: '2026-10-18',
  origin: 'http://94.184.32.84:8090',
};
await fs.mkdir('src/generated/api', { recursive: true });
await fs.writeFile('src/generated/api/schema.d.ts', astToString(await openapiTS(source)));
const selected = (p) =>
  p.startsWith('/api/admin/') ||
  /^\/api\/v1\/(auth(?:\/|$)|notifications(?:\/|$)|me(?:\/profile)?$)/.test(p);
const operations = Object.entries(source.paths).flatMap(([path, methods]) =>
  !selected(path)
    ? []
    : Object.entries(methods)
        .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
        .map(([method, value]) => ({
          path,
          method: method.toUpperCase(),
          parameters: value.parameters ?? [],
          body: value.requestBody?.content?.['application/json']?.schema ?? null,
          response:
            Object.entries(value.responses ?? {}).find(([code]) => /^2/.test(code))?.[1]?.content?.[
              'application/json'
            ]?.schema ?? null,
        })),
);
await fs.writeFile(
  'src/generated/api/contract.json',
  JSON.stringify({ schemas: reachableSchemas(operations), operations }),
);
function reachableSchemas(roots) {
  const schemas = {};
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.$ref === 'string') {
      const name = value.$ref.split('/').pop();
      if (!schemas[name]) {
        const schema = source.components.schemas[name];
        if (!schema) throw new Error('Missing schema: ' + name);
        schemas[name] = schema;
        visit(schema);
      }
    }
    for (const child of Object.values(value)) visit(child);
  }
  visit(roots);
  return schemas;
}
const bindings = JSON.parse(await fs.readFile('contracts/platform-permissions.json', 'utf8'));
const rows = operations.map(
  (o) =>
    `| ${o.path.includes('/admin/') ? 'پلتفرم' : 'حساب اپراتور'} | \`${o.method} ${o.path}\` | ${o.body?.$ref?.split('/').pop() ?? 'بدون بدنه'} | ${o.response?.$ref?.split('/').pop() ?? o.response?.type ?? 'بدون JSON / باینری'} | ${
      o.parameters
        .filter((x) => x.in === 'query')
        .map((x) => x.name)
        .join(', ') || '—'
    } | ${o.path.includes('/admin/') ? (bindings[o.method + ' ' + o.path] ?? 'بدون نگاشت تأییدشده؛ دسترسی بسته است') : 'فقط حساب جاری؛ کنترل Backend'} |`,
);
await fs.writeFile(
  'docs/api-matrix.md',
  `# ماتریس قرارداد اجرایی\n\nSnapshot: ${snapshot.date}، سرور ${snapshot.origin}. تولیدشده از OpenAPI واقعی محیط. شناسه نسخه سند اثبات نسخه مستقرشده سرور نیست.\n\nاین ماتریس فقط عملیات مجاز پنل مالک و حساب جاری اپراتور را پوشش می‌دهد. وجود API گروه و کانال رسمی در OpenAPI کامل، آن را به قابلیت این پنل تبدیل نمی‌کند؛ مسیرهای مدرسه، گفتگوی خصوصی، پاسخ آموزشی و Repair/Backfill در واسط پنل ارائه نمی‌شوند. مجوزهای زیر نگاشت پیش‌فرض مستند هستند؛ تنظیمات صریح محیط و مجوز جاری پاسخ سرور نیز بررسی می‌شوند.\n\nتمام صفحات: loading / empty / error / forbidden / offline / rate limit / session expired. mutationها: conflict / policy rejection، حفظ فرم و refetch صریح. نسخه فقط طبق DTO و به صورت opaque ارسال می‌شود.\n\n| Context | عملیات | Request DTO | Response | Query / pagination | دسترسی |\n|---|---|---|---|---|---|\n` +
    rows.join('\n') +
    '\n\nبرای required/nullable، enum و جزئیات فیلدها، contracts/openapi.json مرجع دقیق snapshot است. فهرست تاریخی PDF مبنای تولید نیست.\n',
);
console.log(`Generated ${operations.length} allowed operations and TypeScript schemas.`);
