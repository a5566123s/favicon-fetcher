// content.js — 注入到页面，扫描所有 <link rel="icon"> 等标签
// 按顺序排序：尺寸从大到小，PNG > SVG > ICO > 其他
//
// chrome.scripting.executeScript 会捕获 IIFE 的返回值作为 result

(() => {
  const candidates = [];

  const linkEls = document.querySelectorAll(
    'link[rel~="icon" i], ' +
    'link[rel~="shortcut icon" i], ' +
    'link[rel~="apple-touch-icon" i], ' +
    'link[rel~="apple-touch-icon-precomposed" i], ' +
    'link[rel~="mask-icon" i], ' +
    'link[rel~="fluid-icon" i], ' +
    'link[rel~="yandex-tableau" i]'
  );

  for (const link of linkEls) {
    const href = link.getAttribute('href');
    if (!href) continue;

    let url;
    try {
      url = new URL(href, document.baseURI).href;
    } catch {
      continue;
    }

    const sizes = link.getAttribute('sizes') || '';
    const type = link.getAttribute('type') || '';
    const rel = link.getAttribute('rel') || '';

    let width = 0;
    if (sizes) {
      const m = sizes.match(/(\d+)\s*[xX×]\s*(\d+)/);
      if (m) width = parseInt(m[1], 10);
    }

    candidates.push({ url, sizes, type, rel, width });
  }

  // 排序：大尺寸优先；同尺寸 PNG > SVG > ICO > 其他
  const typeRank = { 'image/png': 1, 'image/svg+xml': 2, 'image/x-icon': 3, 'image/vnd.microsoft.icon': 3 };

  candidates.sort((a, b) => {
    if (b.width !== a.width) return b.width - a.width;
    return (typeRank[a.type] || 99) - (typeRank[b.type] || 99);
  });

  return candidates;
})();