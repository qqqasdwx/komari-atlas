# Komari Atlas

A private monitoring console theme for [Komari Monitor](https://github.com/komari-monitor/komari).

[简体中文](https://github.com/qqqasdwx/komari-atlas/blob/main/README-CN.md) · [Download the latest theme](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip)

![Komari Atlas preview](preview.png)

Komari Atlas is a static Next.js frontend packaged for Komari's theme system. Version 0.2 uses a fixed, responsive interface built around a full-screen wallpaper and restrained glass panels. It is designed for an authenticated, self-hosted Komari instance rather than a public status page.

## Features

- Full-screen authentication gate; node data is loaded only after sign-in
- Compact node summary, search, group filtering, and stable Komari weight order
- Card overview with live utilization, billing-period traffic, expiry, speed, and selected Ping tasks
- Long-form node details with `1h`, `6h`, `24h`, `7d`, and `30d` history ranges
- CPU, load, memory, swap, disk, network, process, connection, Ping, and conditional GPU charts
- Per-node traffic reset day and home-card Ping selection with automatic saving
- Remaining-value summary with online exchange-rate conversion
- Simplified Chinese and English interfaces with light, dark, and system modes

## Requirements

- Komari `1.4.3` or newer
- An authenticated private Komari site
- At least 35 days of metric retention for complete billing-period traffic

Billing boundaries use the `Asia/Shanghai` timezone. An explicit per-node reset day takes priority over the node expiry day; days 29 through 31 clamp to the last day of shorter months. Version 0.2 uses its own settings schema and does not read earlier Atlas appearance settings.

## Installation

Download [`komari-atlas.zip`](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip), upload it in the Komari admin dashboard, and select **Komari Atlas** as the active theme. A running Komari backend is required.

## Local Development

Use Node.js 22 or newer, then install the locked dependencies:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`NEXT_PUBLIC_API_TARGET` defaults to `http://127.0.0.1:25774`. When the frontend runs at `http://localhost:3000`, add that exact origin to both `cors_allowed_origins` and `ws_allowed_origins` in Komari. Open `http://localhost:3000` after the development server starts.

## Build and Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` exports the static frontend to `dist/`. Run `./build-theme.sh` to install dependencies, build, and create `dist/komari-atlas-YY.MM.DD-COMMIT.zip`; the script also requires `zip`. Use `npm run preview` to serve an existing `dist/` build locally.

Source code lives in `src/`, locale catalogs in `src/i18n/locales/`, static assets in `public/`, and theme metadata in `komari-theme.json`. See [AGENTS.md](AGENTS.md) for contributor conventions.

## Contributing

Keep changes focused and include lint, type-check, test, and build results. Add screenshots for visible UI changes. Report bugs and proposals through [GitHub Issues](https://github.com/qqqasdwx/komari-atlas/issues).

## Credits and License

Komari Atlas began from [tonyliuzj/komari-next](https://github.com/tonyliuzj/komari-next). Thanks also to [piphase/komari-nexus](https://github.com/piphase/komari-nexus) and [fanchengliu/komari-next-pro](https://github.com/fanchengliu/komari-next-pro) for work in the Komari theme ecosystem.

Released under the [MIT License](LICENSE). Original copyright notices are retained.
