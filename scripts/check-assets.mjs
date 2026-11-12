/* 素材/授权合规的确定性校验：纯函数式扫描，不依赖第三方库。
 * 分两套规则：
 *   - SVG 海报：禁止任何外部引用、脚本、内嵌字体、foreignObject（产物必须自足）。
 *   - HTML/CSS 页面：允许仓库内相对引用；禁止外部绝对 URL、脚本协议、内联事件、远程 @import。
 * 用法：node scripts/check-assets.mjs（CI 中也会执行）
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

/* SVG 命名空间 URI 是规范固定标识，不发起资源加载，检查前先归一化（避免假阳性） */
const NS = 'http://www.w3.org/2000/svg';
const NS_PLACEHOLDER = 'urn:orrery:svg-namespace';

const SVG_RULES = [
  { name: '外部脚本', re: /<script\b/i },
  { name: '内嵌字体 / @import', re: /@font-face|@import/i },
  { name: '外部图像 / foreignObject', re: /<image\b|<foreignObject\b/i },
  { name: '资源引用属性', re: /\b(?:href|xlink:href|src)\s*=/i },
  { name: '内联事件', re: /\son[a-z]+\s*=/i },
  { name: '脚本协议', re: /javascript:/i },
  { name: 'CSS url()', re: /url\s*\(/i },
  { name: '外部 URL', re: /https?:\/\//i }
];

const PAGE_RULES = [
  { name: '脚本协议', re: /javascript:/i },
  { name: '内联事件', re: /\son[a-z]+\s*=/i },
  { name: '远程 @import', re: /@import\s+(?:url\s*\()?\s*["']?https?:/i },
  { name: '远程 @font-face src', re: /src\s*:\s*url\s*\(\s*["']?https?:/i },
  { name: '外部绝对 URL（资源）', re: /(?:src|href)\s*=\s*["']https?:\/\//i }
];

function scan(label, text, rules, normalizeNs) {
  const source = normalizeNs ? String(text).split(NS).join(NS_PLACEHOLDER) : String(text);
  rules.forEach(rule => {
    if (rule.re.test(source)) failures.push(`${label}: 命中「${rule.name}」`);
  });
}

const posterDir = join(root, 'assets', 'posters');
if (!existsSync(posterDir)) {
  failures.push('assets/posters/ 不存在');
} else {
  const posters = readdirSync(posterDir).filter(f => f.endsWith('.svg'));
  if (posters.length < 3) failures.push(`内置海报不足 3 张（实际 ${posters.length}）`);
  posters.forEach(f => scan(`assets/posters/${f}`, readFileSync(join(posterDir, f), 'utf8'), SVG_RULES, true));
}

['index.html', 'style.css'].forEach(f => {
  const p = join(root, f);
  if (!existsSync(p)) { failures.push(`${f} 缺失`); return; }
  scan(f, readFileSync(p, 'utf8'), PAGE_RULES, false);
});

['ASSETS.md', 'CREDITS.md', 'LICENSE', 'README.md', 'CONTRIBUTING.md', 'CHANGELOG.md'].forEach(f => {
  if (!existsSync(join(root, f))) failures.push(`${f} 缺失`);
});

const assetsDoc = existsSync(join(root, 'ASSETS.md'))
  ? readFileSync(join(root, 'ASSETS.md'), 'utf8') : '';
if (!/零外部素材/.test(assetsDoc)) failures.push('ASSETS.md 未声明零外部素材');

if (failures.length) {
  console.error('素材校验未通过：');
  failures.forEach(f => console.error('  - ' + f));
  process.exit(1);
}
console.log('素材校验通过：内置海报自足无外部引用，页面仅引用仓库内相对路径，文档齐备。');
