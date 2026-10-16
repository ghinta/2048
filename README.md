# 2048

A German-language 2048 game with adaptive Liquid Glass, Material 3 and Fluent
interfaces and light/dark themes.
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
- Choose **UI-Stil** in **Darstellung** to compare Apple / Liquid Glass,
  Google / Material 3 and Microsoft / Fluent, or use **Automatisch**.
  Glass controls appear for Liquid Glass; reduced transparency is also available
  for Fluent. Resetting appearance restores automatic style selection.
- Use **App installieren** in the header (the install icon on small displays).
  Chrome and Edge open their native install dialog when available. Other cases
  show browser-specific instructions. The button is hidden in installed app windows.

## Local development

Requirements: **Node.js 24 LTS** (24.22.0 or newer in the 24.x line),
**npm 12** (12.2.0 or newer in the 12.x line) and **Python 3**.
`.nvmrc` pins the tested Node.js version; `package.json` pins the npm version
used by CI. Serve your repository checkout:

```sh
nvm install
nvm use
npm install --global npm@12.2.0
npm ci
npm run dev
```

If you do not use nvm, install the Node.js version in `.nvmrc` directly.

The development server listens on port **4173**. There is no build step needed
to play or edit the game. Changes to HTML, CSS and modules appear after a refresh.

## App installation and offline use

The app includes a Web App Manifest with relative app ID, start URL and scope,
PNG icons for installation, a maskable Android icon, and an Apple touch icon.
All URLs work under GitHub Pages' `/2048/` prefix as well as at a domain root.
Installation requires HTTPS (or localhost for development). The browser controls
whether it offers a native install prompt; the page only requests it following
a click. Dismissed prompts are not reused or shown automatically.

Safari on iPhone/iPad uses **Teilen → Zum Home-Bildschirm → Hinzufügen**.
Safari on supported macOS versions uses **Ablage → Zum Dock hinzufügen**.
Chrome/Edge and Android receive matching browser-menu instructions when the
native prompt is not available. Browser and OS policies may disable installation.

Exported builds register a service worker and cache the complete, versioned app
shell after the first successful online visit. The game can then reload offline;
game data remains in the existing local browser storage. Cache activation removes
only this app's obsolete caches for the same URL scope. Updates wait for existing
app windows/tabs to close before replacing their cached version. Online navigation
checks the network for the latest release. Storage policies or eviction can disable
offline availability without preventing online play.

Source development skips worker registration so edits are not hidden by caching.
To check offline behavior, serve the export instead:

```sh
npm run build
python3 -m http.server 4173 --directory dist
```

PNG icons are checked in. Regenerate them from the opaque master
`assets/icon-source.png` with `npm run icons` (requires Playwright's Chromium,
or `CHROMIUM_PATH`). The master is excluded from exported builds.

The artwork shows four tiles spelling 2048. Apple and Android receive explicit
PNG icons at their required sizes; the build versions icon and manifest URLs.
Existing home-screen shortcuts can retain their old icon. After an update, remove
the old shortcut and add the page again; there is no need to clear browser storage.

## Adaptive platform UI

All three styles use the same markup, game logic, storage, keyboard controls and
swipe handling. `platform.css` overrides visual tokens and component styling;
`src/platform.js` resolves appearance from browser identity and platform hints.
No UI framework, extra runtime dependency, network lookup or high-entropy
Client Hints request is required.

A small parser-blocking `src/platform.js` script runs in the document head after
the stylesheets and before the body. It applies the browser mapping, saved style,
system or explicit light/dark theme, layout and transparency preferences before
the game is visible. The game module shares its validated startup preferences
through the frozen `PlatformUI` API. The initial appearance therefore works even
when the game module is slow to load. Blocked storage still follows the system's
color scheme. The browser toolbar color follows the active style and color scheme.

Automatic selection gives the browser family priority:

| Browser | UI style |
| --- | --- |
| Edge (including Android and iOS) | Fluent, inspired by Windows 11 |
| Chrome (including macOS and iOS) | Material 3 |
| Safari | Liquid Glass |
| Other / unknown | Android → Material; Windows → Fluent; otherwise Liquid Glass |

Edge is checked before Chrome because its user agent also contains Chrome.
Low-entropy `navigator.userAgentData` is used when available, with user-agent
and platform fallbacks (including iPad desktop mode). Windows 10 and 11 cannot
be reliably distinguished using these signals; the Fluent style is used for
both. Browser identity is only an appearance hint, never a feature gate.
User-agent spoofing, embedded webviews and privacy features can affect the result.
The manual choice takes priority and is stored separately from the game and
existing appearance settings. It works for the current session even when storage
is blocked. Unknown or invalid saved choices safely use automatic detection.

