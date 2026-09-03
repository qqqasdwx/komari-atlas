# Komari Atlas

A monitoring console theme for private, self-hosted [Komari Monitor](https://github.com/komari-monitor/komari) instances.

[简体中文](README.md) · [Download the latest release](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip)

![Komari Atlas preview](preview.png)

Komari Atlas is built with Next.js and exported as a static Komari theme. Its full-screen wallpaper, restrained glass panels, and dense two-column node cards are designed for authenticated personal monitoring rather than a public status page.

## Features

### Dashboard

- Authentication gate and Komari version check before node data is loaded
- Totals for all, online, offline, and expiring nodes, plus the current aggregate network rate
- Node search, group filtering, and Komari weight as the default order
- Sorting by CPU, memory, disk, TCP connections, upload, download, monthly cost, or expiry
- Snapshot-based sorting so live refreshes do not continuously move cards
- Prominent red borders for offline nodes, with stale live metrics shown as unavailable

### Node Cards

- Country or region flags, Linux distribution or operating-system icons, status, and uptime
- Progress bars for CPU, memory, disk, and swap, including used and total capacity
- Upload, download, TCP, and UDP values in one compact network row
- Billing-period traffic, traffic limit, upload and download totals, and monthly reset day
- Komari long-term expiry support, expiry dates, and remaining days
- Monthly cost and current remaining value in CNY
- 24-hour latency and packet-loss blocks for every selected monitoring task, with exact hover details
- Per-node, per-task color thresholds for both history blocks and current values
- Direct task reordering from each node card

### Node Details

- Five tabs: Overview, Charts, Latency Monitoring, Traffic, and Settings
- Live resources, hardware, network, system, asset, and billing data in the overview
- `1h`, `6h`, `24h`, `7d`, and `30d` ranges with a history selector that stays available while scrolling
- CPU, system load, memory and swap, disk, network rate, process and connection charts, plus conditional GPU charts
- Visible gaps for missing historical samples so offline periods remain identifiable
- Independently toggleable latency-monitoring chart lines
- Daily upload and download bar charts on the Traffic tab
- Per-node traffic reset day, home-task visibility and order, and green/yellow/red latency and loss thresholds
- Automatic persistence of node settings to Komari `theme_settings`

### Assets and Interface

- Portfolio totals for monthly cost, total value, and current remaining value
- Exchange-rate conversion for CNY, USD, EUR, GBP, and other common currencies through Frankfurter, with a local cache for temporary outages
- A per-node value calculator with editable renewal price, cycle, exchange rate, transaction date, sale price, and machine details
- An Atlas-themed valuation summary for calculated results in both light and dark modes
- Privacy mode that blurs monthly cost, remaining value, and expiry details on dashboard cards
- Simplified Chinese and English interfaces with light, dark, and system appearance modes
- Responsive desktop and mobile layouts, an admin shortcut, and sign-out control

## Requirements

- Komari `1.4.3` or newer
- An authenticated private Komari site
- Metric recording enabled; at least 35 days of retention is required for a complete monthly billing-traffic calculation

Billing boundaries use the `Asia/Shanghai` timezone. An explicit per-node traffic reset day takes priority over the expiry day; days 29 through 31 clamp to the last day of shorter months.

## Installation

1. Download [`komari-atlas.zip`](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip).
2. Upload the archive in the Komari admin dashboard.
3. Select **Komari Atlas** as the active theme.

## Local Development

Use Node.js 22 or newer and install the locked dependencies:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`NEXT_PUBLIC_API_TARGET` defaults to `http://127.0.0.1:25774`. When the frontend runs at `http://localhost:3000`, add that exact origin to both `cors_allowed_origins` and `ws_allowed_origins` in Komari.

## Build and Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` exports the static site to `dist/`. Run `./build-theme.sh` to install dependencies, build the project, and create `dist/komari-atlas-YY.MM.DD-COMMIT.zip`; the script also requires `zip`.

Source code lives in `src/`, locale catalogs in `src/i18n/locales/`, static assets in `public/`, and theme metadata in `komari-theme.json`.

## Credits and License

Komari Atlas began from [tonyliuzj/komari-next](https://github.com/tonyliuzj/komari-next). Thanks also to [piphase/komari-nexus](https://github.com/piphase/komari-nexus) and [fanchengliu/komari-next-pro](https://github.com/fanchengliu/komari-next-pro) for their work in the Komari theme ecosystem.

Released under the [MIT License](LICENSE). Original copyright notices are retained.
