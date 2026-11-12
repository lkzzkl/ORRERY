# 贡献指南

## 环境

零依赖、零构建。只需要 Node >= 18 用于测试与脚本；直接双击 `index.html` 即可运行页面。

```bash
npm test              # 单元测试
npm run smoke         # 页面装配烟雾测试
npm run posters       # 重新生成内置海报
npm run check-assets  # 素材与授权校验
npm run check         # 以上全部（交付前跑这条）
npm run serve         # 可选：本地 http 预览
```

## 提交前自检

| # | 检查项 | 判据 |
|---|---|---|
| 1 | `npm run check` 全绿 | 29 条单测 + 烟雾测试通过，海报可复现，素材校验通过 |
| 2 | 确定性未被破坏 | 同一组参数生成的 `system` 与 SVG 逐字节不变；若有意改变几何，须同步 `npm run posters` 并提交新海报 |
| 3 | 纯函数边界 | `src/prng.js`、`params.js`、`palette.js`、`geometry.js`、`render.js` 不得引入 DOM / 网络 / 时间随机源 |
| 4 | 新增规则必配单测 | 夹取、量级换算、规则判定写成显式纯函数，并同时给出正例与反例断言 |
| 5 | 输出安全 | 任何进入 SVG 的文本经 `escapeXml()`、颜色经 `color()` 校验、尺寸强制有限正数；导出前 `inspectSvg()` 必须通过 |
| 6 | 素材登记 | 新增任何非自产素材先在 `ASSETS.md` 登记全部字段，许可证全文放 `licenses/` |
| 7 | 控件红线 | 可见参数控件不超过 5 个 |
| 8 | 可访问性 | 保持对比度（`tests/geometry.test.js` 有逐色断言）、焦点可见、44px 命中区、不把颜色当唯一编码、`prefers-reduced-motion` |
| 9 | 烟雾测试同步 | 新增控件或按钮时，在 `scripts/smoke.mjs` 里补一条真实事件派发断言，别只验证「注册没抛错」 |

## 代码约定

- 模块采用「同时支持浏览器全局与 Node `require`」的双环境包装，不引入打包器。
- 参数范围、步长、默认值集中在 `src/params.js` 的 `PARAM_SPEC`，不在多处硬编码。
- 所有单位与量级换算集中在纯函数内，禁止在运行时靠字符串推断。
- 中文注释 + 关键术语首次出现保留英文原文。提交信息用中文，格式：`类型：简述`，类型取 ` feat / fix / docs / test / refactor / chore` 之一。

## 明确不接受的改动

| 改动 | 原因 |
|---|---|
| 引入胜负、评分、关卡、账号、云存档 | 与「无胜负、无进度」的设计支柱冲突 |
| 增加第 6 个可见参数控件 | 超过认知过载红线 |
| 打包第三方字体、图标库或位图 | 破坏零外部素材与授权干净度 |
| 引入前置构建步骤或运行时框架 | 破坏「双击即开、GitHub Pages 直出」 |
| 提交 CC-BY-NC / CC-BY-SA / EULA 未核素材 | 与 MIT 分层授权冲突 |
| 提交构建产物、导出缓存、编辑器配置 | 见 `.gitignore` |

## 分支与 PR

1. 从 `main` 建分支，命名 `类型/简述`，如 `fix/clamp-empty-input`。
2. PR 描述关联 Issue，附 `npm run check` 输出与（若影响视觉）海报截图。
3. CI 必须通过；`git diff --exit-code -- assets/posters/` 失败说明海报与源码不同步，先跑 `npm run posters`。
4. 缺陷报告请填 `.github/ISSUE_TEMPLATE/bug_report.md`，含复现步骤、参数组合、浏览器与系统版本。
