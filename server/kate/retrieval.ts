import type { GeneratorDeps } from './generators/types.js';
import type { EvidenceChunk } from '../ai/skills/types.js';

export interface RetrievalChunk extends EvidenceChunk {
  sourceId?: string;
  startSeconds?: number | null;
  figureId?: string | null;
}

export async function getEvidence(
  deps: GeneratorDeps,
  sourceIds: string[],
  query?: string,
  limit: number = 20
): Promise<EvidenceChunk[]> {
  if (!sourceIds || sourceIds.length === 0) {
    return [];
  }

  // Check figure statuses for figures belonging to given sources
  const { data: figures } = await deps.db
    .from('source_figures')
    .select('id, status')
    .in('source_id', sourceIds);

  const invalidFigureIds = new Set<string>();
  if (figures && figures.length > 0) {
    for (const f of figures) {
      if (f.status !== 'agreed' && f.status !== 'verified') {
        invalidFigureIds.add(f.id);
      }
    }
  }

  // Fetch source metadata
  const { data: sources } = await deps.db
    .from('knowledge_sources')
    .select('id, title, authority_level')
    .in('id', sourceIds);

  const sourceMap = new Map<string, { title: string; authority: number }>();
  if (sources) {
    for (const s of sources) {
      sourceMap.set(s.id, {
        title: s.title || 'Untitled Source',
        authority: s.authority_level ?? 1,
      });
    }
  }

  // Fetch source chunks
  const { data: chunks, error } = await deps.db
    .from('source_chunks')
    .select('id, source_id, chunk_index, content, page_number, section_title, start_seconds, figure_id, token_count')
    .in('source_id', sourceIds)
    .order('chunk_index', { ascending: true });

  if (error || !chunks) {
    return [];
  }

  let filtered = chunks.filter((c: any) => {
    if (c.figure_id && invalidFigureIds.has(c.figure_id)) {
      return false;
    }
    return true;
  });

  if (query && query.trim().length > 0) {
    const qLower = query.toLowerCase().trim();
    const keywords = qLower.split(/\s+/).filter(Boolean);
    const scored = filtered.map((c: any) => {
      const text = `${c.section_title || ''} ${c.content || ''}`.toLowerCase();
      let matches = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) matches++;
      }
      return { c, matches };
    });
    const matched = scored.filter((s) => s.matches > 0);
    if (matched.length > 0) {
      matched.sort((a, b) => b.matches - a.matches);
      filtered = matched.map((m) => m.c);
    }
  }

  const sliced = filtered.slice(0, limit);

  return sliced.map((c: any) => {
    const sInfo = sourceMap.get(c.source_id) || { title: 'Source', authority: 1 };
    return {
      id: c.id,
      sourceId: c.source_id,
      sourceTitle: sInfo.title,
      pageNumber: c.page_number ?? null,
      sectionTitle: c.section_title ?? null,
      startSeconds: c.start_seconds ?? null,
      figureId: c.figure_id ?? null,
      authority: sInfo.authority,
      content: c.content || '',
    };
  });
}

export async function getAllChunks(
  deps: GeneratorDeps,
  sourceIds: string[],
  maxTokens: number = 50000
): Promise<EvidenceChunk[]> {
  if (!sourceIds || sourceIds.length === 0) {
    return [];
  }

  const { data: figures } = await deps.db
    .from('source_figures')
    .select('id, status')
    .in('source_id', sourceIds);

  const invalidFigureIds = new Set<string>();
  if (figures && figures.length > 0) {
    for (const f of figures) {
      if (f.status !== 'agreed' && f.status !== 'verified') {
        invalidFigureIds.add(f.id);
      }
    }
  }

  const { data: sources } = await deps.db
    .from('knowledge_sources')
    .select('id, title, authority_level')
    .in('id', sourceIds);

  const sourceMap = new Map<string, { title: string; authority: number }>();
  if (sources) {
    for (const s of sources) {
      sourceMap.set(s.id, {
        title: s.title || 'Untitled Source',
        authority: s.authority_level ?? 1,
      });
    }
  }

  const { data: chunks, error } = await deps.db
    .from('source_chunks')
    .select('id, source_id, chunk_index, content, page_number, section_title, start_seconds, figure_id, token_count')
    .in('source_id', sourceIds)
    .order('chunk_index', { ascending: true });

  if (error || !chunks) {
    return [];
  }

  const result: RetrievalChunk[] = [];
  let tokenCount = 0;

  for (const c of chunks) {
    if (c.figure_id && invalidFigureIds.has(c.figure_id)) {
      continue;
    }

    const t = c.token_count || Math.ceil((c.content || '').length / 4);
    if (tokenCount + t > maxTokens && result.length > 0) {
      break;
    }

    tokenCount += t;
    const sInfo = sourceMap.get(c.source_id) || { title: 'Source', authority: 1 };
    result.push({
      id: c.id,
      sourceId: c.source_id,
      sourceTitle: sInfo.title,
      pageNumber: c.page_number ?? null,
      sectionTitle: c.section_title ?? null,
      startSeconds: c.start_seconds ?? null,
      figureId: c.figure_id ?? null,
      authority: sInfo.authority,
      content: c.content || '',
    });
  }

  return result;
}
