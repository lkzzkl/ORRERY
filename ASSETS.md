# 素材来源与许可登记（ASSETS.md）

> 本仓库为**零外部素材**项目：所有视觉产物由源码程序化生成，不下载、不打包、不分发任何第三方图片、音频、字体或 AI 生成物。
> 代码许可与素材许可**分层声明**：`LICENSE` 仅覆盖源代码；本文件逐项覆盖素材与产物。

## 分层授权声明

| 范围 | 适用许可 | 位置 |
|---|---|---|
| 源代码（`src/`、`scripts/`、`index.html`、`style.css`、测试） | MIT | `LICENSE` |
| 程序化生成的海报与页面内图形 | 项目自产，随代码 MIT 授权 | `assets/posters/`、`src/render.js` |
| 玩家导出的海报 | 由玩家自产；仓库不主张权利 | 不入库 |
| 字体 | 仅调用系统字体族名称，**不打包字体文件** | `src/render.js`、`style.css` |
| 项目名 / 商标 | 不在开源授权范围内 | — |

**明确不在开源授权范围内的内容**：无。仓库不含专有素材、AI 生成物、第三方商标图形或未随仓库分发的构建期资源。

## 逐项登记

| 素材名 | 作者 | 来源 URL | 许可 | 修改说明 | 使用位置 | 获取日期 |
|---|---|---|---|---|---|---|
| `assets/posters/orrery-midnight.svg` | 项目自产（由 `scripts/generate-posters.mjs` 生成） | 本仓库源码，无外部 URL | MIT（随代码） | 无外部素材；`npm run posters` 可重生成 | README 首屏 | 2026-11-12 |
| `assets/posters/orrery-paper.svg` | 项目自产（同上） | 本仓库源码，无外部 URL | MIT（随代码） | 同上 | README 配色展示 | 2026-11-12 |
| `assets/posters/orrery-mono.svg` | 项目自产（同上） | 本仓库源码，无外部 URL | MIT（随代码） | 同上 | README 配色展示 | 2026-11-12 |
| 页面内星图 SVG | 项目自产（运行时生成） | `src/render.js` | MIT（随代码） | 运行时按参数生成 | `index.html` 预览区 | 运行时 |
| 三套配色数值 | 项目自产 | `src/palette.js` | MIT（随代码） | 自建色值，未抄用第三方配色方案 | 全局 | 2026-11-12 |
| 系统字体族 | 操作系统提供 | 无（仅 `font-family` 名称引用） | 不适用（未打包字体文件） | 未嵌入、未子集化、未分发 | `src/render.js`、`style.css` | — |
| 音效 / 音乐 | 无 | — | — | 本作不含任何音频素材 | — | — |
| AI 生成图像 / 音频 | 无 | — | — | 本作不含任何 AI 生成内容 | — | — |
| 第三方图标 / 位图 / 矢量包 | 无 | — | — | 未引入任何图标库或素材包 | — | — |

**本仓库无第三方素材需要署名。** 保留本文件是为了让「无外部素材」成为可核对的事实，而非一句未声明的默认值。

## 产物自足性规则

导出的 SVG 海报必须满足以下全部条件，`src/render.js` 的 `inspectSvg()` 与 `scripts/check-assets.mjs` 会在导出时和 CI 中双重校验：

| # | 禁止项 | 原因 |
|---|---|---|
| 1 | `<script>`、内联事件属性、`javascript:` | 防止静态文件被当作可执行载体 |
| 2 | `<image>`、`<foreignObject>`、`href` / `src` 属性 | 防止引用外部资源，保证离线可开 |
| 3 | `@font-face`、`@import`、CSS `url()` | 不嵌入或远程加载字体 |
| 4 | 任何 `https?://` URL（`xmlns` 命名空间标识除外） | 命名空间 URI 是规范固定标识，不发起网络请求 |
| 5 | 未转义的动态文本 | 所有文本经 `escapeXml()` 处理 |

`xmlns="http://www.w3.org/2000/svg"` 是唯一的白名单 URL：检查前会被归一化为占位符，避免把合法 SVG 误判为含外部引用（防假阳性）。同时 `tests/geometry.test.js` 含真实注入样本，验证规则不会漏报（防假阴性）。

## 新增素材的约定

1. 新增任何非自产素材，必须先在 `ASSETS.md` 登记全部字段，并把许可证全文放入 `licenses/`。
2. 禁止提交 CC-BY-NC、CC-BY-SA 或 EULA 未核实的素材：公开仓库等于向公众再分发，NC 与 SA 条款会与 MIT 冲突。
3. 字体只能引用系统字体族名称；如需打包字体文件，必须使用 SIL OFL 并附 `OFL.txt` 全文、核对保留字体名（Reserved Font Name, RFN）。
4. 引入图标库须逐条登记其许可（注意混合授权，如「图标 CC-BY + 代码 MIT + 字体 OFL」）。
5. 新增素材后必须运行 `npm run check-assets`，并在 PR 中附上校验输出。

详见 [docs/assets.md](docs/assets.md) 与 [CONTRIBUTING.md](CONTRIBUTING.md)。
