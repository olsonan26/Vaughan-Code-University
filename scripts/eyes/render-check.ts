import { readFileSync, writeFileSync } from 'node:fs';
import { extractText } from '../../server/knowledge/extract.js';
import { scanPdfPages, renderPdfPage, visionReason } from '../../server/knowledge/eyes.js';
async function main() { for (const f of ['mixed.pdf', 'scan_chart.pdf']) {
  const b = new Uint8Array(readFileSync('/tmp/eyes/' + f));
  let texts: string[] = [];
  try { texts = (await extractText(b, 'pdf')).pages.map((p) => p.text); } catch (e) { console.log(f, 'extract:', (e as Error).message.slice(0, 60)); }
  const sig = await scanPdfPages(b, texts);
  console.log(f, sig.map((s) => ({ ...s, reason: visionReason(s) })));
  const t = Date.now(); const png = await renderPdfPage(b, 1); writeFileSync(`/tmp/eyes/${f}.p1.png`, png); console.log('rendered', png.length, 'bytes in', Date.now() - t, 'ms');
} }
main();
