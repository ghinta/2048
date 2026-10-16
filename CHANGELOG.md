# Changelog

Changes are grouped by version. This project uses semantic versioning.

## [Unreleased]

## [1.0.0] - 2026-10-16

Initial versioned release of the web/PWA and desktop applications.

### Added

- German-language 2048 with arrow-key/WASD and swipe controls, undo, saved games
  and a persistent best score.
- Adaptive Liquid Glass, Material 3 and Fluent interfaces, light/dark themes,
  reduced transparency, reduced motion and manual appearance settings.
- Browser-based automatic UI selection for the web app and OS-based selection
  inside Tauri: Windows → Fluent, Linux/Android → Material 3, Apple → Liquid Glass.
- Installable PWA on [GitHub Pages](https://ghinta.github.io/2048/), with a browser
  installation button, platform-specific instructions and offline app-shell caching.
- Native Tauri 2 desktop packages: Windows x64 EXE/MSI, Linux x64 AppImage/DEB,
  and macOS DMGs for Apple Silicon and Intel.
- CI builds and downloadable artifacts for all desktop targets. Version tags
  publish GitHub Releases with installers and SHA-256 checksums.
- Explicit Apple, Android and desktop icons using the same four-tile 2048 artwork.

### Changed

- Updated the build toolchain to Node.js 24 LTS and npm 12, and GitHub Actions
  to versions using Node.js 24 runtimes.
- Pinned Rust and Tauri dependencies for desktop builds.

### Fixed

- Home-screen shortcuts now receive explicit PNG icons instead of a generated
  single-digit monogram; versioned asset URLs allow updated icons to be fetched.
- Saved appearance and automatic style selection are applied before the first
  render, including when browser storage is unavailable.
- Mobile layouts keep the board and controls reachable in portrait and landscape.
- Windows installers use `2048-Spiel` to avoid invalid numeric-only MSI metadata;
  the game window and PWA remain named `2048`.

### Notes

- Desktop packages are unsigned; macOS packages are not notarized.
- Desktop and PWA saved games use separate local storage.
- Android/iOS native packages are not included; the PWA supports mobile installation.

[Unreleased]: https://github.com/ghinta/2048/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ghinta/2048/releases/tag/v1.0.0
