/* popup.js — Favicon 获取器主逻辑 */

'use strict';

// ── 状态 ──────────────────────────────────────────
let allCandidates = [];   // { url, source, label, width, sizes?, type? }
let selectedUrl = '';


// ── 入口 ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  bindManualFetch();
  bindDownload();
  bindCopy();
  bindCopyBase64();
  bindEnterKey();
});


// ── 初始化：获取当前标签页，收集所有候选 ─────────
async function init() {
  setLoading(true);
  setStatus('正在解析图标…', '');

  const tab = await getActiveTab();
  if (!tab) return;

  const domain = extractDomain(tab.url || '');
  document.getElementById('domainDisplay').textContent = domain || '未知域名';

  // 按照优先级收集候选
  const seen = new Set();
  allCandidates = [];

  // 1) 标签页自身 favIconUrl（最权威）
  if (tab.favIconUrl) {
    addCandidate(tab.favIconUrl, 'tab', '标签页图标（Chrome 自动解析）', 0, seen);
    // 立即展示
    selectByUrl(tab.favIconUrl);
  }

  // 2) 注入 content.js 扫描页面 <link> 标签
  if (tab.id) {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      if (Array.isArray(result)) {
        for (const c of result) {
          if (!seen.has(c.url)) {
            const label = `页面 <link> 标签${c.sizes ? ' (' + c.sizes + ')' : c.type ? ' (' + c.type + ')' : ''}`;
            addCandidate(c.url, 'link', label.trim(), c.width || 0, seen, c.sizes, c.type);
          }
        }
      }
    } catch (e) {
      // chrome://、chrome-extension:// 等页面无法注入，静默忽略
      console.log('content script 注入失败（可忽略）:', e.message);
    }
  }

  // 3) /favicon.ico（经典路径）
  if (domain) {
    const icoUrl = `https://${domain}/favicon.ico`;
    if (!seen.has(icoUrl)) {
      addCandidate(icoUrl, 'favicon_ico', '默认 /favicon.ico', 0, seen);
    }
  }

  // 4) Google s2 回退服务（始终可用）
  if (domain) {
    const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    if (!seen.has(googleUrl)) {
      addCandidate(googleUrl, 'google', 'Google 回退服务', 64, seen);
    }
  }

  // 渲染候选列表
  renderCandidates();

  // 自动选择第一个（若尚未选中）
  if (!selectedUrl && allCandidates.length > 0) {
    selectByUrl(allCandidates[0].url);
  }

  if (allCandidates.length === 0) {
    setStatus('未找到任何图标', 'error');
  } else {
    setStatus(`共找到 ${allCandidates.length} 个候选图标`, 'success');
  }

  setLoading(false);
}


// ── 工具函数 ──────────────────────────────────────

function addCandidate(url, source, label, width, seenSet, sizes, type) {
  seenSet.add(url);
  allCandidates.push({ url, source, label, width: width || 0, sizes: sizes || '', type: type || '' });
}

async function getActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      setStatus('无法获取当前标签页', 'error');
      setLoading(false);
      return null;
    }
    return tabs[0];
  } catch (e) {
    setStatus('获取标签页失败：' + e.message, 'error');
    setLoading(false);
    return null;
  }
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return '';
  }
}

function extractFaviconUrl(url) {
  // 过滤掉 chrome://extension 等内部 URL
  if (!url) return null;
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    return null;
  }
  return url;
}


// ── 渲染 ──────────────────────────────────────────

function renderCandidates() {
  const row = document.getElementById('candidatesRow');
  const badge = document.getElementById('countBadge');

  if (allCandidates.length === 0) {
    row.innerHTML = '<div class="empty-hint">暂无候选</div>';
    badge.textContent = '0';
    return;
  }

  badge.textContent = String(allCandidates.length);

  row.innerHTML = allCandidates.map((c, i) => {
    const sel = c.url === selectedUrl ? 'selected' : '';
    const sizeTag = c.width > 0 ? `<span class="size-label">${c.width}</span>` : '';
    return `
      <div class="candidate-item ${sel}" data-index="${i}" title="${escapeHtml(c.label)}">
        <img src="${escapeHtml(c.url)}" onerror="this.style.display='none'" loading="lazy" />
        ${sizeTag}
      </div>
    `;
  }).join('');

  // 点击切换
  row.querySelectorAll('.candidate-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index, 10);
      const c = allCandidates[idx];
      if (c) selectByUrl(c.url);
    });
  });
}

function selectByUrl(url) {
  if (!url || url === selectedUrl) return;
  selectedUrl = url;

  const candidate = allCandidates.find(c => c.url === url);
  if (!candidate) return;

  // 更新预览
  const img = document.getElementById('faviconPreview');
  img.src = url;
  img.style.display = '';

  // 更新来源标签
  document.getElementById('sourceLabel').textContent = candidate.label;

  // 更新候选列表高亮
  document.querySelectorAll('.candidate-item').forEach(el => {
    el.classList.toggle('selected', allCandidates[parseInt(el.dataset.index, 10)]?.url === url);
  });

  // 启用按钮
  document.getElementById('btnDownload').disabled = false;
  document.getElementById('btnCopyUrl').disabled = false;
  document.getElementById('btnCopyBase64').disabled = false;

  setStatus('', '');
}

function setLoading(active) {
  document.getElementById('loadingSpinner').classList.toggle('active', active);
}

function setStatus(msg, type) {
  const bar = document.getElementById('statusBar');
  bar.textContent = msg;
  bar.className = 'status-bar' + (type ? ' ' + type : '');
}


// ── 手动输入 ──────────────────────────────────────

function bindManualFetch() {
  document.getElementById('btnManualFetch').addEventListener('click', () => {
    doManualFetch();
  });
}

