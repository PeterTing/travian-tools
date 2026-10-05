// 全站統一用「部族」，不用「種族」（設計決定，2026-10-05）
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'tests') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(js|mjs|html|json|css|md)$/.test(name)) yield path;
  }
}

describe('terminology', () => {
  it('uses 部族, never 種族', () => {
    const all = [...files(ROOT)];
    assert.ok(all.length > 5);
    const offenders = all.filter((path) => readFileSync(path, 'utf8').includes('種族'));
    assert.deepEqual(offenders, []);
  });
});
