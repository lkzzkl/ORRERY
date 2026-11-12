/* 确定性几何与参数夹取的单元测试。零第三方依赖，用 Node 内置 test runner。 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const prng = require('../src/prng.js');
const params = require('../src/params.js');
const geometry = require('../src/geometry.js');
const palette = require('../src/palette.js');
const render = require('../src/render.js');

test('PRNG：同一 seed 产生完全相同的数列', () => {
  const a = prng.mulberry32(12345);
  const b = prng.mulberry32(12345);
  const seqA = Array.from({ length: 40 }, () => a());
  const seqB = Array.from({ length: 40 }, () => b());
  assert.deepEqual(seqA, seqB);
  seqA.forEach(v => assert.ok(v >= 0 && v < 1));
});

test('PRNG：不同 seed 产生不同数列；非法 seed 有确定回退', () => {
  const a = prng.mulberry32(1);
  const b = prng.mulberry32(2);
  assert.notEqual(a(), b());
  const x = prng.mulberry32(NaN);
  const y = prng.mulberry32(undefined);
  assert.equal(x(), y());
});

test('clampParams：越界值被夹取，非法值回落到默认值', () => {
  assert.equal(params.clampParams({ orbits: 99 }).orbits, 9);
  assert.equal(params.clampParams({ orbits: -3 }).orbits, 3);
  assert.equal(params.clampParams({ eccentricity: 2 }).eccentricity, 0.65);
  assert.equal(params.clampParams({ tilt: 1000 }).tilt, 45);
  assert.equal(params.clampParams({ density: 'abc' }).density, 0.6);
  assert.equal(params.clampParams({}).orbits, 5);
});

test('clampParams：按 step 对齐，浮点不累积误差', () => {
  const p = params.clampParams({ orbits: 5.4, eccentricity: 0.283, density: 0.62, tilt: -7.6, palette: 1.8 });
  assert.equal(p.orbits, 5);
  assert.equal(p.eccentricity, 0.28);
  assert.equal(p.density, 0.6);
  assert.equal(p.tilt, -8);
  assert.equal(p.palette, 2);
});

test('clampParams：空白串 / 布尔 / 数组 / Infinity 一律回落默认值而非夹到下界', () => {
  assert.equal(params.clampParams({ orbits: ' ' }).orbits, 5);
  assert.equal(params.clampParams({ orbits: '\t\n' }).orbits, 5);
  assert.equal(params.clampParams({ orbits: '' }).orbits, 5);
  assert.equal(params.clampParams({ orbits: false }).orbits, 5);
  assert.equal(params.clampParams({ orbits: true }).orbits, 5);
  assert.equal(params.clampParams({ orbits: [5] }).orbits, 5);
  assert.equal(params.clampParams({ orbits: Infinity }).orbits, 5);
  assert.equal(params.clampParams({ density: '  ' }).density, 0.6);
  assert.equal(params.clampParams({ tilt: false }).tilt, 12);
  /* 合法数值字符串仍应被采纳 */
  assert.equal(params.clampParams({ orbits: ' 7 ' }).orbits, 7);
});

test('hashParams：同参数同 seed，改任一参数即改变 seed（无假阴性）', () => {
  const base = params.clampParams({});
  const seed = params.hashParams(base);
  assert.equal(seed, params.hashParams(params.clampParams({})));
  params.KEYS.forEach(key => {
    const changed = Object.assign({}, base, { [key]: base[key] + params.PARAM_SPEC[key].step });
    assert.notEqual(params.hashParams(changed), seed, `改动 ${key} 应改变 seed`);
  });
});

test('buildSystem：同参数得到逐字节相同的 system（确定性核心断言）', () => {
  const a = geometry.buildSystem({ orbits: 6, eccentricity: 0.4, density: 0.75, tilt: -20, palette: 1 });
  const b = geometry.buildSystem({ orbits: 6, eccentricity: 0.4, density: 0.75, tilt: -20, palette: 1 });
  assert.deepEqual(a, b);
  assert.equal(a.orbits.length, 6);
  assert.equal(a.starCount, a.orbits.reduce((s, o) => s + o.stars.length, 0));
});

