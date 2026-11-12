/* ORRERY / 星图 — 参数到几何的确定性映射
 * 纯函数：同一组参数永远得到同一个 system 对象与同一张海报。
 * 无 DOM、无随机源之外的状态、无外部资源。
 */
(function (root, factory) {
  'use strict';
  var isNode = typeof module !== 'undefined' && module.exports;
  var deps = isNode
    ? { prng: require('./prng.js'), params: require('./params.js') }
    : { prng: root.Orrery.prng, params: root.Orrery.params };
  var api = factory(deps);
  if (isNode) module.exports = api;
  else { root.Orrery = root.Orrery || {}; root.Orrery.geometry = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deps) {
  'use strict';

  var SIZE = 1200;               /* 海报画布边长，SVG 用户单位 */
  var CENTER = SIZE / 2;
  var MAX_RADIUS = 470;         /* 最外层轨道长半轴上限 */
  var MIN_SCALE = 0.26;         /* 最内层轨道长半轴相对上限的比例 */

  function degToRad(deg) { return deg * Math.PI / 180; }

  /* 椭圆参数方程 + 平面旋转。全部为显式公式，不靠运行时推断。 */
  function pointOnOrbit(orbit, angle) {
    var x = orbit.rx * Math.cos(angle);
    var y = orbit.ry * Math.sin(angle);
    var c = Math.cos(orbit.rotation);
    var s = Math.sin(orbit.rotation);
    return {
      x: CENTER + x * c - y * s,
      y: CENTER + x * s + y * c
    };
  }

  function buildSystem(rawParams) {
    var p = deps.params.clampParams(rawParams);
    var seed = deps.params.hashParams(p);
    var rand = deps.prng.mulberry32(seed);
    var orbits = [];

    for (var i = 0; i < p.orbits; i++) {
      var scale = MIN_SCALE + (1 - MIN_SCALE) * ((i + 1) / p.orbits);
      var rx = MAX_RADIUS * scale;
      var ry = rx * (1 - 0.72 * p.eccentricity);
      /* 倾角随轨道序号线性展开，叠加一个确定性的微小扰动 */
      var tiltRad = degToRad(p.tilt) * (i - (p.orbits - 1) / 2) / Math.max(1, p.orbits - 1);
      var jitter = (rand() - 0.5) * 0.18;
      var orbit = {
        index: i,
        rx: rx,
        ry: ry,
        rotation: tiltRad + jitter,
        stars: []
      };

      var count = Math.round(2 + p.density * (3 + i));
      for (var j = 0; j < count; j++) {
        var angle = (j / count) * Math.PI * 2 + (rand() - 0.5) * 0.5;
        var pos = pointOnOrbit(orbit, angle);
        orbit.stars.push({
          x: pos.x,
          y: pos.y,
          r: 3.2 + rand() * 7.5,
          tone: Math.floor(rand() * 3),
          ring: rand() > 0.76
        });
      }
      orbits.push(orbit);
    }

    return {
      size: SIZE,
      center: CENTER,
      seed: seed,
      params: p,
      orbits: orbits,
      starCount: orbits.reduce(function (sum, o) { return sum + o.stars.length; }, 0)
    };
  }

  /* 固定刻度环：24 条短线， purely decorative & deterministic */
  function buildTicks() {
    var ticks = [];
    for (var i = 0; i < 24; i++) {
      var a = (i / 24) * Math.PI * 2;
      var inner = 512;
      var outer = i % 6 === 0 ? 536 : 523;
      ticks.push({
        x1: CENTER + inner * Math.cos(a),
        y1: CENTER + inner * Math.sin(a),
        x2: CENTER + outer * Math.cos(a),
        y2: CENTER + outer * Math.sin(a),
        major: i % 6 === 0
      });
    }
    return ticks;
  }

  return {
    SIZE: SIZE,
    CENTER: CENTER,
    MAX_RADIUS: MAX_RADIUS,
    buildSystem: buildSystem,
    buildTicks: buildTicks,
    pointOnOrbit: pointOnOrbit
  };
});
