// Appearance hints only: never use browser identity to enable game features.
export const UI_STYLES = ["auto", "liquid", "material", "fluent"];
export const UI_LABELS = { liquid: "Liquid Glass", material: "Material 3", fluent: "Fluent" };

export function detectPlatform({ userAgent = "", platform = "", maxTouchPoints = 0, userAgentData } = {}) {
  const brands = (userAgentData?.brands ?? []).map(({ brand }) => brand);
  const device = userAgentData?.platform || platform;
  const android = /Android/i.test(`${device} ${userAgent}`);
  const apple = /iPhone|iPad|iPod|Mac/i.test(`${device} ${userAgent}`);
  const ipad = /iPad/i.test(userAgent) || (/Mac/i.test(device) && maxTouchPoints > 1);
  const os = android ? "Android" : ipad ? "iPadOS" : /iPhone|iPod/i.test(userAgent) ? "iOS"
    : /Win/i.test(`${device} ${userAgent}`) ? "Windows" : apple ? "macOS"
    : /Linux/i.test(`${device} ${userAgent}`) ? "Linux" : "Unbekannt";
  // Edge includes Chrome/Safari tokens. iOS variants identify themselves separately.
  const edge = brands.includes("Microsoft Edge") || /Edg(?:e|A|iOS)?\//.test(userAgent);
  const firefox = /Firefox\/|FxiOS\//.test(userAgent);
  const otherChromium = /OPR\/|Opera|SamsungBrowser\//.test(userAgent);
  const chrome = !edge && !otherChromium && (brands.includes("Google Chrome") || /Chrome\/|CriOS\//.test(userAgent));
  const safari = !edge && !chrome && !firefox && !otherChromium && /Version\/.+Safari\//.test(userAgent);
  const browser = edge ? "Edge" : chrome ? "Chrome" : safari ? "Safari" : firefox ? "Firefox" : "Anderer Browser";
  const style = edge ? "fluent" : chrome ? "material" : safari ? "liquid"
    : android ? "material" : os === "Windows" ? "fluent" : "liquid";
  return { browser, os, style };
}

export function resolveUIStyle(preference, detected) {
  return UI_STYLES.includes(preference) && preference !== "auto" ? preference : detected.style;
}
