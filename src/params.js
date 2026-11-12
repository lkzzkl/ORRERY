/* ORRERY / 星图 — 参数规格、夹取规则与确定性哈希
 * 纯函数模块。所有「单位换算 / 量级 / 规则判定」集中在此，不靠运行时推断。
 */
(function () {
  'use strict';

  /* 五个可见控件。min/max/step/default 全部显式声明，单位写进注释。 */
  var PARAM_SPEC = {
    orbits: { min: 3, max: 9, step: 1, def: 5, label: '轨道数', unit: '条' },
    eccentricity: { min: 0, max: 0.65, step: 0.01, def: 0.28, label: '离心率', unit: '' },
    density: { min: 0.2, max: 1, step: 0.05, def: 0.6, label: '密度', unit: '' },
    tilt: { min: -45, max: 45, step: 1, def: 12, label: '倾角', unit: '度' },
    palette: { min: 0, max: 2, step: 1, def: 0, label: '配色', unit: '' }
  };

  var KEYS = ['orbits', 'eccentricity', 'density', 'tilt', 'palette'];

  /* 夹取到 [min,max] 并对齐 step。使用整数步数做运算，避免浮点累积误差。 */
  function clampParams(raw) {
    var out = {};
    KEYS.forEach(function (key) {
      var spec = PARAM_SPEC[key];
      var input = raw && raw[key];
      /* 外部输入中的 null / 空白串 / 布尔 / 数组 / 非数值一律视为「缺失」回落默认值。
         不能被 Number() 静默转成 0 而错误地夹到下界：Number(' ') === 0、
         Number(false) === 0、Number([5]) === 5 都会给出误导性结果。 */
      var value = NaN;
      if (typeof input === 'number') {
        value = input;
      } else if (typeof input === 'string') {
        var trimmed = input.trim();
        value = trimmed === '' ? NaN : Number(trimmed);
      }
      if (!isFinite(value)) value = spec.def;
      var steps = Math.round((value - spec.min) / spec.step);
      var minSteps = 0;
      var maxSteps = Math.round((spec.max - spec.min) / spec.step);
      if (steps < minSteps) steps = minSteps;
      if (steps > maxSteps) steps = maxSteps;
      var clamped = spec.min + steps * spec.step;
      out[key] = Math.round(clamped * 100) / 100;
    });
    return out;
  }

  /* 规范串：顺序固定、小数位固定，保证同一组参数永远得到同一个 seed。 */
  function canonical(params) {
    var p = clampParams(params);
    return KEYS.map(function (key) {
      return key + '=' + p[key].toFixed(2);
    }).join(';');
  }

  /* FNV-1a 32 位哈希，纯函数、无随机源。 */
  function hashParams(params) {
    var str = canonical(params);
    var hash = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }

  function describe(params) {
    var p = clampParams(params);
    return 'ORBITS ' + p.orbits + ' / ECC ' + p.eccentricity.toFixed(2) +
      ' / DENSITY ' + p.density.toFixed(2) + ' / TILT ' + p.tilt +
      ' / PALETTE ' + p.palette + ' / SEED ' + hashParams(p);
  }

  /* URL 分享用：短键名，解码时同样走 clampParams，不信任外部输入。 */
  var QUERY_KEYS = { o: 'orbits', e: 'eccentricity', d: 'density', t: 'tilt', p: 'palette' };

  function encodeParams(params) {
    var p = clampParams(params);
    var parts = [];
    Object.keys(QUERY_KEYS).forEach(function (short) {
      parts.push(short + '=' + p[QUERY_KEYS[short]]);
    });
    return parts.join('&');
  }

  /* 外部链接可能带百分号编码（如 `?o=7%20`），或干脆是坏的换码序列（`%E0%A4`）。
     坏的序列会让 decodeURIComponent 抛错，这里必须兜住，否则一个畸形分享链接
     就能让整页初始化中断。解不出来就退回原串，交给 clampParams 走默认值。 */
  function safeDecode(text) {
    var str = String(text == null ? '' : text);
    try {
      return decodeURIComponent(str);
    } catch (err) {
      return str;
    }
  }

  function decodeParams(query) {
    var raw = {};
    String(query || '').replace(/^\?/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var eq = pair.indexOf('=');
      var key = QUERY_KEYS[eq === -1 ? pair : pair.slice(0, eq)];
      /* 值里可能含 '='，按首个等号切分后整体保留 */
      if (key) raw[key] = safeDecode(eq === -1 ? '' : pair.slice(eq + 1));
    });
    return clampParams(raw);
  }

  var api = {
    PARAM_SPEC: PARAM_SPEC,
    KEYS: KEYS,
    clampParams: clampParams,
    canonical: canonical,
    hashParams: hashParams,
    describe: describe,
    encodeParams: encodeParams,
    decodeParams: decodeParams
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.Orrery = window.Orrery || {};
    window.Orrery.params = api;
  }
})();
