import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dashboard = await readFile(new URL('../site/dashboard.html', import.meta.url), 'utf8');
const portfolio = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
const methodology = await readFile(new URL('../docs/METHODOLOGY.md', import.meta.url), 'utf8');
const projectRoot = fileURLToPath(new URL('../', import.meta.url));

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries
    .filter((entry) => entry.name !== '.git')
    .map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walkFiles(target) : [target];
    }));
  return nested.flat();
}

test('公开看板默认加载模拟数据', () => {
  assert.match(dashboard, /已载入示例数据（非真实，仅演示）/);
  assert.match(dashboard, /DEMO-/);
  assert.match(dashboard, /\$\('demoBtn'\)\.click\(\);\s*run\(\);/);
  assert.match(dashboard, /const demoStores=\['示例门店A','示例门店B','示例门店C','示例门店D'\]/);
});

test('公开站不包含真实SKU格式或业务表格', async () => {
  assert.doesNotMatch(dashboard, /(^|\D)\d{15,22}(\D|$)/);
  const files = await walkFiles(projectRoot);
  const forbidden = files.filter((file) => /\.(xlsx|xls|xlsm|xlsb|csv|tsv)$/i.test(file));
  assert.deepEqual(forbidden, []);
});

test('评分权重与阈值和方法文档一致', () => {
  assert.match(dashboard, /const W = \{rate:35, rev:25, qty:25, stock:15\}/);
  assert.match(dashboard, /const THRESHOLD = \{watch:50, cull:70\}/);
  assert.match(methodology, /0\.35.*0\.25.*0\.25.*0\.15/s);
});

test('动销率有覆盖率前置条件', () => {
  assert.match(dashboard, /SELL_THROUGH_MIN_COVERAGE=0\.8/);
  assert.match(dashboard, /validSellThroughRows/);
  assert.match(methodology, /覆盖率低于80%时/);
});

test('库存和有销量门店使用不同口径', () => {
  assert.match(dashboard, /const storeDetails=allStoreDetails\.filter\(d=>d\.qty>0\)/);
  assert.match(dashboard, /inventoryOnlyStoreCount/);
  assert.match(methodology, /零销量但持有库存的门店/);
});

test('作品集展示经过核验的样本结果', () => {
  assert.match(portfolio, /4,211/);
  assert.match(portfolio, /142 \/ 122/);
  assert.match(portfolio, /¥1\.82万/);
  assert.match(portfolio, /2\.8%/);
  assert.match(portfolio, /1\.7%/);
});

test('作品集明确数据与品牌边界', () => {
  assert.match(portfolio, /默认加载<strong>20个模拟SKU、4家“示例门店”<\/strong>/);
  assert.match(portfolio, /任何历史上传Excel、真实商品编码、真实门店名称和逐行经营明细均不进入GitHub/);
  assert.match(portfolio, /非珀莱雅或美团官方网站/);
});
