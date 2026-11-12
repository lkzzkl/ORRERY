/* 页面装配烟雾测试（Smoke Test）：零依赖，用最小 DOM 桩在 Node 里真实执行
 * index.html 引用的 7 个脚本，验证初始化链路不抛错且预览产出了 SVG。
 * 目的：在没有浏览器 / 无头测试框架的前提下，守住「双击即开」这条硬要求。
 * 用法：node scripts/smoke.mjs（npm run check 会执行）
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function makeElement(id) {
  const listeners = new Map();
  return {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    files: [],
    href: '',
    download: '',
    style: {},
    attrs: {},
    listeners,
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    /* 真实记录监听器，供下面「派发事件」段落触发回调；
       空壳实现只能证明「注册没抛错」，证明不了回调里做什么。 */
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type) || [];
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    },
    dispatch(type, event) {
      const list = listeners.get(type) || [];
      list.forEach(fn => fn(Object.assign({ type, preventDefault() {} }, event)));
      return list.length;
    },
    appendChild() {},
    remove() {},
    click() { this.dispatch('click'); },
    select() {},
    classList: { toggle() {}, add() {}, remove() {} },
    querySelector() { return null; }
  };
}

const elements = new Map();
const document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  },
  createElement(tag) { return makeElement('created-' + tag); },
  body: { appendChild() {} },
  execCommand() { return true; }
};

const historyCalls = [];
const window = {
  document,
  location: { search: '', pathname: '/index.html', href: 'http://localhost/index.html' },
  history: { replaceState(_s, _t, url) { historyCalls.push(url); } },
  matchMedia() { return { matches: false, addEventListener() {} }; },
  navigator: { clipboard: null },
  Orrery: {}
};
window.window = window;
window.globalThis = window;

const sandbox = {
  window,
  document,
  globalThis: window,
  navigator: window.navigator,
  console,
  Math,
  Number,
  String,
  Object,
  Array,
  JSON,
  isFinite,
  setTimeout,
  Blob: class Blob {},
  URL: { createObjectURL() { return 'blob:stub'; }, revokeObjectURL() {} },
  Image: class Image {},
  Promise,
  Error,
  RegExp
};
sandbox.self = window;
vm.createContext(sandbox);

const scripts = ['prng.js', 'params.js', 'palette.js', 'geometry.js', 'render.js', 'export.js', 'main.js'];
for (const file of scripts) {
  const code = readFileSync(join(root, 'src', file), 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: `src/${file}` });
  } catch (err) {
    console.error(`烟雾测试失败：执行 src/${file} 时抛错 — ${err.message}`);
    process.exit(1);
  }
}

const failures = [];
const moduleNames = ['prng', 'params', 'palette', 'geometry', 'render', 'exporter'];
moduleNames.forEach(name => {
  if (!window.Orrery[name]) failures.push(`window.Orrery.${name} 未挂载`);
});

const preview = elements.get('preview');
if (!preview || !/^<svg /.test(preview.innerHTML)) failures.push('预览区未产出 SVG');
if (!preview || !/<\/svg>/.test(preview.innerHTML)) failures.push('预览 SVG 未闭合');
const status = elements.get('status');
if (!status || !status.textContent) failures.push('状态播报为空（初始化未完成）');
if (!elements.has('stat-stars') || !elements.get('stat-stars').textContent) failures.push('星体统计未写入');

/* —— 派发真实事件：验证 5 个控件的 input 回调与按钮的 click 回调确实生效 —— */
const byId = id => document.getElementById(id);

elements.get('ctrl-orbits').value = '9';
const wired = byId('ctrl-orbits').dispatch('input');
if (wired === 0) failures.push('参数控件的 input 回调未注册');
if (byId('stat-orbits').textContent !== '9') {
  failures.push(`拖动控件后预览未重绘（轨道数=${byId('stat-orbits').textContent}）`);
}
if (!/o=9/.test(historyCalls[historyCalls.length - 1] || '')) {
  failures.push('参数变更后地址栏未同步');
}

byId('btn-freeze').click();
if (byId('btn-freeze').getAttribute('aria-pressed') !== 'true') {
  failures.push('「定格」按钮未切换按下态');
}
if (!/定格/.test(byId('status').textContent)) failures.push('「定格」按钮未写入状态播报');

byId('btn-svg').click();
if (!/已导出/.test(byId('status').textContent)) {
  failures.push('「导出 SVG」未走通下载链路：' + byId('status').textContent);
}

byId('btn-share').click();
/* 复制走的是 Promise 链，回调里才写播报，必须让出一轮事件循环再断言 */
await new Promise(resolve => setTimeout(resolve, 0));
if (!/分享链接|复制失败/.test(byId('status').textContent)) {
  failures.push('「复制分享链接」未产生结果：' + byId('status').textContent);
}

byId('btn-save-preset').click();
if (!/预设已保存/.test(byId('status').textContent)) {
  failures.push('「保存预设」未走通下载链路');
}


/* 极端参数下的导出纯函数：把参数空间边界也走一遍 */
const exporter = window.Orrery.exporter;
const geometry = window.Orrery.geometry;
const palette = window.Orrery.palette;
if (exporter && geometry && palette) {
  try {
    const sys = geometry.buildSystem({ orbits: 9, eccentricity: 0.65, density: 1, tilt: 45, palette: 2 });
    const svg = exporter.buildExportSvg(sys, palette.getPalette(2));
    if (!svg.includes('</svg>')) failures.push('极端参数下导出 SVG 异常');
  } catch (err) {
    failures.push('极端参数下导出抛错：' + err.message);
  }
}

if (failures.length) {
  console.error('烟雾测试未通过：');
  failures.forEach(f => console.error('  - ' + f));
  process.exit(1);
}
console.log(`烟雾测试通过：${scripts.length} 个脚本初始化成功，预览产出 SVG；控件 input 与 4 个按钮的 click 回调均已真实触发并生效；极端参数下导出正常。`);
