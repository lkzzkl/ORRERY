# 架构说明

## 1. 技术形态

**纯静态矢量单页**：HTML + CSS + 原生 JavaScript（ES5 风格语法，无模块打包器、无框架、无构建步骤、零第三方依赖）。

- 页面：`index.html` 双击即开，`file://` 协议可用；也可直接部署到 GitHub Pages。
- 运行期：不发起任何网络请求，不写 localStorage 之外的持久状态（当前版本连 localStorage 也未使用）。
- Node 只用于开发期：单元测试、海报生成、素材校验、可选的本地预览服务器。
- 模块用「同时支持浏览器全局与 CommonJS `require`」的双环境包装，因此同一份源码既被页面加载，也被 Node 单测直接覆盖，无需转译或复制代码。

## 2. 分层与数据流

```
index.html（控件 / 预览容器 / 语义结构）
    ↓ 用户事件
src/main.js  ← 唯一接触 DOM 的装配层
    ↓ params.clampParams()
src/params.js     参数规格、夹取、FNV-1a 哈希、URL 编解码
    ↓ hashParams(seed)
src/prng.js       mulberry32 确定性伪随机数发生器
    ↓ buildSystem()
src/geometry.js   参数 → 轨道 / 星体几何（纯数据）
src/palette.js    三套自产配色（纯数据）
    ↓ renderSvg()
src/render.js     system → SVG 字符串、escapeXml、inspectSvg 安全自检
    ├──→ main.js → innerHTML 预览（renderPreview 去掉固定尺寸）
    └──→ export.js → 安全自检 → Blob 下载 / Canvas 栅格化 PNG / URL 分享 / JSON 预设
```

依赖方向单向向下，无循环。`src/` 中只有 `main.js` 与 `export.js` 的浏览器侧函数触碰 DOM；`prng / params / palette / geometry / render` 为纯函数或纯数据模块。

## 3. 架构决策记录（Architecture Decision Record, ADR）

### ADR-1：不引入构建步骤与模块打包器

- **决策**：用普通 `<script>` 顺序加载 + 双环境包装，而非 ES Modules / Vite / TypeScript。
- **理由**：`file://` 下 ES Modules 受 CORS 限制，无法「双击即开」；零构建让 GitHub Pages 直出、clone 后零命令可玩。
- **代价**：需手工维护 `index.html` 中的脚本顺序；无类型检查。
- **缓解**：`CONTRIBUTING.md` 明确顺序约定；单测覆盖模块接口；CI 保证回归。

### ADR-2：几何与渲染写成纯函数，DOM 只做装配

- **决策**：`buildSystem()` 返回纯数据对象，`renderSvg()` 返回字符串，均不触碰 DOM。
- **理由**：让「同参数同海报」可被 Node 直接断言；`npm run posters` 与页面使用同一套代码，产物不可能漂移。
- **代价**：预览动画只能作为 CSS 层叠加，不能进入导出数据。
- **缓解**：动画明确定义为装饰性、不改变几何；定格即关闭动画。

### ADR-3：导出前做输出安全自检，而非事后清洗

- **决策**：`inspectSvg()` 在导出前对最终 SVG 字符串做规则检查，不通过则抛错拒绝写出。
- **理由**：静态 SVG 一旦包含外部引用或脚本，离线可开性与授权干净度即被破坏；白名单式生成 + 黑名单式复核比「先生成再清洗」更可验证。
- **代价**：`xmlns` 命名空间 URI 需显式白名单，否则规则会误报。
- **缓解**：检查前把命名空间 URI 归一化为占位符；单测同时覆盖合法 SVG 不误报与 5 类注入样本不漏报。

### ADR-4：字体只用系统族名称，不打包字体文件

- **决策**：`font-family` 仅列 `ui-sans-serif, system-ui, ...` 等通用名称。
- **理由**：避免 SIL OFL 的保留字体名（RFN）、CJK 子集化修改合规、Web Font 嵌入与体积问题。
- **代价**：不同机器上字形略有差异。
- **缓解**：几何与配色完全确定；README 与 `docs/assets.md` 明确说明该限制。

