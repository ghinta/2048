# 2048

A German-language 2048 game with a Liquid Glass interface and light/dark themes.
Implemented with HTML, CSS and JavaScript; no runtime dependencies.

**Play:** https://ghinta.github.io/2048/

## Playing

- Use the arrow keys or WASD, or swipe on the board.
- Equal tiles merge once per move. Every successful move adds a 2 (90%) or 4 (10%).
- Reach 2048 and keep going. The round ends when no legal move remains.
- Undo the last move with **Zurück** or **Z**. One undo is available per move,
  during the current browser session; the best score is kept.
- Your game, best score and appearance are saved locally in your browser.
  The game also works if browser storage is unavailable.
- Open the gear button for **Darstellung**: adjust Liquid Glass continuously
  from transparent to tinted, choose System/Light/Dark, switch between a filled
  and square board, or reduce transparency. Changes preview immediately and
  persist without changing the current game.

## Local development

Requirements: **Node.js 22+**, npm and **Python 3**. Serve the existing checkout;
no additional Git worktree is needed.

```sh
npm ci
npm run dev
```

The development server listens on port **4173**. There is no build step needed
to play or edit the game. Changes to HTML, CSS and modules appear after a refresh.

## Validation

```sh
npm test                  # 12 game-logic tests, including seeded full games
npm run build             # export just the application to dist/
npx playwright install chromium
npm run test:e2e           # build and run 15 browser tests against dist/
```

If Chromium is already installed, skip the browser download and use:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Browser tests cover keyboard and touch input, merging, undo, persistence,
restart confirmation, win/continue, game over, dialogs, reduced motion,
unavailable storage, accessible cell labels, and layouts from 320 to 1440 px.
The game fits the available viewport height without page scrolling, including
small portrait screens and phone landscape layouts. Tests also cover the glass
slider, paused input in settings, persisted appearance, reduced transparency,
appearance reset, square/filled layouts, and following the system color scheme.
Playwright runs a temporary HTTP server on port **4174** and stops it afterwards.

## GitHub Pages

This is a static site with relative asset URLs, so it works under `/2048/`.
The [Pages workflow](.github/workflows/pages.yml) runs on pushes to **`main`**
and can also be started manually from the Actions tab. It installs the locked
dependencies and Chromium, runs all 12 game-logic and 15 browser tests, and
uploads only the built **`dist/`** directory. Deployment runs only after these
checks pass, using GitHub's official Pages actions and the `github-pages`
environment. No custom secrets are required; only the deployment job receives
Pages write and OIDC permissions.
The build versions CSS and JavaScript URLs by content so reloading after a
deployment loads matching assets instead of cached files from an older release.

To configure a new repository, choose **Settings → Pages → Source → GitHub Actions**.
This setting is already configured for `ghinta/2048`. Publishing setup requires
repository administration permission; running the game does not. `.nojekyll`
is included in the export, and the site requires no server-side processing.

## Design references

The interface follows Apple's guidance on [materials](https://developer.apple.com/design/human-interface-guidelines/materials)
and [adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass):
glass is concentrated in controls, with rounded shapes, subtle edge reflections,
adaptive tint, and accessible contrast. The board uses a quieter content material
to keep numbers legible. This web implementation uses CSS backdrop filters and
layered highlights; it does not use Apple's native SwiftUI/UIKit renderer.

## Files

- `src/game.js` — pure game rules and saved-game validation
- `src/app.js` — input, animation, UI, browser storage and appearance
- `index.html`, `styles.css`, `assets/` — interface and visual design
- `tests/` — Node unit tests and Playwright browser tests

Inspired by [Gabriele Cirulli's 2048](https://github.com/gabrielecirulli/2048).
