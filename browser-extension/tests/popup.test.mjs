// popup / manifest 結構檢查
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { TOOL_SITE_URL, TRUSTED_SITE_ORIGINS } from '../lib/config.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

describe('popup.html', () => {
  const html = read('popup/popup.html');

  it('has no input boxes at all', () => {
    assert.doesNotMatch(html, /<input\b/i);
    assert.doesNotMatch(html, /<textarea\b/i);
    assert.doesNotMatch(html, /contenteditable/i);
    assert.doesNotMatch(html, /<form\b/i);
  });

  it('logged-out state only offers 「在工具網站登入」', () => {
    const section = html.match(/<section id="login-section"[\s\S]*?<\/section>/)[0];
    const buttons = section.match(/<button\b[^>]*>[^<]*<\/button>/g);
    assert.equal(buttons.length, 1);
    assert.match(buttons[0], /在工具網站登入/);
    assert.doesNotMatch(section, /<(select|a)\b/i);
  });
});

describe('popup.js', () => {
  const js = read('popup/popup.js');

  it('never asks for or sends credentials', () => {
    assert.doesNotMatch(js, /password/i);
    assert.doesNotMatch(js, /sendMessage\('login'/);
  });

  it('opens the tool site (and only the tool site) in a new tab', () => {
    assert.match(js, /window\.open\(`\$\{TOOL_SITE_URL\}\/login\?from=extension`, '_blank'/);
    assert.equal(TRUSTED_SITE_ORIGINS.includes(new URL(TOOL_SITE_URL).origin), true);
  });
});

describe('manifest.json', () => {
  const manifest = JSON.parse(read('manifest.json'));

  it('externally_connectable matches exactly the trusted tool site origins', () => {
    const matches = manifest.externally_connectable?.matches ?? [];
    assert.deepEqual(
      [...matches].sort(),
      TRUSTED_SITE_ORIGINS.map((o) => `${o}/*`).sort(),
    );
    assert.equal(manifest.externally_connectable.ids, undefined);
  });

  it('adds no new permissions', () => {
    assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'scripting', 'storage']);
    assert.deepEqual(manifest.host_permissions, ['http://localhost:8000/*']);
    assert.equal(manifest.content_scripts, undefined);
  });
});
