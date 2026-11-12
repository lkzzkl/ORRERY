/* ORRERY / 星图 — 导出与分享（浏览器侧）
 * 仅负责 Blob / Canvas / Clipboard，不含游戏规则。
 * 导出前强制调用 render.inspectSvg：不安全的 SVG 一律拒绝写出。
 */
(function (root, factory) {
  'use strict';
  var isNode = typeof module !== 'undefined' && module.exports;
  var deps = isNode
    ? { render: require('./render.js'), params: require('./params.js') }
    : { render: root.Orrery.render, params: root.Orrery.params };
  var api = factory(deps);
  if (isNode) module.exports = api;
  else { root.Orrery = root.Orrery || {}; root.Orrery.exporter = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deps) {
  'use strict';

  function buildExportSvg(system, palette) {
    /* 预览层使用的动画分组 class 对静态海报无意义，导出前剥离，保证产物自足且离线可开 */
    var svg = deps.render.renderSvg(system, palette)
      .replace(' class="orrery-starfield"', '');
    var check = deps.render.inspectSvg(svg);
    if (!check.safe || !check.wellFormed) {
      throw new Error('SVG 安全自检未通过：' + (check.violations.join('、') || '结构不完整'));
    }
    return svg;
  }

  function filename(params, ext) {
    var p = deps.params.clampParams(params);
    return 'orrery-o' + p.orbits + '-e' + p.eccentricity.toFixed(2) +
      '-d' + p.density.toFixed(2) + '-t' + p.tilt + '-p' + p.palette + '.' + ext;
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportSvg(system, palette) {
    var svg = buildExportSvg(system, palette);
    download(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename(system.params, 'svg'));
    return svg;
  }

  /* PNG 由同一份 SVG 经 Canvas 栅格化，保证「所见即所得」且无需第三方库 */
  function exportPng(system, palette, scale) {
    var svg = buildExportSvg(system, palette);
    var factor = Math.max(1, Math.min(4, Number(scale) || 2));
    var px = system.size * factor;
    var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = px;
        canvas.height = px;
        var ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D 上下文不可用')); return; }
        ctx.drawImage(img, 0, 0, px, px);
        canvas.toBlob(function (out) {
          URL.revokeObjectURL(url);
          if (!out) { reject(new Error('PNG 编码失败')); return; }
          download(out, filename(system.params, 'png'));
          resolve(out);
        }, 'image/png');
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('SVG 栅格化失败'));
      };
      img.src = url;
    });
  }

  function shareUrl(params, base) {
    /* 必须先剥离 fragment：若地址带 #hash 却没有查询串，只按 '?' 切分会把
       参数拼到 fragment 之后，浏览器不会把它们当作查询参数（分享链接失效）。 */
    var prefix = String(base || '').split('#')[0].split('?')[0];
    return prefix + '?' + deps.params.encodeParams(params);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      ok ? resolve() : reject(new Error('剪贴板不可用'));
    });
  }

  function presetJson(params) {
    return JSON.stringify(deps.params.clampParams(params), null, 2);
  }

  function readPreset(text) {
    var parsed = JSON.parse(String(text));
    return deps.params.clampParams(parsed);
  }

  return {
    buildExportSvg: buildExportSvg,
    filename: filename,
    exportSvg: exportSvg,
    exportPng: exportPng,
    shareUrl: shareUrl,
    copyText: copyText,
    presetJson: presetJson,
    readPreset: readPreset
  };
});
