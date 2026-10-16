import test from "node:test";
import assert from "node:assert/strict";
import { detectPlatform, resolveUIStyle } from "../src/platform.js";

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
];

for (const [name, input, browser, os, style] of cases) {
  test(`platform detection: ${name}`, () => assert.deepEqual(detectPlatform(input), { browser, os, style }));
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
