import fs from 'node:fs/promises';
const pairs = [
  ['light text', '#203442', '#f5f9fc'],
  ['light muted', '#586e7c', '#f5f9fc'],
  ['primary button', '#ffffff', '#1169b8'],
  ['light link', '#1169b8', '#edf7ff'],
  ['welcome text', '#203442', '#e3f3ff'],
  ['success', '#166b45', '#eaf8f0'],
  ['danger', '#b42318', '#fdf0ef'],
  ['warning', '#89520a', '#fff7e7'],
  ['dark text', '#edf2fa', '#101827'],
  ['dark muted', '#acb8c9', '#182334'],
  ['dark primary', '#94b6ff', '#202e4c'],
];
function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
const report = pairs.map(([name, foreground, background]) => {
  const a = luminance(foreground),
    b = luminance(background);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return {
    name,
    foreground,
    background,
    ratio: Number(ratio.toFixed(2)),
    passesNormalText: ratio >= 4.5,
  };
});
await fs.writeFile('docs/contrast-report.json', JSON.stringify(report, null, 2));
console.table(report);
if (report.some((p) => !p.passesNormalText)) process.exitCode = 1;
