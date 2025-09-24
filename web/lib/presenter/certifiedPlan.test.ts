import assert from 'node:assert';
import { pickPreviewTitle, humanizePlanError } from './certifiedPlan';

(function testPresenter() {
  const ok = pickPreviewTitle({ status: 'ok', plan: { title: 'Mock Plan', items: [{ id: 'm1', type: 'card' }] } });
  assert.strictEqual(ok, 'Mock Plan');
  const stub = pickPreviewTitle({ status: 'stub' });
  assert.strictEqual(stub, 'Certified (stub mode)');
  const def = pickPreviewTitle({ status: 'unknown' });
  assert.strictEqual(def, 'Certified');
  console.log('presenter ok');
})();

(function testErrors() {
  const e413 = humanizePlanError(413, {});
  if (!/too large/i.test(e413)) throw new Error('413 not humanized');
  const e429 = humanizePlanError(429, {});
  if (!/too quickly|wait/i.test(e429)) throw new Error('429 not humanized');
  const e500 = humanizePlanError(500, { error: { message: 'Internal' } });
  if (!/Internal/.test(e500)) throw new Error('500 not using json.error.message');
  console.log('errors ok');
})();
