import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAGE_NAMES, UPLOAD_ENDPOINTS, UPLOAD_HINTS, pageLabel, uploadState } from '../lib/pages.js';

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

describe('uploadState', () => {
  const ready = { hasAccounts: true, accountSelected: true };

  it('unrecognised page (incl. non-Travian tab): disabled + 「這一頁還不支援，請到村莊總覽再按」', () => {
    for (const pageType of ['unknown', null, undefined, 'something_new']) {
      const state = uploadState({ pageType, ...ready });
      assert.equal(state.canUpload, false);
      assert.equal(state.hint, '這一頁還不支援，請到村莊總覽或集結點再按');
      assert.equal(state.pageName, '');
    }
  });

  it('rally point: recognised and can upload (opens confirm on the tool site)', () => {
    const state = uploadState({ pageType: 'rally_point', ...ready });
    assert.equal(state.canUpload, true);
    assert.equal(state.pageName, '集結點');
    assert.equal(state.hint, '');
  });

  it('other recognised pages that cannot upload use the unsupported hint', () => {
    for (const pageType of ['hero', 'map']) {
      const state = uploadState({ pageType, ...ready });
      assert.equal(state.canUpload, false);
      assert.equal(state.hint, UPLOAD_HINTS.UNSUPPORTED_PAGE);
    }
  });

  it('village overview with an account: can upload, no hint', () => {
    assert.deepEqual(uploadState({ pageType: 'village_overview', ...ready }), {
      pageName: '村莊總覽',
      canUpload: true,
      hint: '',
    });
  });

  it('missing account or still detecting: disabled with a hint', () => {
    assert.equal(
      uploadState({ pageType: 'village_overview', hasAccounts: false }).hint,
      UPLOAD_HINTS.NO_ACCOUNTS,
    );
    assert.equal(
      uploadState({ pageType: 'village_overview', hasAccounts: true }).hint,
      UPLOAD_HINTS.CHOOSE_ACCOUNT,
    );
    assert.equal(uploadState({ detecting: true, ...ready }).hint, UPLOAD_HINTS.DETECTING);
  });

  it('never returns a grey button without a hint', () => {
    const pageTypes = [...Object.keys(PAGE_NAMES), 'unknown', null];
    for (const pageType of pageTypes) {
      for (const detecting of [false, true]) {
        for (const hasAccounts of [false, true]) {
          for (const accountSelected of [false, true]) {
            const s = uploadState({ pageType, detecting, hasAccounts, accountSelected });
            assert.equal(s.canUpload, s.hint === '', JSON.stringify({ pageType, detecting, hasAccounts, accountSelected }));
          }
        }
      }
    }
  });
});
