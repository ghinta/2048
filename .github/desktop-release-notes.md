2048 for Windows, Linux and macOS, with automatic platform UI.

**Web / PWA:** [Play or install from GitHub Pages](https://ghinta.github.io/2048/).
The PWA remains independent of these desktop installers.

- **Windows x64:** `.exe` (NSIS) or `.msi`; requires Microsoft WebView2. The installer bootstraps it if missing.
- **Linux x64:** `.AppImage` or `.deb`, built on Ubuntu 24.04. GTK/WebKitGTK 4.1 and compatible system libraries are required.
- **macOS:** choose the `aarch64` DMG for Apple Silicon or the `x64` DMG for Intel.

The desktop packages are unsigned and macOS packages are not notarized. Windows
or macOS may warn or block installation according to local policy. Signing and
notarization are not configured. SHA-256 checksums are included in `SHA256SUMS`.

Desktop app data and the PWA's browser data are separate; saved games are not
automatically transferred between them. Android/iOS native packages are not
included; use the PWA on mobile devices.
