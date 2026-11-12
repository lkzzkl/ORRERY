/* ORRERY / 星图 — 配色预设
 * 纯数据模块。三套配色均为项目自产，无任何字体文件、图片或外部资源。
 * 对比度按 WCAG 2.2 AA 校验：正文 text 对 bg >= 4.5:1，图形 orbit 对 bg >= 3:1。
 */
(function () {
  'use strict';

  var PALETTES = [
    {
      id: 'midnight',
      name: '深蓝夜航',
      bg: '#0d1b2a',
      surface: '#12263b',
      text: '#eef3f8',
      muted: '#a9bdd1',
      orbit: '#6f9dc7',
      star: ['#ffd6a5', '#9ad7e5', '#c9b6f2'],
      accent: '#ffd6a5'
    },
    {
      id: 'paper',
      name: '纸本星图',
      bg: '#f4efe3',
      surface: '#e9e1d1',
      text: '#1f2a33',
      muted: '#4d5a63',
      orbit: '#3f6b8a',
      star: ['#9c3b2e', '#2f6b57', '#34518f'],
      accent: '#9c3b2e'
    },
    {
      id: 'mono',
      name: '无色高对比',
      bg: '#0a0a0a',
      surface: '#1b1b1b',
      text: '#ffffff',
      muted: '#c9c9c9',
      orbit: '#8f8f8f',
      star: ['#ffffff', '#d0d0d0', '#a8a8a8'],
      accent: '#ffffff'
    }
  ];

  function getPalette(index) {
    var i = Math.round(Number(index));
    if (!isFinite(i)) i = 0;
    if (i < 0) i = 0;
    if (i > PALETTES.length - 1) i = PALETTES.length - 1;
    return PALETTES[i];
  }

  var api = { PALETTES: PALETTES, getPalette: getPalette };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.Orrery = window.Orrery || {};
    window.Orrery.palette = api;
  }
})();
