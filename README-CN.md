# Komari Atlas

一个以地图视图为核心、可高度定制的 [Komari Monitor](https://github.com/komari-monitor/komari) 主题。

[English](https://github.com/qqqasdwx/komari-atlas/blob/main/README.md) · [下载最新主题](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip)

![Komari Atlas 预览](preview.png)

Komari Atlas 是一个使用 Next.js 构建并静态导出的 Komari 主题。主题标识为 `atlas`，浏览器偏好统一存储在 `komari-atlas:*` 命名空间中；Komari Next 或其他主题的设置不会被导入。

## 功能特性

- 以地图为核心的状态总览，展示地区、流量、网络速度和在线节点
- 支持搜索、分组筛选的节点网格与表格视图
- 提供负载、延迟、流量和 Ping 图表的实例详情
- 六种配色、五种卡片布局，以及多种卡片和图表样式
- 可配置状态卡片、访客字段、背景、模糊和透明度
- 支持汇率转换的节点剩余价值计算器
- 英文、简体中文和繁体中文界面
- 响应式明暗模式与可安装的 PWA 支持

## 安装

下载 [`komari-atlas.zip`](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip)，在 Komari 管理后台上传，然后将 **Komari Atlas** 设为当前主题。使用本主题需要一个正常运行的 Komari 后端。

## 本地开发

使用 Node.js 22 或更高版本，并安装锁定的依赖：

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`NEXT_PUBLIC_API_TARGET` 默认指向 `http://127.0.0.1:25774`。当前端运行在 `http://localhost:3000` 时，需要在 Komari 中将该准确地址同时加入 `cors_allowed_origins` 和 `ws_allowed_origins`。开发服务器启动后访问 `http://localhost:3000`。

## 构建与验证

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` 会将静态前端导出到 `dist/`。运行 `./build-theme.sh` 可安装依赖、构建项目，并生成 `dist/komari-atlas-YY.MM.DD-COMMIT.zip`；该脚本还需要系统安装 `zip`。已有 `dist/` 构建可通过 `npm run preview` 在本地预览。

源代码位于 `src/`，翻译文件位于 `src/i18n/locales/`，静态资源位于 `public/`，主题元数据位于 `komari-theme.json`。贡献规范见 [AGENTS.md](AGENTS.md)。

## 参与贡献

每次修改应保持范围聚焦，并附上 lint、类型检查、测试和构建结果。涉及界面变化时请提供截图。问题和建议可通过 [GitHub Issues](https://github.com/qqqasdwx/komari-atlas/issues) 提交。

## 致谢与许可

Komari Atlas 基于 [tonyliuzj/komari-next](https://github.com/tonyliuzj/komari-next) 开始开发。感谢 [piphase/komari-nexus](https://github.com/piphase/komari-nexus) 与 [fanchengliu/komari-next-pro](https://github.com/fanchengliu/komari-next-pro) 对 Komari 主题生态的贡献。

本项目采用 [MIT License](LICENSE)，并保留原始版权声明。
