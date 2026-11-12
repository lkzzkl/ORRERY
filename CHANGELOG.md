# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/) 与语义化版本（Semantic Versioning, SemVer）。版本号格式 `vMAJOR.MINOR.PATCH`。

## [1.0.0] - 2026-11-12

首个可发布版本：最小可玩版本（Minimum Viable Product, MVP）全部 Must 项完成，另含部分 Should / Could 项。

### 新增

- 五个参数控件：轨道数、离心率、密度、倾角、配色；全部经 `clampParams()` 显式夹取与步长对齐。
- 确定性几何生成：`mulberry32` 伪随机数发生器 + FNV-1a 参数哈希，同参数永远同海报。
- 实时 SVG 预览、缓慢公转装饰动效（可关闭，尊重 `prefers-reduced-motion`）。
- 「定格」、SVG 海报导出、PNG 海报导出（同源 SVG 经 Canvas 栅格化，2400 × 2400）。
- 三套自产配色，含一套无色高对比方案。
- 参数预设 JSON 保存/载入、URL 参数分享链接、随机参数生成。
- 输出安全自检 `inspectSvg()`：导出前拦截外部 URL、脚本、foreignObject、内嵌字体、内联事件、DOCTYPE/实体声明与内联样式表。
- 29 条单元测试：确定性、夹取规则、坐标边界、单调性、配色对比度、SVG 安全规则的正反向验证、URL 编解码、导出层。
- 三张内置示例海报，由 `npm run posters` 用同一套纯函数生成，CI 用 `git diff --exit-code` 保证可复现。
- 完整仓库文档：README、LICENSE（MIT）、ASSETS.md、CREDITS.md、CONTRIBUTING.md、docs/ 三份说明、tests/README.md、Issue / PR 模板、CI workflow。
- 可访问性 Standard 基线：对比度（逐色断言）、不把颜色当唯一编码（另有无色高对比配色 + 文字信息）、可见焦点、44px 命中区、键盘全流程、SVG 文本替代、减少动效。

### 修复（开发期）

| # | 缺陷 | 处理 | 回归覆盖 |
|---|---|---|---|
| 1 | `clampParams()` 把 `null` 与空串经 `Number()` 静默转成 `0` 并夹到下界 | 统一视为「缺失」回落默认值 | URL 解码、预设载入两条单测 |
| 2 | `inspectSvg()` 把合法的 `xmlns` 命名空间 URI 误判为外部 URL | 检查前归一化为占位符，显式白名单 | 合法 SVG 不误报断言 |
| 3 | `file://` 下 `history.replaceState` 抛 `SecurityError` 会中断页面初始化 | `syncUrl()` 加异常保护；同时移除预览容器的 `aria-hidden`，让 SVG 内 `<title>/<desc>` 可被辅助技术读取 | 无头浏览器 `file://` 实拍 + 烟雾测试 |
| 4 | CI 的 `setup-node` 使用 `cache: 'npm'` 但零依赖仓库没有 lock 文件 | 补 `package-lock.json`，同步修正文档中「无 lock 文件」的陈述 | CI 前置文件核对 |
| 5 | `shareUrl()` 只按 `?` 切分，地址带 fragment 却无查询串时会把参数拼到 fragment 之后 | 先剥离 `#` 再剥离 `?` | 新增 2 条分享链接断言 |
| 6 | 调色板颜色字段直接拼进 SVG 属性，被外部来源污染时可闭合引号注入任意标记 | 生成侧加 `color()` 白名单校验（仅接受 `#hex`），非法值回落安全色 | 污染调色板不注入断言 + 合法 hex 保留断言 |
| 7 | `inspectSvg()` 对 `<!DOCTYPE>` / `<!ENTITY>`（XXE 面）与 `<style>` 存在假阴性 | 黑名单扩至 10 条 | 3 类新注入样本必须被拦 |
| 8 | `clampParams()` 对空白串 / 布尔 / 数组 / `Infinity` 仍会经 `Number()` 得到误导值 | 改为显式类型分支，非数值一律视为缺失 | 9 条输入回落断言 |
| 9 | `decodeParams()` 不解百分号编码，遇到坏换码序列（如 `%E0%A4`）会抛错中断初始化 | 加 `safeDecode()` 兜底，并按首个等号切分 | 编码/坏序列/含等号值 3 条断言 |
| 10 | 烟雾测试的 DOM 桩把 `addEventListener` 写成空函数，只能证明「注册没抛错」，证明不了回调内容 | 桩内记录监听器并支持派发事件；补控件 `input` 与 4 个按钮 `click` 的真实触发断言 | `npm run smoke` 直接覆盖 |
| 11 | `system.size` 未强制数值就拼进 `viewBox/width/height` 属性 | 强制为有限正数，异常回落 1200 | 由 `color()`/`size` 加固后导出侧兜底门仍有独立断言 |

### 已知限制

- 无胜负、无进度、深度有限：这是设计取舍。
- PNG 导出依赖浏览器 Canvas；SVG 导出不依赖额外能力。
- 海报文字只用系统字体族名称，不同机器字形略有差异，几何完全一致。
- GitHub Pages 需仓库维护者在 Settings 中手动开启。

<!-- Release 链接：仓库上线后指向此处 -->
[1.0.0]: https://github.com/lkzzkl/ORRERY/releases/tag/v1.0.0
