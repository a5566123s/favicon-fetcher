# Favicon 获取器 / Favicon Fetcher

一键获取并下载任意网站的 favicon 图标 —— 解决「标签页有图标但 `/favicon.ico` 404」的问题。

One-click fetch and download favicons for any website — solves the "tab shows an icon but `/favicon.ico` returns 404" problem.

---

## 问题 / The Problem

现代网站通常不再使用 `/favicon.ico`，而是在 HTML 中通过 `<link rel="icon">` 声明图标路径。Chrome 标签页能正常显示图标，但直接访问 `/favicon.ico` 会返回 404。这个扩展正是为了解决这个问题。

Modern websites rarely use `/favicon.ico`. Instead, they declare icon paths via `<link rel="icon">` in HTML. Chrome displays the icon correctly in the tab, but `/favicon.ico` returns 404. This extension solves that.

## 功能 / Features

- **一键获取** — 点击工具栏图标，自动解析当前网站的 favicon
- **多来源探测** 按优先级依次尝试：
  1. `chrome.tabs` 的 `favIconUrl`（Chrome 已解析的标签页图标，最权威）
  2. 注入 content script 扫描 `<link rel="icon / apple-touch-icon / mask-icon / …">` 标签
  3. 回退 `https://域名/favicon.ico`
  4. Google s2 回退服务（`www.google.com/s2/favicons`）
- **候选列表** — 显示所有候选缩略图，点击切换预览
- **下载** — 一键保存图标文件
- **复制 URL** — 复制当前选中候选的原始链接
- **复制 Base64** — 获取图标的 data URL（`data:image/png;base64,…`），>50KB 自动压缩
- **手动输入域名** — 当前标签页不可用时（如 `chrome://` 页面），可输入域名直接查询

## 安装 / Installation

### 从 Chrome 开发者模式加载

1. 打开 `chrome://extensions`
2. 开启右上角 **开发者模式**
3. 点击 **「加载已解压的扩展程序」**
4. 选择 `favicon-fetcher/` 目录

### 从源码构建（无需构建）

本项目是纯前端 Chrome 扩展，无依赖、无需构建工具。下载源码后直接按上述步骤加载即可。

## 使用方法 / Usage

1. 访问任意网站
2. 点击浏览器工具栏中的 Favicon 获取器图标
3. 弹窗自动显示当前网站的 favicon 预览
4. **候选列表** — 横向排列所有来源的图标，点击切换
5. **下载** — 点击「下载」按钮保存图标
6. **Base64** — 点击「Base64」按钮复制 data URL 到剪贴板
7. **复制链接** — 点击「复制链接」获取当前选中的图标 URL
8. **手动模式** — 在底部输入域名（如 `github.com`）点击获取

## 技术细节 / Technical Details

| 方面 | 说明 |
|------|------|
| 架构 | Manifest V3 |
| 核心权限 | `activeTab`、`scripting`、`downloads`、`clipboardWrite` |
| 主机权限 | `*://*/*`（用于跨域获取 Base64 编码） |
| 图标生成 | 纯 Node.js 实现（zlib + Buffer），无第三方依赖 |
| 自动压缩 | 复制 Base64 时 >50KB 自动 Canvas 降维压缩 |

### 文件结构

```
favicon-fetcher/
├── manifest.json          # MV3 清单
├── popup.html             # 弹窗 UI
├── popup.css              # 深色主题样式
├── popup.js               # 主逻辑
├── content.js             # 页面内扫描 <link> 标签
├── icons/                 # 扩展图标
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── generate_icons.js      # 图标生成脚本（已运行，无需再次执行）
```

## 开发 / Development

```bash
# 安装（无依赖）
# 直接加载已解压的扩展即可

# 重新生成图标（如需修改）
node generate_icons.js
```

## 许可 / License

MIT