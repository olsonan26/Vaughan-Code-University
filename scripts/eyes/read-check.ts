/** Live check: render a PDF page and run both vision readers. Usage: tsx scripts/eyes/read-check.ts file.pdf [page] */
import { readFileSync } from 'node:fs';
import { renderPdfPage, dualRead, compareReads, imagePart, proposedText } from '../../server/knowledge/eyes.js';
import { openRouterChat } from '../../server/ai/providers/openrouter.js';
async function main() {
  const [file, page = '1', mode = 'full'] = process.argv.slice(2);
  const png = await renderPdfPage(new Uint8Array(readFileSync(file)), Number(page));
  const t = Date.now();
  const { primary, check } = await dualRead(openRouterChat, imagePart(png), mode as any);
  console.log('time', Date.now() - t, 'ms');
  if (primary.status === 'fulfilled') console.log('PRIMARY', primary.value.model, '\n' + proposedText(primary.value.read), '\nuncertain:', primary.value.read.uncertain);
  else console.log('PRIMARY FAILED', primary.reason);
  if (check.status === 'fulfilled') console.log('CHECK', check.value.model, '\n' + check.value.read.text);
  else console.log('CHECK FAILED', check.reason);
  if (primary.status === 'fulfilled' && check.status === 'fulfilled') console.log('COMPARE', compareReads(primary.value.read, check.value.read));
}
main();
