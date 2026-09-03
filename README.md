# Komari Atlas

一个面向个人自托管场景的 [Komari Monitor](https://github.com/komari-monitor/komari) 监控台主题。

[English](README.EN.md) · [下载最新版本](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip)

![Komari Atlas 预览](preview.png)

Komari Atlas 将节点状态、历史指标、网络质量、计费流量和资产信息集中在一个监控台中，适合需要登录访问的私人 Komari 实例。

## 核心功能

- **节点总览**：集中查看节点状态，支持搜索、分组，以及按资源、网络、成本和到期时间排序。
- **资源监控**：查看 CPU、系统负载、内存、Swap、磁盘、网络速率、进程和连接数；支持展示 GPU 指标。
- **历史分析**：查询 `1h`、`6h`、`24h`、`7d` 和 `30d` 的资源趋势，并识别节点离线时段。
- **延迟监测**：查看各监测线路最近 24 小时的延迟和丢包记录，自定义首页线路、显示顺序和分级阈值。
- **流量统计**：查看计费周期用量、流量限额、每日上传下载量和每月重置日期。
- **成本与资产**：汇总月成本、到期时间和当前剩余价值，支持长期节点、多币种换算和单机估值。
- **日常使用**：提供截图隐私模式、简体中文与英文、明暗外观，以及桌面和移动端布局。

## 安装

### 通过主题市场安装（推荐）

1. 进入 Komari 管理后台的 **主题市场**，点击 **管理源**。
2. 添加一个名为 `Komari Atlas` 的源，并填写以下地址：

   ```text
   https://raw.githubusercontent.com/qqqasdwx/komari-atlas/main/v1.json
   ```

3. 返回主题市场，找到 **Komari Atlas**，点击安装并设为当前主题。

添加源后，可以在主题市场中检查并安装后续版本。

### 手动安装

1. 下载 [`komari-atlas.zip`](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip)。
2. 在 Komari 管理后台上传主题压缩包。
3. 将 **Komari Atlas** 设为当前主题。

## 使用要求

- Komari `1.4.3` 或更高版本
- 需要登录访问的私人 Komari 实例
- 已启用指标记录；完整统计月度计费流量需要至少保留 35 天指标

计费周期按 `Asia/Shanghai` 时区计算。节点设置的流量重置日优先于到期日；每月 29 至 31 日在较短月份会按当月最后一天处理。

## 配置

每个节点都可以在详情页中设置流量重置日、首页延迟监测线路、线路顺序，以及延迟和丢包阈值。这些设置保存在 Komari 的 `theme_settings` 中。

界面语言、明暗外观和资产汇总币种保存在当前浏览器中。隐私模式仅对当前页面会话生效。

## 本地开发

使用 Node.js 22 或更高版本，并安装锁定的依赖：

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`NEXT_PUBLIC_API_TARGET` 默认指向 `http://127.0.0.1:25774`。当前端运行在 `http://localhost:3000` 时，需要在 Komari 中将该准确地址同时加入 `cors_allowed_origins` 和 `ws_allowed_origins`。

## 构建与验证

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` 会将静态站点导出到 `dist/`。运行 `./build-theme.sh` 可安装依赖、执行构建并生成 `dist/komari-atlas-YY.MM.DD-COMMIT.zip`；该脚本还需要系统安装 `zip`。

## 致谢与许可

Komari Atlas 最初基于 [tonyliuzj/komari-next](https://github.com/tonyliuzj/komari-next) 开发。感谢 [piphase/komari-nexus](https://github.com/piphase/komari-nexus) 与 [fanchengliu/komari-next-pro](https://github.com/fanchengliu/komari-next-pro) 对 Komari 主题生态的贡献。

本项目采用 [MIT License](LICENSE)，并保留原始版权声明。
