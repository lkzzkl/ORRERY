/* ORRERY / 星图 — 确定性伪随机数发生器（Pseudo-Random Number Generator, PRNG）
 * 纯函数模块：既可在浏览器以 <script> 加载，也可在 Node 以 require 加载做单测。
 * 零依赖。同一 seed 必然产生同一数列，保证参数 -> 海报可复现。
 */
(function () {
  'use strict';

  /* mulberry32：32 位状态、无隐式全局状态的确定性发生器 */
  function mulberry32(seed) {
    var state = Number.isFinite(seed) ? (seed >>> 0) : 1;
    return function next() {
      state = (state + 0x6D2B79F5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var api = { mulberry32: mulberry32 };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.Orrery = window.Orrery || {};
    window.Orrery.prng = api;
  }
})();
