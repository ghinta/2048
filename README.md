# 2048 — Glass Edition

A small pause, reimagined in glass. A responsive, German-language take on 2048,
with translucent surfaces, soft light, and a light/dark appearance inspired by
Apple's Liquid Glass design language. Independently implemented with vanilla
HTML, CSS and JavaScript; no runtime dependencies, accounts or analytics.

**Play:** https://ghinta.github.io/2048/

## Playing

- Use the arrow keys or WASD, or swipe on the board.
- Equal tiles merge once per move. Every successful move adds a 2 (90%) or 4 (10%).
- Reach 2048 and keep going. The round ends when no legal move remains.
- Undo the last move with **Zurück** or **Z**. One undo is available per move,
  during the current browser session; the best score is kept.
- Your game, best score and appearance are saved locally in your browser.
  The game also works if browser storage is unavailable.

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
npm run test:e2e           # build and run 12 browser tests against dist/
```

If Chromium is already installed, skip the browser download and use:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Browser tests cover keyboard and touch input, merging, undo, persistence,
restart confirmation, win/continue, game over, dialogs, reduced motion,
unavailable storage, accessible cell labels, and layouts from 320 to 1440 px.
Playwright runs a temporary HTTP server on port **4174** and stops it afterwards.

## GitHub Pages

This is a static site with relative asset URLs, so it works under `/2048/`.
The [Pages workflow](.github/workflows/pages.yml) runs on pushes to **`main`**
and can also be started manually from the Actions tab. It installs the locked
dependencies and Chromium, runs all 12 game-logic and 12 browser tests, and
uploads only the built **`dist/`** directory. Deployment runs only after these
checks pass, using GitHub's official Pages actions and the `github-pages`
environment. No custom secrets are required; only the deployment job receives
Pages write and OIDC permissions.

To configure a new repository, choose **Settings → Pages → Source → GitHub Actions**.
This setting is already configured for `ghinta/2048`. Publishing setup requires
repository administration permission; running the game does not. `.nojekyll`
is included in the export, and the site requires no server-side processing.

## Files

- `src/game.js` — pure game rules and saved-game validation
- `src/app.js` — input, animation, UI, browser storage and appearance
- `index.html`, `styles.css`, `assets/` — interface and visual design
- `tests/` — Node unit tests and Playwright browser tests

Inspired by [Gabriele Cirulli's 2048](https://github.com/gabrielecirulli/2048).
