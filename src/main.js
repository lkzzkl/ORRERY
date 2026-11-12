/* ORRERY / 星图 — 页面装配层（唯一接触 DOM 的模块）
 * 职责：读取控件 -> 组装 system -> 重绘预览；按钮触发导出 / 定格 / 分享。
 * 无游戏规则、无构建步骤、零第三方依赖。
 */
(function () {
  'use strict';

  var O = window.Orrery;
  var params = O.params;
  var palette = O.palette;
  var geometry = O.geometry;
  var render = O.render;
  var exporter = O.exporter;

  var CONTROL_IDS = {
    orbits: 'ctrl-orbits',
    eccentricity: 'ctrl-eccentricity',
    density: 'ctrl-density',
    tilt: 'ctrl-tilt',
    palette: 'ctrl-palette'
  };

  var state = {
    params: params.decodeParams(window.location.search),
    frozen: false,
    motion: true
  };

  var el = {
    preview: document.getElementById('preview'),
    status: document.getElementById('status'),
    freeze: document.getElementById('btn-freeze'),
    motion: document.getElementById('btn-motion'),
    random: document.getElementById('btn-random'),
    svg: document.getElementById('btn-svg'),
    png: document.getElementById('btn-png'),
    share: document.getElementById('btn-share'),
    savePreset: document.getElementById('btn-save-preset'),
    loadPreset: document.getElementById('btn-load-preset'),
    fileInput: document.getElementById('file-preset'),
    starCount: document.getElementById('stat-stars'),
    orbitCount: document.getElementById('stat-orbits'),
    seed: document.getElementById('stat-seed')
  };

  function announce(message) {
    el.status.textContent = message;
  }

  function currentSystem() {
    return geometry.buildSystem(state.params);
  }

  function currentPalette() {
    return palette.getPalette(state.params.palette);
  }

  function syncControls() {
    params.KEYS.forEach(function (key) {
      var input = document.getElementById(CONTROL_IDS[key]);
      input.value = state.params[key];
      var out = document.getElementById('out-' + key);
      if (key === 'palette') {
        out.textContent = palette.getPalette(state.params.palette).name;
      } else {
        out.textContent = input.value + (params.PARAM_SPEC[key].unit || '');
      }
    });
  }

  function draw() {
    var system = currentSystem();
    var pal = currentPalette();
    var svg = render.renderPreview(system, pal);
    var check = render.inspectSvg(svg);
    if (!check.safe) {
      announce('预览生成被拒绝：' + check.violations.join('、'));
      return;
    }
    el.preview.innerHTML = svg;
    el.starCount.textContent = String(system.starCount);
    el.orbitCount.textContent = String(system.orbits.length);
    el.seed.textContent = String(system.seed);
    applyMotion();
  }

  function applyMotion() {
    var root = document.getElementById('stage');
    root.classList.toggle('is-frozen', state.frozen);
    /* 尊重系统减少动效偏好：用户开启的动效不得覆盖系统设置 */
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.toggle('no-motion', reduce || !state.motion || state.frozen);
    el.motion.setAttribute('aria-pressed', String(state.motion));
    el.freeze.setAttribute('aria-pressed', String(state.frozen));
    el.motion.textContent = state.motion ? '关闭公转' : '开启公转';
    el.freeze.textContent = state.frozen ? '解除定格' : '定格';
  }

  function updateFromControls() {
    var raw = {};
    params.KEYS.forEach(function (key) {
      raw[key] = document.getElementById(CONTROL_IDS[key]).value;
    });
    state.params = params.clampParams(raw);
    syncControls();
    draw();
    syncUrl();
  }

  function syncUrl() {
    /* file:// 协议下 history.replaceState 可能抛 SecurityError。
       地址栏同步只是便利功能，失败时不得中断页面初始化（双击即开是硬要求）。 */
    try {
      var next = window.location.pathname + '?' + params.encodeParams(state.params);
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', next);
      }
    } catch (err) {
      /* 忽略：预览、导出、分享链接均不依赖地址栏写入 */
    }
  }

  params.KEYS.forEach(function (key) {
    var input = document.getElementById(CONTROL_IDS[key]);
    input.addEventListener('input', updateFromControls);
    input.addEventListener('change', updateFromControls);
  });

  el.freeze.addEventListener('click', function () {
    state.frozen = !state.frozen;
    applyMotion();
    announce(state.frozen ? '已定格，装饰性公转已停止，可导出当前星图。' : '已解除定格。');
  });

  el.motion.addEventListener('click', function () {
    state.motion = !state.motion;
    applyMotion();
    announce(state.motion ? '已开启缓慢公转。' : '已关闭缓慢公转。');
  });

  el.random.addEventListener('click', function () {
    var spec = params.PARAM_SPEC;
    function pick(key) {
      var s = spec[key];
      var steps = Math.floor(Math.random() * (Math.round((s.max - s.min) / s.step) + 1));
      return Math.round((s.min + steps * s.step) * 100) / 100;
    }
    state.params = params.clampParams({
      orbits: pick('orbits'),
      eccentricity: pick('eccentricity'),
      density: pick('density'),
      tilt: pick('tilt'),
      palette: pick('palette')
    });
    syncControls();
    draw();
    syncUrl();
    announce('已生成一组新参数。');
  });

  el.svg.addEventListener('click', function () {
    try {
      exporter.exportSvg(currentSystem(), currentPalette());
      announce('SVG 海报已导出。');
    } catch (err) {
      announce('导出失败：' + err.message);
    }
  });

  el.png.addEventListener('click', function () {
    el.png.disabled = true;
    exporter.exportPng(currentSystem(), currentPalette(), 2)
      .then(function () { announce('PNG 海报已导出（2400 × 2400）。'); })
      .catch(function (err) { announce('PNG 导出失败：' + err.message); })
      .finally(function () { el.png.disabled = false; });
  });

  el.share.addEventListener('click', function () {
    var url = exporter.shareUrl(state.params, window.location.href);
    exporter.copyText(url)
      .then(function () { announce('分享链接已复制：' + url); })
      .catch(function (err) { announce('复制失败：' + err.message + '；链接为 ' + url); });
  });

  el.savePreset.addEventListener('click', function () {
    var blob = new Blob([exporter.presetJson(state.params)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'orrery-preset.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    announce('参数预设已保存为 JSON。');
  });

  el.loadPreset.addEventListener('click', function () { el.fileInput.click(); });
  el.fileInput.addEventListener('change', function () {
    var file = el.fileInput.files && el.fileInput.files[0];
    if (!file) return;
    file.text().then(function (text) {
      state.params = exporter.readPreset(text);
      syncControls();
      draw();
      syncUrl();
      announce('参数预设已载入。');
    }).catch(function (err) {
      announce('预设载入失败：' + err.message);
    }).finally(function () { el.fileInput.value = ''; });
  });

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.addEventListener) mq.addEventListener('change', applyMotion);
  }

  syncControls();
  draw();
  syncUrl();
  announce('星图已就绪。调整参数后点「定格」并导出海报。');
})();
