/** Tiny safe Markdown renderer (escapes all HTML first). Headings, bold, italic, code, links, lists, quotes, rules, paragraphs. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inline(s: string) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code class="px-1 rounded bg-slate-100 text-[0.9em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/&lt;added&gt;([\s\S]*?)&lt;\/added&gt;/g, '<span class="bg-amber-50 border-b border-amber-300" title="Approved addition (beyond the source)">$1</span>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline">$1</a>')
    .replace(/\[(\d+(?:,\s*\d+)*)\]/g, '<sup class="text-indigo-500 font-medium">[$1]</sup>');
}
export function renderMarkdown(md: string): string {
  const lines = String(md ?? '').replace(/\r/g, '').split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null; let para: string[] = [];
  const flushP = () => { if (para.length) { out.push(`<p class="my-3 leading-relaxed">${inline(para.join(' '))}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m: RegExpMatchArray | null;
    if (!line.trim()) { flushP(); flushL(); continue; }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flushP(); flushL(); const n = m[1].length; const cls = ['text-2xl font-bold mt-6', 'text-xl font-bold mt-6', 'text-lg font-semibold mt-5', 'font-semibold mt-4'][n - 1]; out.push(`<h${n + 1} class="${cls} mb-2">${inline(m[2])}</h${n + 1}>`); continue; }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { flushP(); flushL(); out.push('<hr class="my-5 border-slate-200"/>'); continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { flushP(); if (list !== 'ul') { flushL(); out.push('<ul class="list-disc pl-6 my-3 space-y-1">'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flushP(); if (list !== 'ol') { flushL(); out.push('<ol class="list-decimal pl-6 my-3 space-y-1">'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) { flushP(); flushL(); out.push(`<blockquote class="border-l-4 border-indigo-200 pl-4 my-3 text-slate-600">${inline(m[1])}</blockquote>`); continue; }
    flushL(); para.push(line.trim());
  }
  flushP(); flushL();
  return out.join('\n');
}
