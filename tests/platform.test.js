import test from "node:test";
import assert from "node:assert/strict";
import "../src/platform.js";
const { detectPlatform, resolveUIStyle, readPreferences, readRuntime } = globalThis.PlatformUI;

const cases = [
  ["Chrome on Android", { userAgent: "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/134.0.0.0 Mobile Safari/537.36" }, "Chrome", "Android", "material"],
  ["Edge on Windows", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0" }, "Edge", "Windows", "fluent"],
  ["Safari on macOS", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15" }, "Safari", "macOS", "liquid"],
  ["Safari on iPhone", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1" }, "Safari", "iOS", "liquid"],
  ["iPad desktop mode", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Safari/605.1.15", platform: "MacIntel", maxTouchPoints: 5 }, "Safari", "iPadOS", "liquid"],
  ["Chrome on iOS", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/134.0 Mobile/15E148 Safari/604.1" }, "Chrome", "iOS", "material"],
  ["Edge on iOS", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 EdgiOS/134.0 Mobile/15E148 Safari/605.1.15" }, "Edge", "iOS", "fluent"],
  ["Edge on Android", { userAgent: "Mozilla/5.0 (Linux; Android 15) Chrome/134.0 Safari/537.36 EdgA/134.0" }, "Edge", "Android", "fluent"],
  ["legacy Edge", { userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/42.0 Safari/537.36 Edge/12.0" }, "Edge", "Windows", "fluent"],
  ["Chrome on macOS", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/134.0 Safari/537.36" }, "Chrome", "macOS", "material"],
  ["Firefox on Windows", { userAgent: "Mozilla/5.0 (Windows NT 10.0) Firefox/136.0" }, "Firefox", "Windows", "fluent"],
  ["Firefox on iOS", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) FxiOS/136.0 Mobile/15E148 Safari/605.1.15" }, "Firefox", "iOS", "liquid"],
  ["Samsung browser", { userAgent: "Mozilla/5.0 (Linux; Android 15) SamsungBrowser/27.0 Chrome/125.0 Safari/537.36" }, "Anderer Browser", "Android", "material"],
  ["Opera is not Chrome", { userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/134.0 Safari/537.36 OPR/118.0" }, "Anderer Browser", "Windows", "fluent"],
  ["Client Hints Edge", { userAgentData: { brands: [{ brand: "Not_A Brand" }, { brand: "Chromium" }, { brand: "Microsoft Edge" }], platform: "Windows" } }, "Edge", "Windows", "fluent"],
  ["Client Hints Chrome", { userAgentData: { brands: [{ brand: "Chromium" }, { brand: "Google Chrome" }], platform: "Android" } }, "Chrome", "Android", "material"],
  ["unknown browser", {}, "Anderer Browser", "Unbekannt", "liquid"],
  ["incomplete Client Hints", { userAgentData: { brands: [null, {}], platform: "Windows" } }, "Anderer Browser", "Windows", "fluent"],
  ["malformed Client Hints", { userAgentData: { brands: "Chromium", platform: "Android" } }, "Anderer Browser", "Android", "material"],
];

for (const [name, input, browser, os, style] of cases) {
  test(`platform detection: ${name}`, () => assert.deepEqual(detectPlatform(input), { browser, os, style }));
}

test("Tauri markers work without the optional global API or OS plugin", () => {
  for (const environment of [{ isTauri: true }, { __TAURI_INTERNALS__: {} }, { __TAURI_IPC__: () => {} }]) {
    assert.equal(readRuntime(environment).isTauri, true);
  }
  for (const environment of [{}, { isTauri: false }, { isTauri: () => true }, { __TAURI__: {} }, { __TAURI_OS_PLUGIN_INTERNALS__: { platform: "linux" } }]) {
    assert.equal(readRuntime(environment).isTauri, false);
  }
});

for (const [platform, os, style] of [["windows", "Windows", "fluent"], ["linux", "Linux", "material"], ["macos", "macOS", "liquid"], ["ios", "iOS", "liquid"], ["android", "Android", "material"]]) {
  test(`Tauri OS plugin: ${platform} overrides conflicting browser and OS hints`, () => {
    const runtime = readRuntime({ __TAURI_INTERNALS__: {}, __TAURI_OS_PLUGIN_INTERNALS__: { platform } });
    const input = { userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/134.0 Safari/537.36 Edg/134.0", platform: "Win32" };
    assert.deepEqual(detectPlatform(input, runtime), { browser: "Tauri", os, style });
    // The OS plugin's data alone must never turn an ordinary browser into Tauri.
    assert.deepEqual(detectPlatform(input, { ...runtime, isTauri: false }), { browser: "Edge", os: "Windows", style: "fluent" });
  });
}

for (const [name, input, os, style] of [
  ["Windows WebView2 without Edge tokens", { userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/134.0 Safari/537.36", platform: "Win32" }, "Windows", "fluent"],
  ["Linux WebKitGTK", { userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15", platform: "Linux x86_64" }, "Linux", "material"],
  ["macOS with Chrome tokens", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/134.0 Safari/537.36", platform: "MacIntel" }, "macOS", "liquid"],
  ["iPad desktop mode", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Safari/605.1.15", platform: "MacIntel", maxTouchPoints: 5 }, "iPadOS", "liquid"],
  ["Android WebView", { userAgent: "Mozilla/5.0 (Linux; Android 15; wv) Chrome/134.0 Mobile Safari/537.36" }, "Android", "material"],
]) {
  test(`Tauri without OS plugin: ${name}`, () => {
    for (const platform of [undefined, "unsupported", "constructor"]) {
      assert.deepEqual(detectPlatform(input, { isTauri: true, platform }), { browser: "Tauri", os, style });
    }
  });
}

test("manual styles override detection; auto and invalid values use detection", () => {
  for (const style of ["liquid", "material", "fluent"]) {
    for (const preference of ["liquid", "material", "fluent"]) {
      assert.equal(resolveUIStyle(preference, { style }), preference);
    }
    for (const preference of ["auto", "invalid", null, undefined]) {
      assert.equal(resolveUIStyle(preference, { style }), style);
    }
  }
});

test("appearance defaults follow system preferences even with unavailable storage", () => {
  const result = readPreferences(() => { throw new Error("Storage blocked"); }, { reduceTransparency: true });
  assert.deepEqual(result, { uiPreference: "auto", themePreference: "system", appearance: { glassLevel: 35, fillScreen: true, reduceTransparency: true }, storageAvailable: false });
});

test("saved appearance is validated once for bootstrap and game initialization", () => {
  const values = { "2048-ui-style": "fluent", "2048-glass-theme": "dark", "2048-glass-appearance": JSON.stringify({ version: 1, glassLevel: 75.7, fillScreen: false, reduceTransparency: true }) };
  const read = (key) => values[key] ?? null;
  assert.deepEqual(readPreferences(read), { uiPreference: "fluent", themePreference: "dark", appearance: { glassLevel: 76, fillScreen: false, reduceTransparency: true }, storageAvailable: true });
  values["2048-ui-style"] = "invalid";
  values["2048-glass-theme"] = "invalid";
  for (const saved of ["{bad json", "null", '{"version":2,"glassLevel":90}', '{"version":1,"glassLevel":"50","fillScreen":0,"reduceTransparency":"false"}']) {
    values["2048-glass-appearance"] = saved;
    assert.deepEqual(readPreferences(read), { uiPreference: "auto", themePreference: "system", appearance: { glassLevel: 35, fillScreen: true, reduceTransparency: false }, storageAvailable: true });
  }
  for (const [saved, expected] of [[-10, 0], [120, 100]]) {
    values["2048-glass-appearance"] = JSON.stringify({ version: 1, glassLevel: saved });
    assert.equal(readPreferences(read).appearance.glassLevel, expected);
  }
});
