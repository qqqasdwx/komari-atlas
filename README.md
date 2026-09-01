# Komari Atlas

A customizable monitoring theme for [Komari Monitor](https://github.com/komari-monitor/komari).

[简体中文](https://github.com/qqqasdwx/komari-atlas/blob/main/README-CN.md) · [Download the latest theme](https://github.com/qqqasdwx/komari-atlas/releases/latest/download/komari-atlas.zip)

![Komari Atlas preview](preview.png)

Komari Atlas is a static Next.js frontend packaged for Komari's theme system. It uses the theme identifier `atlas` and stores browser preferences under `komari-atlas:*`; settings from Komari Next or other themes are not imported.

## Features

- Status overview with region, traffic, network speed, and online-node summaries
- Searchable node grid and table views with group filtering
- Instance details with load, latency, transfer, and ping charts
- Six color themes, five card layouts, multiple card and graph designs
- Configurable status cards, guest fields, backgrounds, blur, and transparency
- Remaining-value calculator with currency conversion
- English, Simplified Chinese, and Traditional Chinese interfaces
- Responsive light and dark modes with installable PWA support

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
