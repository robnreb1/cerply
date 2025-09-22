import assert from 'node:assert';
import { pickPreviewTitle } from './certifiedPlan';

(function testPresenter() {
  const ok = pickPreviewTitle({ status: 'ok', plan: { title: 'Mock Plan', items: [{ id: 'm1', type: 'card' }] } });
  assert.strictEqual(ok, 'Mock Plan');
  const stub = pickPreviewTitle({ status: 'stub' });
  assert.strictEqual(stub, 'Certified (stub mode)');
  const def = pickPreviewTitle({ status: 'unknown' });
  assert.strictEqual(def, 'Certified');
  console.log('presenter ok');
})();
