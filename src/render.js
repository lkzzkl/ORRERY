/* ORRERY / 星图 — SVG 海报渲染器
 * 纯函数：system + palette -> SVG 字符串。零 DOM 依赖，可在 Node 中直接断言。
 * 输出约束见 docs/assets.md：无外部 URL、无脚本、无内嵌字体、无 foreignObject。
 */
(function (root, factory) {
  'use strict';
  var isNode = typeof module !== 'undefined' && module.exports;
  var deps = isNode
    ? { geometry: require('./geometry.js'), palette: require('./palette.js'), params: require('./params.js') }
    : { geometry: root.Orrery.geometry, palette: root.Orrery.palette, params: root.Orrery.params };
  var api = factory(deps);
  if (isNode) module.exports = api;
  else { root.Orrery = root.Orrery || {}; root.Orrery.render = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deps) {
  'use strict';

  /* 所有进入 SVG 的文本必须转义，杜绝注入 */
  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function n(value) { return Math.round(Number(value) * 100) / 100; }

  /* 进入 SVG 属性上下文的颜色必须校验格式，防止 palette 被外部来源污染后
     通过属性闭合注入任意标记（属性值里的 " 会提前闭合引号）。 */
  var COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
  function color(value, fallback) {
    return COLOR_RE.test(String(value || '')) ? String(value) : (fallback || '#000000');
  }

  /* 输出安全自检：确定性纯函数，供 export.js 与单测共同调用。
     这是「黑名单 + 结构校验」的第二道防线；第一道是生成侧只写白名单结构
     （颜色经 color() 校验、文本经 escapeXml()）。 */
  var FORBIDDEN = [
    { name: '外部脚本', re: /<script\b/i },
    { name: '外部字体', re: /@font-face|@import/i },
    { name: '外部图像', re: /<image\b|<foreignObject\b/i },
    { name: '外部引用', re: /\b(?:href|xlink:href|src)\s*=/i },
    { name: '内联事件', re: /\son[a-z]+\s*=/i },
    { name: '脚本协议', re: /javascript:/i },
    { name: '外部 URL', re: /https?:\/\//i },
    { name: 'CSS url()', re: /url\s*\(/i },
    /* 文档类型声明与实体定义可用来构造外部实体引用（XXE）或绕过标签检查 */
    { name: 'DOCTYPE / 实体声明', re: /<!DOCTYPE|<!ENTITY/i },
    /* 内联样式表可携带 @import / url() 之外的任意规则，出口理应是属性内联 */
    { name: '内联样式表', re: /<style\b/i }
  ];

  /* SVG 命名空间 URI 是规范固定标识、不发起资源加载；检查前先归一化为占位符，
     否则「外部 URL」规则会对每一个合法 SVG 误报（避免假阳性）。 */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var NS_PLACEHOLDER = 'urn:orrery:svg-namespace';

  function inspectSvg(svg) {
    var text = String(svg).split(SVG_NS).join(NS_PLACEHOLDER);
    var violations = FORBIDDEN.filter(function (rule) { return rule.re.test(text); })
      .map(function (rule) { return rule.name; });
    return {
      safe: violations.length === 0,
      violations: violations,
      wellFormed: /^<svg[\s\S]*<\/svg>\s*$/.test(String(svg).trim())
    };
  }

  function renderSvg(system, palette) {
    var pal = palette || deps.palette.getPalette(system.params.palette);
    /* size 会直接拼进 viewBox/width/height 属性，必须强制成有限正数：
       一旦它来自字符串，属性引号就能被提前闭合，整份产物失效。 */
    var size = Number(system.size);
    if (!isFinite(size) || size <= 0) size = 1200;
    var c = system.center;
    var caption = deps.params.describe(system.params);
    var lines = [];

    lines.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-labelledby="orrery-title orrery-desc">');
    lines.push('<title id="orrery-title">ORRERY / 星图 — ' + escapeXml(pal.name) + '</title>');
    lines.push('<desc id="orrery-desc">参数化星系编排海报，' + system.orbits.length + ' 条轨道，' + system.starCount + ' 颗星体。配色：' + escapeXml(pal.name) + '。' + escapeXml(caption) + '</desc>');
    lines.push('<metadata>' + escapeXml(caption) + '</metadata>');

    lines.push('<rect x="0" y="0" width="' + size + '" height="' + size + '" fill="' + color(pal.bg) + '"/>');
    lines.push('<circle cx="' + c + '" cy="' + c + '" r="548" fill="none" stroke="' + color(pal.surface, pal.bg) + '" stroke-width="1"/>');

    var ticks = deps.geometry.buildTicks();
    ticks.forEach(function (t) {
      lines.push('<line x1="' + n(t.x1) + '" y1="' + n(t.y1) + '" x2="' + n(t.x2) + '" y2="' + n(t.y2) + '" stroke="' + color(pal.orbit) + '" stroke-width="' + (t.major ? 2 : 1) + '" opacity="' + (t.major ? 0.75 : 0.4) + '"/>');
    });

    /* 轨道椭圆：以中心为原点做旋转 */
    system.orbits.forEach(function (orbit) {
      var deg = n(orbit.rotation * 180 / Math.PI);
      lines.push('<ellipse cx="' + c + '" cy="' + c + '" rx="' + n(orbit.rx) + '" ry="' + n(orbit.ry) + '" fill="none" stroke="' + color(pal.orbit) + '" stroke-width="1.4" opacity="0.62" transform="rotate(' + deg + ' ' + c + ' ' + c + ')"/>');
    });

    /* 中心恒星 */
    lines.push('<circle cx="' + c + '" cy="' + c + '" r="52" fill="none" stroke="' + color(pal.accent) + '" stroke-width="1" opacity="0.35"/>');
    lines.push('<circle cx="' + c + '" cy="' + c + '" r="15" fill="' + color(pal.accent) + '"/>');

    /* 星体：颜色 + 形状双编码，不依赖颜色单独传达信息（色盲友好）。
       分组便于预览层做可关闭的装饰性缓慢公转；导出时会移除该 class。 */
    lines.push('<g class="orrery-starfield">');
    system.orbits.forEach(function (orbit) {
      orbit.stars.forEach(function (star) {
        lines.push('<circle cx="' + n(star.x) + '" cy="' + n(star.y) + '" r="' + n(star.r) + '" fill="' + color(pal.star[star.tone % pal.star.length]) + '"/>');
        if (star.ring) {
          lines.push('<circle cx="' + n(star.x) + '" cy="' + n(star.y) + '" r="' + n(star.r + 9) + '" fill="none" stroke="' + color(pal.muted) + '" stroke-width="1" opacity="0.7"/>');
        }
      });
    });
    lines.push('</g>');

    /* 文字：仅用通用字体族名称，不嵌入任何字体文件 */
    var fontStack = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
    lines.push('<text x="72" y="96" fill="' + color(pal.text) + '" font-family="' + escapeXml(fontStack) + '" font-size="46" letter-spacing="12">ORRERY</text>');
    lines.push('<text x="74" y="132" fill="' + color(pal.muted) + '" font-family="' + escapeXml(fontStack) + '" font-size="19" letter-spacing="4">STAR CHART / 星图</text>');
    lines.push('<line x1="72" y1="1098" x2="' + (size - 72) + '" y2="1098" stroke="' + color(pal.orbit) + '" stroke-width="1" opacity="0.5"/>');
    lines.push('<text x="72" y="1136" fill="' + color(pal.text) + '" font-family="' + escapeXml(fontStack) + '" font-size="18" letter-spacing="1">' + escapeXml(caption) + '</text>');
    lines.push('<text x="' + (size - 72) + '" y="1136" text-anchor="end" fill="' + color(pal.muted) + '" font-family="' + escapeXml(fontStack) + '" font-size="18">' + escapeXml(pal.name) + ' / ' + system.starCount + ' STARS</text>');
    lines.push('</svg>');

    return lines.join('\n');
  }

  function renderPreview(system, palette) {
    /* 预览用：去掉 width/height 以便响应式缩放，其余与导出一致 */
    return renderSvg(system, palette)
      .replace(' width="' + system.size + '" height="' + system.size + '"', ' width="100%" height="100%"');
  }

  return {
    escapeXml: escapeXml,
    inspectSvg: inspectSvg,
    renderSvg: renderSvg,
    renderPreview: renderPreview
  };
});
