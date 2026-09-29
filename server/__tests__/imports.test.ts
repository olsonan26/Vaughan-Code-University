import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Vercel runs the compiled .js output: an import ending in ".ts" crashes every API request in production. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === '__tests__' || n === 'node_modules' ? [] : files(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

describe('server imports', () => {
  it('never import local files with a .ts extension', () => {
    const bad = ['server', 'api', 'shared'].flatMap(files).filter((f) => /from\s+'\.[^']*\.ts'|import\(\s*'\.[^']*\.ts'\s*\)/.test(readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });
});
