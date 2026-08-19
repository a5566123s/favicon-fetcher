<div align="center">

# <img src="icons/icon128.png" width="32" height="32" alt="logo" valign="middle"> Favicon 获取器 &ensp;·&ensp; Favicon Fetcher

**一键获取并下载任意网站的 favicon 图标**
**One-click fetch and download favicons for any website**

![Version](https://img.shields.io/badge/version-1.1.0-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Chrome](https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![Manifest](https://img.shields.io/badge/Manifest-v3-FF7139?style=flat-square)

> 🎯 **解决「标签页明明有图标，但 `/favicon.ico` 会 404」的问题**  
> **Solves the \*"tab shows an icon but `/favicon.ico` returns 404"\* problem**

</div>

---

## ✨ 功能亮点 / Features

|    | 功能 | 说明 |
| -- | ---- | ---- |
| 🚀 | **一键获取** | 点击工具栏图标，自动解析当前网站的所有图标候选 |
| 🔍 | **四层探测** | `favIconUrl` → `<link>` 标签 → `/favicon.ico` → Google 回退服务 |
| 🖼️ | **候选列表** | 所有候选以缩略图横向排列，点击切换预览 |
| ⬇️ | **下载** | 一键保存为 `.png` / `.ico` / `.svg` |
| 📋 | **复制 URL** | 复制选中图标的原始链接 |
| 📄 | **复制 Base64** | 复制 `data:image/…;base64,…` 格式，**>50KB 自动降维压缩** |
| ⌨️ | **手动查询** | 支持直接输入域名获取（无需打开目标网站） |

---

## 🔍 它是如何工作的 / How It Works

扩展按优先级依次探测，取第一个可用的结果：

<div align="center">

```
┌───────────────────────────────────────────────────────────┐
│  ①  chrome.tabs.favIconUrl                                │
│     ← 标签页实际显示的图标（Chrome 已帮你解析好了）        │
├───────────────────────────────────────────────────────────┤
│  ②  content.js 扫描页面 <link> 标签                       │
│     ← <link rel="icon"> / <link rel="apple-touch-icon">   │
│     ← 按尺寸从大到小排序，PNG > SVG > ICO                  │
├───────────────────────────────────────────────────────────┤
│  ③  https://域名/favicon.ico                              │
│     ← 经典路径，作为兜底                                  │
├───────────────────────────────────────────────────────────┤
│  ④  Google s2 Favicon 服务                                │
│     ← 最终保底，始终可用                                  │
└───────────────────────────────────────────────────────────┘
```

</div>

### 💡 核心洞察

现代网站通常**不再使用** `/favicon.ico`。它们会在 HTML `<head>` 里写：

```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
```

Chrome 标签页显示的图标来源于这些 `<link>` 标签，而不是 `/favicon.ico`。  
**这就是标签页有图标但 `/favicon.ico` 404 的根本原因。**

---

## 📦 安装 / Installation

### 方式一：从 GitHub Release 安装 CRX（推荐）

1. 打开 [Releases 页面](https://github.com/a5566123s/favicon-fetcher/releases)
2. 下载最新版本的 `favicon-fetcher-vX.X.X.crx` 文件
3. 打开 `chrome://extensions`
4. 将 `.crx` 文件**拖拽**到页面中即可安装

> **注意**：如果 Chrome 提示「只能安装来自 Chrome 网上应用店的扩展」，请开启右上角 **开发者模式** 再拖拽一次。
>
> ⚠️ CRX 与私钥绑定，后续版本都会使用同一签名，保持扩展 ID 不变，更新时直接覆盖安装即可。

### 方式二：从 ZIP 解压后加载（开发者模式）

1. 从 [Releases 页面](https://github.com/a5566123s/favicon-fetcher/releases) 下载 `favicon-fetcher-vX.X.X.zip`
2. 解压到本地目录
3. 打开 `chrome://extensions`
4. 开启右上角 **「开发者模式」**
5. 点击 **「加载已解压的扩展程序」**
6. 选择解压后的文件夹

### 方式三：从源码加载

```bash
git clone https://github.com/a5566123s/favicon-fetcher.git
```

| 步骤 | 操作 |
| ---- | ---- |
| ① | 打开 `chrome://extensions` |
| ② | 开启右上角 **「开发者模式」** |
| ③ | 点击 **「加载已解压的扩展程序」** |
| ④ | 选择 `favicon-fetcher/` 目录 |

> 📌 **无需构建** — 纯前端扩展，零依赖，下载即用。

---

## 🎮 使用方法 / Usage

| 场景 | 操作 |
| ---- | ---- |
| **获取当前网站图标** | 点击浏览器工具栏的 🔵 Favicon 获取器图标 |
| **切换候选** | 点击候选缩略图中的任意一个 |
| **下载图标** | 选中后点击 ⬇️ **下载** 按钮 |
| **复制 Base64** | 选中后点击 📄 **Base64** 按钮（>50KB 自动压缩） |
| **复制链接** | 选中后点击 📋 **复制链接** 按钮 |
| **查询其他网站** | 在弹窗底部输入域名（如 `github.com`），点击 **获取** |

### 浏览器工具栏效果

```
┌─────────────────────────────────────────────┐
│  🔵  ← 点击扩展图标                         │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Favicon 获取器                      │    │
│  │  ┌──────────┐                       │    │
│  │  │  大图标   │   example.com        │    │
│  │  │  预览    │   来自标签页图标      │    │
│  │  └──────────┘                       │    │
│  │  ┌─┐ ┌─┐ ┌─┐ ┌─┐ 候选             │    │
│  │  │ │ │ │ │ │ │ │                    │    │
│  │  └─┘ └─┘ └─┘ └─┘                  │    │
│  │  [⬇下载] [📄Base64] [📋复制链接]    │    │
│  │  或输入域名: [________] [获取]      │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## 🗂️ 项目结构 / Project Structure

```
favicon-fetcher/
├── manifest.json            # Chrome Manifest V3 清单
├── popup.html               # 弹窗 UI（含手动输入）
├── popup.css                # 深色主题样式
├── popup.js                 # 主逻辑：探测候选、渲染、下载、Base64 编码与压缩
├── content.js               # 注入页面，扫描 <link rel="icon"> 标签
├── icons/
│   ├── icon16.png           # 工具栏图标 16×16
│   ├── icon32.png           # 工具栏图标 32×32（Retina）
│   ├── icon48.png           # 扩展管理页 48×48
│   └── icon128.png          # Chrome Web Store 128×128
├── generate_icons.js        # 图标生成脚本（已运行，无需再执行）
├── README.md                # 本文件
└── LICENSE                  # MIT 许可证
```

---

## 🔧 技术细节 / Technical Details

| 方面 | 说明 |
|------|------|
| 📐 **架构** | Manifest V3（Chrome 扩展最新标准） |
| 🔑 **权限** | `activeTab` · `scripting` · `downloads` · `clipboardWrite` |
| 🌐 **主机权限** | `*://*/*`（用于跨域获取图片内容做 Base64 编码） |
| 🎨 **图标生成** | 纯 Node.js（`zlib` + `Buffer`），**零第三方依赖** |
| 🏋️ **自动压缩** | 复制 Base64 时 >50KB 自动 Canvas 等比降维，每次缩减 20% 直至达标 |

---

## 🧑‍💻 开发 / Development

```bash
# 环境要求：仅需 Node.js（用于图标生成）
node --version  # ≥ 12

# 重新生成扩展图标
node generate_icons.js

# 加载方式同上：chrome://extensions → 加载已解压的扩展程序
```

---

## 📜 许可 / License

[MIT](LICENSE) © 2026 a5566123s

---

<div align="center">

**⭐ 如果这个扩展对你有帮助，欢迎 Star！**  
**If you find this extension useful, feel free to give it a star!**

</div>