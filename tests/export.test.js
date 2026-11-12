/* 导出层的确定性纯函数测试：文件名、分享链接、预设读写、SVG 安全门。 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const params = require('../src/params.js');
const geometry = require('../src/geometry.js');
const palette = require('../src/palette.js');
const render = require('../src/render.js');
const exporter = require('../src/export.js');

const P = params.clampParams({ orbits: 6, eccentricity: 0.4, density: 0.75, tilt: -20, palette: 1 });

test('filename：由参数确定性生成，同一参数永远同名', () => {
  const a = exporter.filename(P, 'svg');
  const b = exporter.filename(params.decodeParams('?' + params.encodeParams(P)), 'svg');
  assert.equal(a, b);
  assert.match(a, /^orrery-o6-e0\.40-d0\.75-t-20-p1\.svg$/);
});

test('buildExportSvg：剥离预览 class，且导出前安全自检通过', () => {
  const svg = exporter.buildExportSvg(geometry.buildSystem(P), palette.getPalette(P.palette));
  assert.ok(!svg.includes('orrery-starfield'));
  assert.equal(render.inspectSvg(svg).safe, true);
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
});

test('buildExportSvg：被污染的调色板经净化后导出，不把外部引用写进产物', () => {
  /* 生成侧已由 color() 白名单净化，因此这里期望「不抛错但也不包含危险内容」，
     而不是抛错——抛错只属于渲染结果真的不安全的情形（见下一条）。 */
  const evil = Object.assign({}, palette.getPalette(0), {
    bg: 'url(https://example.com/x.png)',
    text: '"/><script>alert(1)</script><rect fill="'
  });
  const svg = exporter.buildExportSvg(geometry.buildSystem(P), evil);
  assert.ok(!svg.includes('url('), '外部引用进入产物');
  assert.ok(!svg.includes('<script'), '脚本进入产物');
  assert.equal(render.inspectSvg(svg).safe, true);
});

test('buildExportSvg：渲染结果不安全时拒绝写出（导出侧兜底门）', () => {
  /* 兜底门的意义是：哪怕将来渲染层被改坏，导出也不会把不安全的 SVG 交给用户。
     直接替换渲染实现来构造这种情形，验证导出侧独立生效。 */
  const original = render.renderSvg;
  render.renderSvg = () => '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  try {
    assert.throws(
      () => exporter.buildExportSvg(geometry.buildSystem(P), palette.getPalette(0)),
      /安全自检未通过/
    );
  } finally {
    render.renderSvg = original;
  }
});

test('shareUrl：去掉旧查询串与 fragment，只保留当前参数', () => {
  const url = exporter.shareUrl(P, 'https://example.com/orrery/?o=3&p=0#frag');
  assert.ok(url.startsWith('https://example.com/orrery/?'));
  assert.ok(!url.includes('#'));
  assert.deepEqual(params.decodeParams('?' + url.split('?')[1]), P);
});

test('shareUrl：地址带 fragment 但无查询串时，参数仍落在查询串位置', () => {
  const url = exporter.shareUrl(P, 'https://example.com/orrery/#section');
  assert.equal(url.split('#').length, 1, 'fragment 必须被剥离');
  assert.ok(url.startsWith('https://example.com/orrery/?o='));
  assert.deepEqual(params.decodeParams('?' + url.split('?')[1]), P);
});

test('shareUrl：空地址与相对地址不产生越界拼接', () => {
  assert.equal(exporter.shareUrl(P, ''), '?' + params.encodeParams(P));
  assert.equal(exporter.shareUrl(P, '/orrery/'), '/orrery/?' + params.encodeParams(P));
});

test('presetJson / readPreset：往返一致并夹取越界值', () => {
  const json = exporter.presetJson(P);
  assert.deepEqual(exporter.readPreset(json), P);
  assert.deepEqual(exporter.readPreset('{"orbits":999,"density":null}'),
    params.clampParams({ orbits: 999, density: NaN }));
  assert.throws(() => exporter.readPreset('not json'), SyntaxError);
});

test('describe：含全部五项参数与 seed，且确定性', () => {
  const d = params.describe(P);
  assert.match(d, /ORBITS 6/);
  assert.match(d, /ECC 0\.40/);
  assert.match(d, /TILT -20/);
  assert.match(d, /SEED \d+/);
  assert.equal(d, params.describe(P));
});
