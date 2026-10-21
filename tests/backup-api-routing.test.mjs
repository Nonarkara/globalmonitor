import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolveBackendUrl } from '../src/services/backendClient.js';

test('health and specialist panels honor the explicit backup backend', async () => {
  for (const path of ['/api/health','/api/infrastructure','/api/acled','/api/sentiment']) {
    assert.equal(resolveBackendUrl(path,'https://globalmonitor.nonarkara.org/'),'https://globalmonitor.nonarkara.org'+path);
    assert.equal(resolveBackendUrl(path,''),path);
  }
  for (const file of ['components/HumanitarianPanel.jsx','components/AcledAnalytics.jsx','components/SentimentChart.jsx']) {
    const source = await fs.readFile(new URL('../src/'+file,import.meta.url),'utf8');
    assert.doesNotMatch(source,/const API_BASE\s*=/);
    assert.doesNotMatch(source,/fetch\(`/);
  }
});