## 4. 测试策略

| 层 | 文件 | 覆盖 |
|---|---|---|
| 纯函数单测 | `tests/geometry.test.js`（20 条） | PRNG 确定性、参数夹取与步长、非法输入回落、哈希敏感性、system 逐字节确定性、坐标边界、密度单调性、离心率、配色回退与对比度、SVG 结构与转义、颜色白名单净化、安全规则正反例、URL 编解码（含坏换码序列） |
| 导出层单测 | `tests/export.test.js`（9 条） | 文件名确定性、导出前安全自检、污染调色板净化、导出侧兜底门、分享链接、预设往返、描述串 |
| 页面烟雾测试 | `scripts/smoke.mjs` | 用最小 DOM 桩在 Node 中真实执行 `index.html` 引用的 7 个脚本；除初始化不抛错、预览产出 SVG、状态与统计写入外，还派发真实 `input`/`click` 事件，验证控件回调、定格、导出、复制链接、保存预设生效 |
| 产物一致性 | CI `git diff --exit-code -- assets/posters/` | 源码与内置海报不漂移 |
| 素材合规 | `scripts/check-assets.mjs` | 海报无外部引用、页面仅相对路径、文档齐备 |

共 29 条用例（另有页面级烟雾测试），全部使用 Node 内置 `node:test` 与 `node:assert`，无测试框架依赖。运行 `npm run check` 一次执行全部。

## 5. 复杂度与风险

复杂度档：**L1 极简**（8 个判定维度中 ≥6 项为 L1，无一项 ≥L3）：无状态机、无存档、无输入缓冲、无外部资源依赖、源文件 ≤10 个、首次可运行命令数 0。

| # | 风险 | 缓解 |
|---|---|---|
| 1 | 「无胜负」可能被判为小工具 | `docs/design.md` 明确定义玩法边界与自设目标；README 首屏直接给成品 |
| 2 | 观感依赖配色与排印 | 三套预设经对比度校验；生成逻辑与配色数据解耦，可独立替换 |
| 3 | 浏览器 SVG 栅格化差异影响 PNG | PNG 由同一份 SVG 生成；SVG 导出为首选、不依赖 Canvas |
| 4 | 不同系统字形差异 | 只用通用字体族；文字为辅助信息，几何为主体 |
| 5 | 脚本顺序被误改导致页面失效 | `index.html` 顺序固定、`CONTRIBUTING.md` 列明约定、CI 单测覆盖模块接口 |
| 6 | 外部输入注入（URL / JSON 预设） | 一律经 `clampParams()`；所有进入 SVG 的文本经 `escapeXml()`；导出前 `inspectSvg()` |

## 6. 工程卫生

| 项 | 落地 |
|---|---|
| 目录 | 纯前端单页模板裁剪：`src/` 纯逻辑、`render/` 合并进 `src/render.js`（体量不足以分层）、`assets/posters/`、`docs/`、`tests/`、`scripts/` |
| 依赖锁定 | 零第三方依赖，仍提交 `package-lock.json`（仅声明包本身，锁住 lockfileVersion 并支撑 CI 的 `cache: 'npm'`）；`package.json` 用 `engines.node` 钉定最低版本 |
| 可复现构建 | 无构建；`npm run posters` 是唯一产物生成步骤，CI 校验其输出 |
| CI | `.github/workflows/ci.yml`：Node 22、`npm test`、重生成海报、diff 校验、素材校验 |
| 版本 | SemVer，见 `CHANGELOG.md`；`v1.0.0` 为首个 Release |
| 在线演示 | GitHub Pages 天然适配（纯静态），需维护者在 Settings 手动开启 |
| 密钥 | 仓库不含任何凭据、API Key 或签名密钥 |