test('buildSystem：所有坐标有限且落在画布内（含旋转后）', () => {
  const cases = [
    { orbits: 3, eccentricity: 0, density: 0.2, tilt: -45, palette: 0 },
    { orbits: 9, eccentricity: 0.65, density: 1, tilt: 45, palette: 2 },
    { orbits: 7, eccentricity: 0.33, density: 0.55, tilt: 0, palette: 1 }
  ];
  cases.forEach(raw => {
    const sys = geometry.buildSystem(raw);
    sys.orbits.forEach(orbit => {
      assert.ok(Number.isFinite(orbit.rx) && Number.isFinite(orbit.ry));
      assert.ok(orbit.rx > 0 && orbit.ry > 0);
      orbit.stars.forEach(star => {
        assert.ok(Number.isFinite(star.x) && Number.isFinite(star.y));
        assert.ok(star.x >= 0 && star.x <= sys.size, `x 越界: ${star.x}`);
        assert.ok(star.y >= 0 && star.y <= sys.size, `y 越界: ${star.y}`);
        assert.ok(star.r > 0 && star.tone >= 0 && star.tone < 3);
      });
    });
  });
});

test('buildSystem：密度提高不减少星体数（单调性）', () => {
  const low = geometry.buildSystem({ density: 0.2 }).starCount;
  const high = geometry.buildSystem({ density: 1 }).starCount;
  assert.ok(high > low);
});

test('buildSystem：离心率提高使轨道更扁', () => {
  const round = geometry.buildSystem({ eccentricity: 0, orbits: 5 });
  const flat = geometry.buildSystem({ eccentricity: 0.65, orbits: 5 });
  const idx = 2;
  assert.equal(round.orbits[idx].rx, round.orbits[idx].ry);
  assert.ok(flat.orbits[idx].ry < flat.orbits[idx].rx * 0.6);
});

test('配色：三套预设齐备，越界索引有安全回退', () => {
  assert.equal(palette.PALETTES.length, 3);
  assert.equal(palette.getPalette(0).id, 'midnight');
  assert.equal(palette.getPalette(99).id, palette.PALETTES[2].id);
  palette.PALETTES.forEach(p => assert.equal(p.star.length, 3));
});

