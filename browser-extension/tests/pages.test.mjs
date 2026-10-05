import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAGE_NAMES, UPLOAD_ENDPOINTS, pageLabel } from '../lib/pages.js';

describe('pageLabel', () => {
  it('shows a friendly name without game-internal codes', () => {
    assert.equal(pageLabel('village_overview'), '村莊總覽');
    assert.equal(pageLabel('village_center'), '村莊中心');
    for (const name of Object.values(PAGE_NAMES)) {
      assert.doesNotMatch(name, /dorf|\.php|\(|[a-z]{3,}/i);
    }
  });

  it('shows nothing for unknown pages', () => {
    assert.equal(pageLabel('unknown'), '');
    assert.equal(pageLabel(undefined), '');
    assert.equal(pageLabel('toString'), '');
  });

  it('only uploads to the sync endpoints', () => {
    for (const endpoint of Object.values(UPLOAD_ENDPOINTS)) {
      assert.match(endpoint, /^\/sync\/[a-z-]+$/);
    }
  });
});
