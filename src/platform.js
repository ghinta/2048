// A small parser-blocking script sets the initial appearance before the body.
// Appearance hints only: never use browser identity to enable game features.
(() => {
  const UI_STYLES = Object.freeze(["auto", "liquid", "material", "fluent"]);
  const UI_LABELS = Object.freeze({ liquid: "Liquid Glass", material: "Material 3", fluent: "Fluent" });
  const NATIVE_PLATFORMS = Object.freeze({ windows: "Windows", linux: "Linux", macos: "macOS", ios: "iOS", android: "Android" });

  function readRuntime(environment = globalThis) {
    return {
      // Tauri injects these markers even when app.withGlobalTauri is disabled.
      isTauri: environment.isTauri === true || Boolean(environment.__TAURI_INTERNALS__) || typeof environment.__TAURI_IPC__ === "function",
      platform: environment.__TAURI_OS_PLUGIN_INTERNALS__?.platform,
    };
  }

  function detectPlatform({ userAgent = "", platform = "", maxTouchPoints = 0, userAgentData } = {}, { isTauri = false, platform: nativePlatform } = {}) {
    const brands = Array.isArray(userAgentData?.brands) ? userAgentData.brands.map((entry) => entry?.brand) : [];
    const device = userAgentData?.platform || platform;
    const android = /Android/i.test(`${device} ${userAgent}`);
    const apple = /iPhone|iPad|iPod|Mac/i.test(`${device} ${userAgent}`);
    const ipad = /iPad/i.test(userAgent) || (/Mac/i.test(device) && maxTouchPoints > 1);
    const nativeOS = isTauri && Object.hasOwn(NATIVE_PLATFORMS, nativePlatform) ? NATIVE_PLATFORMS[nativePlatform] : null;
    const os = nativeOS || (android ? "Android" : ipad ? "iPadOS" : /iPhone|iPod/i.test(userAgent) ? "iOS"
      : /Win/i.test(`${device} ${userAgent}`) ? "Windows" : apple ? "macOS"
      : /Linux/i.test(`${device} ${userAgent}`) ? "Linux" : "Unbekannt");
    // Edge includes Chrome/Safari tokens. iOS variants identify themselves separately.
    const edge = brands.includes("Microsoft Edge") || /Edg(?:e|A|iOS)?\//.test(userAgent);
    const firefox = /Firefox\/|FxiOS\//.test(userAgent);
    const otherChromium = /OPR\/|Opera|SamsungBrowser\//.test(userAgent);
    const chrome = !edge && !otherChromium && (brands.includes("Google Chrome") || /Chrome\/|CriOS\//.test(userAgent));
    const safari = !edge && !chrome && !firefox && !otherChromium && /Version\/.+Safari\//.test(userAgent);
    const browser = isTauri ? "Tauri" : edge ? "Edge" : chrome ? "Chrome" : safari ? "Safari" : firefox ? "Firefox" : "Anderer Browser";
    // Native apps follow the OS, regardless of the embedded webview's browser tokens.
    const style = isTauri ? (os === "Windows" ? "fluent" : os === "Linux" || os === "Android" ? "material" : "liquid")
      : edge ? "fluent" : chrome ? "material" : safari ? "liquid"
      : android ? "material" : os === "Windows" ? "fluent" : "liquid";
    return { browser, os, style };
  }

  function resolveUIStyle(preference, detected) {
    return UI_STYLES.includes(preference) && preference !== "auto" ? preference : detected.style;
  }

  function defaultAppearance(reduceTransparency = false) {
    return { glassLevel: 35, fillScreen: true, reduceTransparency };
  }

  function readPreferences(readItem, { reduceTransparency = false } = {}) {
    let storageAvailable = true;
    const read = (key) => {
      try { return readItem(key); }
      catch { storageAvailable = false; return null; }
    };
    const savedUI = read("2048-ui-style");
    const savedTheme = read("2048-glass-theme");
    const appearance = defaultAppearance(reduceTransparency);
    const savedAppearance = read("2048-glass-appearance");
    try {
      const saved = JSON.parse(savedAppearance);
      if (saved?.version === 1) {
        if (typeof saved.glassLevel === "number" && Number.isFinite(saved.glassLevel)) appearance.glassLevel = Math.round(Math.max(0, Math.min(100, saved.glassLevel)));
        if (typeof saved.fillScreen === "boolean") appearance.fillScreen = saved.fillScreen;
        if (typeof saved.reduceTransparency === "boolean") appearance.reduceTransparency = saved.reduceTransparency;
      }
    } catch { /* Ignore malformed preferences without discarding the game. */ }
    return {
      uiPreference: UI_STYLES.includes(savedUI) ? savedUI : "auto",
      themePreference: ["system", "light", "dark"].includes(savedTheme) ? savedTheme : "system",
      appearance,
      storageAvailable,
    };
  }

  function updateThemeColor() {
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue("--page").trim();
  }

  let initial = null;
  if (typeof document !== "undefined") {
    const detected = detectPlatform(navigator, readRuntime());
    const preferences = readPreferences((key) => localStorage.getItem(key), {
      reduceTransparency: matchMedia("(prefers-reduced-transparency: reduce)").matches,
    });
    const root = document.documentElement;
    root.dataset.ui = resolveUIStyle(preferences.uiPreference, detected);
    root.dataset.theme = preferences.themePreference === "system"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preferences.themePreference;
    root.dataset.layout = preferences.appearance.fillScreen ? "fill" : "square";
    root.dataset.reduceTransparency = String(preferences.appearance.reduceTransparency);
    root.style.setProperty("--glass-level", preferences.appearance.glassLevel / 100);
    updateThemeColor();
    initial = { detected, preferences };
  }

  globalThis.PlatformUI = Object.freeze({ UI_STYLES, UI_LABELS, readRuntime, detectPlatform, resolveUIStyle, defaultAppearance, readPreferences, updateThemeColor, initial });
})();