Material uses opaque tonal surfaces, rounded controls and a purple accent.
Fluent uses neutral layers, smaller radii, a blue accent and a CSS acrylic-like
settings panel. These are lightweight web interpretations: Apple's native Liquid
Glass renderer and Windows desktop Mica are not exposed to ordinary web pages.
Roboto and Segoe UI are preferred when installed, with local system fallbacks;
no external font request is made. Each style has its own switches, settings rows,
selection states and control shapes. Fluent includes a forced-colors treatment
for Windows high contrast; both styles retain keyboard focus and reduced motion.

Tests check browser identity through unit cases and emulated navigator signals.
The platform suite supports Chromium and WebKit. Engine tests do not replace
actual Safari/iOS, Chrome/Android and Edge/Windows testing; real-device validation
remains necessary before release.

## Validation

```sh
npm test                  # game rules and browser/platform selection
npm run build             # export just the application to dist/
npx playwright install chromium
npm run test:e2e           # build and run game + platform UI checks against dist/
```

If Chromium is already installed, skip the browser download and use:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

To also check the platform UI in Safari's browser engine:

```sh
npx playwright install --with-deps chromium webkit
PLAYWRIGHT_ENGINES=chromium,webkit npm run test:e2e
```

The default run uses Chromium for the complete suite. The optional WebKit project
runs the platform and installation suites; Chromium also tests native touch input through CDP and
forced-colors emulation. Cross-engine swipe checks dispatch Pointer Events;
keyboard and touch taps use Playwright's input APIs. CI runs both engines.

The same complete suite can also run in installed Google Chrome and Microsoft Edge:

```sh
PLAYWRIGHT_ENGINES=chrome,msedge npm run test:e2e
```

Playwright uses the installed stable browser channels. For portable browser binaries,
set `CHROME_PATH` and `EDGE_PATH` to their executable paths. A separate test checks
automatic selection with the browser's unmodified identity signals and records its
version, user agent and detected style in the Playwright report. These desktop
browser runs do not emulate the Windows compositor or an actual Android device.

Browser tests cover keyboard and touch input, merging, undo, persistence,
restart confirmation, win/continue, game over, dialogs, reduced motion,
unavailable storage, accessible cell labels, and layouts from 320 to 1440 px.
The game fits the available viewport height without page scrolling, including
small portrait screens and phone landscape layouts. Tests also cover the glass
slider, paused input in settings, persisted appearance, reduced transparency,
appearance reset, square/filled layouts, and following the system color scheme.
Platform checks cover automatic selection, style overrides, reset, blocked
storage, both color schemes and all tile values on phone and desktop layouts.
Additional checks keep appearance correct before the game module loads, verify
system dark mode with blocked storage, and exercise settings with the keyboard,
touch pointer swipes, reduced motion and Windows high contrast.
Installation tests cover native prompt events (accept/dismiss/failure), browser
instructions, installed-window visibility, PNG dimensions, manifest resolution,
offline reload at `/` and `/2048/`, and isolation from other apps' caches. Chrome
and Edge validate actual installability through CDP using a temporary non-incognito
profile; OS confirmation itself is tested through the prompt-event contract.
Playwright runs a temporary HTTP server on port **4174** and stops it afterwards.

## GitHub Pages

This is a static site with relative asset URLs, so it works under `/2048/`.
The [Pages workflow](.github/workflows/pages.yml) runs on pushes to **`main`**
and can also be started manually from the Actions tab. It installs the locked
dependencies, Chromium and WebKit, runs all game-logic, platform and browser tests, and
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
The workflow pins the Ubuntu 26.04 LTS runner, uses the Node.js version in
`.nvmrc` and npm version in `package.json`, and uses current stable GitHub Actions
with Node.js 24 runtimes (including the Pages artifact uploader's dependencies).

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
- `src/platform.js` — browser/platform hints and UI style selection
- `src/install.js`, `manifest.webmanifest`, `sw.js` — installation and offline app shell
- `index.html`, `styles.css`, `platform.css`, `assets/` — interface and visual design
- `tests/` — Node unit tests and Playwright browser tests

Inspired by [Gabriele Cirulli's 2048](https://github.com/gabrielecirulli/2048).
