// manifest key → 固定的擴充 ID，且網站預設的 VITE_EXTENSION_ID 與 README 一致
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/** Chrome 的算法：SHA-256(公鑰 DER) 前 16 bytes，每個 hex 字元 0-f 對應 a-p */
export function extensionIdFromKey(base64Key) {
  const hex = createHash('sha256').update(Buffer.from(base64Key, 'base64')).digest('hex');
  return [...hex.slice(0, 32)].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');
}

describe('manifest key', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const id = extensionIdFromKey(manifest.key);

  it('is a public key only (no private key material)', () => {
    assert.match(manifest.key, /^MIIB[A-Za-z0-9+/=]+$/);
    assert.doesNotMatch(JSON.stringify(manifest), /PRIVATE KEY/);
  });

  it('derives the documented extension id everywhere', () => {
    assert.match(id, /^[a-p]{32}$/);
    assert.match(read('../.env.example'), new RegExp(`^VITE_EXTENSION_ID=${id}$`, 'm'));
    assert.match(read('../docker-compose.yml'), new RegExp(`VITE_EXTENSION_ID=\\$\\{VITE_EXTENSION_ID-${id}\\}`));
    assert.match(read('README.md'), new RegExp(`\`${id}\``));
  });
});
