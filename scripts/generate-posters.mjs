/* 生成仓库内置的三张示例海报。
 * 用法：npm run posters
 * 与页面使用同一套纯函数模块，保证「参数 -> 海报」完全可复现；
 * CI 会重新生并 diff，若输出与提交的版本不一致则失败。
 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const params = require('../src/params.js');
const geometry = require('../src/geometry.js');
const palette = require('../src/palette.js');
const exporter = require('../src/export.js');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'posters');
mkdirSync(outDir, { recursive: true });

const PRESETS = [
  { name: 'midnight', params: { orbits: 5, eccentricity: 0.28, density: 0.6, tilt: 12, palette: 0 } },
  { name: 'paper', params: { orbits: 7, eccentricity: 0.46, density: 0.8, tilt: -28, palette: 1 } },
  { name: 'mono', params: { orbits: 4, eccentricity: 0.62, density: 0.35, tilt: 36, palette: 2 } }
];

let written = 0;
for (const preset of PRESETS) {
  const p = params.clampParams(preset.params);
  const system = geometry.buildSystem(p);
  const svg = exporter.buildExportSvg(system, palette.getPalette(p.palette));
  const file = join(outDir, `orrery-${preset.name}.svg`);
  writeFileSync(file, svg + '\n', 'utf8');
  console.log(`written: assets/posters/orrery-${preset.name}.svg (${system.starCount} stars, seed ${system.seed})`);
  written += 1;
}
console.log(`done: ${written} posters`);
