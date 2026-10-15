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
GitHub Pages serves the **`main` branch, `/` (root)**. `.nojekyll` prevents Jekyll
processing. Pushes to `main` trigger GitHub's Pages deployment. No build secrets
or external services are required. `dist/` is an optional export for other hosts;
GitHub Pages serves the equivalent files directly from the repository root.

To configure a new repository, choose **Settings → Pages → Deploy from a branch**,
then select **main** and **/(root)**. Publishing requires repository administration
permission; running the game does not.

## Files

- `src/game.js` — pure game rules and saved-game validation
- `src/app.js` — input, animation, UI, browser storage and appearance
- `index.html`, `styles.css`, `assets/` — interface and visual design
- `tests/` — Node unit tests and Playwright browser tests

Inspired by [Gabriele Cirulli's 2048](https://github.com/gabrielecirulli/2048).