function bindEnterKey() {
  document.getElementById('manualInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doManualFetch();
  });
}

function doManualFetch() {
  const input = document.getElementById('manualInput').value.trim();
  if (!input) {
    setStatus('请输入域名', 'error');
    return;
  }

  const domain = cleanDomain(input);
  if (!domain) {
    setStatus('无效的域名', 'error');
    return;
  }

  document.getElementById('domainDisplay').textContent = domain;
  setLoading(true);
  setStatus('手动获取中…', '');

  // 只保留 /favicon.ico 和 Google 服务
  const seen = new Set();
  allCandidates = [];

  const icoUrl = `https://${domain}/favicon.ico`;
  addCandidate(icoUrl, 'favicon_ico', '默认 /favicon.ico', 0, seen);

  const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  addCandidate(googleUrl, 'google', 'Google 回退服务', 64, seen);

  renderCandidates();
  selectByUrl(allCandidates[0]?.url || '');

  setLoading(false);
  if (allCandidates.length > 0) {
    setStatus(`已找到 ${allCandidates.length} 个候选`, 'success');
  } else {
    setStatus('未找到图标', 'error');
  }
}

function cleanDomain(str) {
  // 去掉协议、路径、空格
  let s = str.replace(/^https?:\/\//i, '').replace(/^\/+/, '').replace(/\/.*$/, '').trim();
  // 去掉末尾端口号
  s = s.replace(/:\d+$/, '');
  // 去掉 www. 前缀
  s = s.replace(/^www\./i, '');
  if (!s || !s.includes('.') || /[^a-z0-9.-]/i.test(s)) return null;
  return s.toLowerCase();
}


// ── 下载 ──────────────────────────────────────────

function bindDownload() {
  document.getElementById('btnDownload').addEventListener('click', () => {
    if (!selectedUrl) return;
    const candidate = allCandidates.find(c => c.url === selectedUrl);
    const domain = document.getElementById('domainDisplay').textContent;
    const filename = buildFilename(selectedUrl, candidate?.type || '', domain || 'favicon');
    chrome.downloads.download({
      url: selectedUrl,
      filename: `favicons/${filename}`,
      conflictAction: 'uniquify',
    });
    setStatus('正在下载…', 'success');
  });
}

function buildFilename(url, mimeType, domain) {
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, '_');
  const ext = guessExtension(url, mimeType);
  return `${safeDomain}.${ext}`;
}

function guessExtension(url, mimeType) {
  // 从 URL 路径后缀判断
  const pathMatch = url.match(/\.(ico|png|svg|jpg|jpeg|gif|webp)(\?|#|$)/i);
  if (pathMatch) return pathMatch[1].toLowerCase();

  // 从 MIME 类型判断
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('svg')) return 'svg';
  if (mimeType.includes('ico') || mimeType.includes('x-icon') || mimeType.includes('vnd.microsoft.icon')) return 'ico';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('webp')) return 'webp';

  // 从 data: URI 判断
  if (url.startsWith('data:')) {
    const m = url.match(/^data:image\/(\w+)/);
    if (m) return m[1] === 'x-icon' ? 'ico' : m[1];
  }

  return 'png'; // 默认
}


// ── 复制 ──────────────────────────────────────────

function bindCopy() {
  document.getElementById('btnCopyUrl').addEventListener('click', async () => {
    if (!selectedUrl) return;
    try {
      await navigator.clipboard.writeText(selectedUrl);
      setStatus('链接已复制到剪贴板', 'success');
    } catch {
      setStatus('复制失败', 'error');
    }
  });
}


// ── 复制 Base64 ──────────────────────────────────

function bindCopyBase64() {
  document.getElementById('btnCopyBase64').addEventListener('click', async () => {
    if (!selectedUrl) return;

    // 已经以 data: URL 编码可以直接复制
    if (selectedUrl.startsWith('data:')) {
      try {
        await navigator.clipboard.writeText(selectedUrl);
        setStatus('Base64 已复制到剪贴板', 'success');
        return;
      } catch {
        setStatus('复制失败', 'error');
        return;
      }
    }

// HTTP(S) URL → 下载 → 压缩（>50KB 自动降尺寸）→ 转 Base64
	    setStatus('正在获取并编码…', '');
	    try {
	      const dataUrl = await fetchAndCompressToBase64(selectedUrl, 50 * 1024);
	      await navigator.clipboard.writeText(dataUrl);
	      const kb = (dataUrl.length / 1024).toFixed(1);
	      setStatus('Base64 已复制到剪贴板（' + kb + ' KB）', 'success');
	    } catch (e) {
	      setStatus('Base64 编码失败：' + e.message, 'error');
	    }
  });
}

/**
 * 获取 URL 内容 → 若 > maxBytes 则自动压缩（Canvas 降维）→ 转为 data: URL
 */
async function fetchAndCompressToBase64(url, maxBytes) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }

  let blob = await response.blob();

  // 超过大小限制 → 用 Canvas 等比缩小
  if (blob.size > maxBytes) {
    blob = await compressBlob(blob, maxBytes);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('FileReader 读取失败'));
    reader.readAsDataURL(blob);
  });
}

/**
 * 将 Blob 图片压缩到 maxBytes 以内（等比缩放，每次缩减 20% 尺寸）
 */
async function compressBlob(blob, maxBytes) {
  const img = await blobToImage(blob);
  let scale = 1.0;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < 30; i++) {
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const out = await new Promise(r => canvas.toBlob(r, 'image/png'));
    if (out.size <= maxBytes || w <= 1 || h <= 1) return out;

    scale *= 0.80; // 每次减少 20% 尺寸
  }

  return blob; // 回退返回原始 blob
}

/**
 * Blob → Image 元素
 */
function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')); };
    img.src = url;
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}


// ── 工具 ──────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}