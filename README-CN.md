# Komari Atlas

一个面向自用场景的 [Komari Monitor](https://github.com/komari-monitor/komari) 私人监控主题。

[English](https://github.com/qqqasdwx/komari-atlas/blob/main/README.md) · [下载最新主题](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip)

![Komari Atlas 预览](preview.png)

Komari Atlas 是一个使用 Next.js 构建并静态导出的 Komari 主题。0.2 采用固定的响应式界面，以全屏壁纸和克制的玻璃面板组织信息，定位是需要登录的自托管监控台，而不是公开状态页。

## 功能特性

- 全屏登录门禁；仅在登录成功后加载节点数据
- 紧凑的节点汇总、搜索、分组筛选，并保持 Komari 权重排序
- 节点卡片展示实时资源、计费周期流量、到期时间、网络速率和选定的 Ping 任务
- 单页节点详情支持 `1h`、`6h`、`24h`、`7d` 和 `30d` 历史范围
- CPU、负载、内存、交换空间、磁盘、网络、进程、连接、Ping 和按需 GPU 图表
- 每个节点可设置流量重置日和首页 Ping 任务，并自动保存
- 支持在线汇率转换的节点剩余价值汇总
- 简体中文和英文界面，支持浅色、深色和跟随系统模式

## 使用要求

- Komari `1.4.3` 或更高版本
- 需要登录的私有 Komari 站点
- 指标至少保留 35 天，才能完整计算计费周期流量

计费周期按 `Asia/Shanghai` 时区计算。节点显式设置的重置日优先于到期日；每月 29 至 31 日在短月份会自动取月末。0.2 使用独立设置格式，不读取旧版 Atlas 的外观设置。

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