test('配色：对比度达标（正文 >= 4.5:1，图形 >= 3:1），文档里的说法可被验证', () => {
  const lum = hex => {
    const h = hex.replace('#', '');
    const ch = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
      .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  palette.PALETTES.forEach(p => {
    assert.ok(ratio(p.text, p.bg) >= 4.5, `${p.id} 正文对比度不足`);
    assert.ok(ratio(p.muted, p.bg) >= 4.5, `${p.id} 次要文字对比度不足`);
    assert.ok(ratio(p.orbit, p.bg) >= 3, `${p.id} 轨道线对比度不足`);
    p.star.forEach((s, i) => assert.ok(ratio(s, p.bg) >= 3, `${p.id} 星体色 ${i} 对比度不足`));
  });
});

test('renderSvg：结构完整、确定性、且通过安全自检', () => {
  const sys = geometry.buildSystem({});
  const pal = palette.getPalette(0);
  const svg = render.renderSvg(sys, pal);
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.equal(svg, render.renderSvg(geometry.buildSystem({}), pal));
  const check = render.inspectSvg(svg);
  assert.equal(check.safe, true, `误报的安全项：${check.violations.join('、')}`);
  assert.equal(check.wellFormed, true);
});

test('renderSvg：文本转义生效，不产生可注入标签', () => {
  assert.equal(render.escapeXml('<script>"&\''), '&lt;script&gt;&quot;&amp;&apos;');
  const fake = Object.assign({}, palette.getPalette(0), { name: '<script>alert(1)</script>' });
  const svg = render.renderSvg(geometry.buildSystem({}), fake);
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.equal(render.inspectSvg(svg).safe, true);
});

test('inspectSvg：能拦住真实危险内容（无假阴性）', () => {
  const safe = render.renderSvg(geometry.buildSystem({}), palette.getPalette(0));
  const injections = [
    safe.replace('</svg>', '<script>alert(1)</script></svg>'),
    safe.replace('</svg>', '<image href="https://example.com/a.png"/></svg>'),
    safe.replace('</svg>', '<foreignObject><div/></foreignObject></svg>'),
    safe.replace('<rect', '<rect onload="alert(1)"'),
    safe.replace('</svg>', '<style>@font-face{font-family:x;src:url(https://e.com/f.woff)}</style></svg>'),
    safe.replace('</svg>', '<style>rect{fill:red}</style></svg>'),
    safe.replace('<svg ', '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg '),
    safe.replace('</svg>', '<!ENTITY x "y"></svg>')
  ];
  injections.forEach((bad, i) => {
    assert.equal(render.inspectSvg(bad).safe, false, `注入样本 ${i} 未被拦截`);
  });
});

test('color()：非法调色板值不会注入属性，回落到安全默认色', () => {
  /* 通过公开渲染入口验证：palette 颜色字段被污染后，产物不得出现注入标记 */
  const evil = Object.assign({}, palette.getPalette(0), {
    bg: '"/><text>INJECTED</text><rect fill="',
    text: 'red;fill:url(https://e.com/x)',
    star: ['"><script>x</script>', '#fff', '#000']
  });
  const svg = render.renderSvg(geometry.buildSystem({}), evil);
  assert.ok(!svg.includes('INJECTED'), '注入标记进入了产物');
  assert.ok(!svg.includes('<script'), '脚本进入了产物');
  assert.equal(render.inspectSvg(svg).safe, true, '净化后的产物应通过自检');
});

test('renderSvg：合法十六进制颜色（3/6/8 位）被保留', () => {
  const pal = Object.assign({}, palette.getPalette(0), { bg: '#abc', text: '#123456', accent: '#11223344' });
  const svg = render.renderSvg(geometry.buildSystem({}), pal);
  assert.ok(svg.includes('#abc'));
  assert.ok(svg.includes('#123456'));
  assert.ok(svg.includes('#11223344'));
});

test('inspectSvg：合法 SVG 命名空间不被误判为外部 URL', () => {
  const svg = render.renderSvg(geometry.buildSystem({}), palette.getPalette(1));
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.deepEqual(render.inspectSvg(svg).violations, []);
});

test('URL 编解码：往返一致，恶意/缺失输入走默认值', () => {
  const p = params.clampParams({ orbits: 7, eccentricity: 0.41, density: 0.85, tilt: -33, palette: 2 });
  assert.deepEqual(params.decodeParams('?' + params.encodeParams(p)), p);
  assert.deepEqual(params.decodeParams('?o=abc&e=<script>&d=&t=999'), params.clampParams({ tilt: 999 }));
  assert.deepEqual(params.decodeParams(''), params.clampParams({}));
});

test('decodeParams：百分号编码可解，坏的换码序列不抛错', () => {
  /* 外部分享链接可能被二次编码，也可能本身就是残缺的换码序列 */
  assert.equal(params.decodeParams('?o=7%20&t=-3').orbits, 7);
  assert.equal(params.decodeParams('?o=%37').orbits, 7);
  assert.doesNotThrow(() => params.decodeParams('?o=%E0%A4&e=%'));
  assert.deepEqual(params.decodeParams('?o=%E0%A4'), params.clampParams({}));
  /* 值里带等号时按首个等号切分，不丢内容 */
  assert.equal(params.decodeParams('?o=6=6').orbits, 5);
});
