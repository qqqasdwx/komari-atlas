# Komari Atlas

一个面向私人自用场景的 [Komari Monitor](https://github.com/komari-monitor/komari) 监控台主题。

[English](README.EN.md) · [下载最新版本](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip)

![Komari Atlas 预览](preview.png)

Komari Atlas 使用 Next.js 构建并静态导出，可直接安装到 Komari 的主题系统。界面采用全屏壁纸、轻量玻璃面板和高密度双列节点卡片，重点服务需要登录的自托管监控场景。

## 功能特性

### 首页监控

- 登录门禁和 Komari 版本检查，登录成功后才加载节点数据
- 汇总节点总数、在线数、离线数、即将到期数和当前总速率
- 支持节点搜索、分组筛选和 Komari 权重默认顺序
- 支持按 CPU、内存、磁盘、TCP 连接、上传、下载、月成本和到期时间排序
- 排序使用点击时的数据快照，实时刷新不会导致卡片持续跳动
- 离线节点使用醒目的红色边缘，并将已经失效的实时指标显示为缺失

### 节点卡片

- 展示国家或地区旗帜、Linux 发行版或操作系统图标、在线状态和在线时间
- CPU、内存、磁盘和 Swap 采用进度条；内存、磁盘和 Swap 同时显示已用量与总量
- 同一信息区展示上传、下载、TCP 和 UDP 连接数
- 展示本计费周期流量、流量限制、上传下载分量和每月重置日期
- 识别 Komari 的长期节点，并展示到期日期和剩余天数
- 展示人民币月成本和当前剩余价值
- 使用 24 小时方格展示每个延迟监测任务的延迟和丢包；悬停可查看对应时间与数值
- 方格和实时值根据每个节点、每个任务的自定义阈值着色
- 可直接在卡片中调整延迟监测任务顺序

### 节点详情

- 使用概览、历史图表、延迟监测、流量和设置五个标签页组织信息
- 概览包含实时资源、硬件、网络、系统、资产和计费信息
- 历史范围支持 `1h`、`6h`、`24h`、`7d` 和 `30d`，时间选择器会随页面滚动保持可用
- 提供 CPU、系统负载、内存与 Swap、磁盘、网络速率、进程与连接图表，并按节点能力显示 GPU 图表
- 历史图表保留缺失数据的断点，使节点离线时段可以被识别
- 延迟监测图表支持独立显示或隐藏线路
- 流量页提供按日上传和下载柱状图
- 设置页可配置流量重置日、首页任务显隐与顺序，以及延迟和丢包的绿、黄、红阈值
- 节点设置自动保存到 Komari 的 `theme_settings`

### 资产与界面

- 汇总全部节点的月成本、总价值和当前剩余价值
- 通过 Frankfurter 在线汇率转换 CNY、USD、EUR、GBP 等常用币种，并使用本地缓存处理短时不可用
- 每个节点都有独立的剩余价值计算器，可修改续费价格、周期、汇率、交易日期、售价和机器信息
- 计算结果生成适配 Atlas 明暗主题的估值摘要
- 隐私模式可模糊首页卡片中的月成本、剩余价值和到期时间，便于截图分享
- 支持简体中文和英文，以及浅色、深色和跟随系统外观
- 桌面和移动端响应式布局，提供管理后台入口与退出登录按钮

## 使用要求

- Komari `1.4.3` 或更高版本
- 需要登录的私有 Komari 站点
- 启用指标记录；如需完整计算月度计费流量，指标至少保留 35 天

计费周期按 `Asia/Shanghai` 时区计算。节点单独设置的流量重置日优先于到期日；每月 29 至 31 日在短月份会自动取当月最后一天。

## 安装

1. 下载 [`komari-atlas.zip`](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip)。
2. 在 Komari 管理后台上传主题压缩包。
3. 将 **Komari Atlas** 设为当前主题。

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

源代码位于 `src/`，语言文件位于 `src/i18n/locales/`，静态资源位于 `public/`，主题元数据位于 `komari-theme.json`。

## 致谢与许可

Komari Atlas 最初基于 [tonyliuzj/komari-next](https://github.com/tonyliuzj/komari-next) 开发。感谢 [piphase/komari-nexus](https://github.com/piphase/komari-nexus) 与 [fanchengliu/komari-next-pro](https://github.com/fanchengliu/komari-next-pro) 对 Komari 主题生态的贡献。

本项目采用 [MIT License](LICENSE)，并保留原始版权声明。
