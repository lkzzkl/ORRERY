## 关联 Issue

Closes #

## 改动内容

## 自检清单

- [ ] `npm run check` 全绿，输出已贴在下方
- [ ] 若改动几何 / 配色 / 渲染，已运行 `npm run posters` 并提交新海报
- [ ] 纯函数模块（`prng / params / palette / geometry / render`）未引入 DOM / 网络 / 时间随机源
- [ ] 新增规则配有正例与反例单测
- [ ] 所有进入 SVG 的动态文本经 `escapeXml()`，`inspectSvg()` 仍通过
- [ ] 新增非自产素材已在 `ASSETS.md` 登记并把许可证全文放入 `licenses/`；本 PR 未引入的话填「无」
- [ ] 可见参数控件仍为 5 个
- [ ] 可访问性未回退：对比度、焦点可见、44px 命中区、色盲双编码、`prefers-reduced-motion`
- [ ] 若改变行为，已同步 `README.md` / `docs/design.md` / `CHANGELOG.md`

## 测试输出

```
（粘贴 npm run check 输出）
```

## 视觉证据

（改动影响视觉时贴截图或 SVG；未影响填「无」）
