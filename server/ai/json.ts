/**
 * Extracts and parses JSON from text that may contain markdown fences or surrounding explanation.
 * Strips ``` fences, finds the first balanced JSON object {...} or array [...], and parses it.
 */
export function extractJson<T = unknown>(text: string): T {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: text must be a non-empty string');
  }

  let cleaned = text.trim();

  // Strip markdown code fences if wrapping the content
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i) ||
                     cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  // Try parsing cleaned text directly first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall back to scanning for balanced braces
  }

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIdx = -1;
  let openChar = '';
  let closeChar = '';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    openChar = '{';
    closeChar = '}';
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    openChar = '[';
    closeChar = ']';
  }

  if (startIdx === -1) {
    throw new Error('No JSON object or array found in output');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let endIdx = -1;

  for (let i = startIdx; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
  }

  if (endIdx === -1) {
    throw new Error(`Unbalanced JSON structure starting at position ${startIdx}`);
  }

  const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
  try {
    return JSON.parse(jsonCandidate) as T;
  } catch (err: any) {
    throw new Error(`Failed to parse extracted JSON candidate: ${err?.message || String(err)}`);
  }
}
