const button = document.querySelector("#install-button");
const dialog = document.querySelector("#install-dialog");
const standalone = matchMedia("(display-mode: standalone), (display-mode: minimal-ui)");
const { browser, os } = globalThis.PlatformUI.initial.detected;
let deferredPrompt = null;
let installed = false;
let prompting = false;

function updateButton() {
  button.hidden = !isSecureContext || installed || standalone.matches || navigator.standalone === true;
  button.disabled = prompting;
}

function showInstructions(failed = false) {
  let description = "Installiere 2048 über deinen Browser.";
  let steps;
  if (os === "iOS" || os === "iPadOS") {
    steps = ["Das Teilen-Menü im Browser öffnen.", "„Zum Home-Bildschirm“ wählen.", "Mit „Hinzufügen“ bestätigen."];
  } else if (browser === "Safari" && os === "macOS") {
    steps = ["In Safari „Ablage“ → „Zum Dock hinzufügen“ wählen.", "Mit „Hinzufügen“ bestätigen."];
  } else if (os === "Android") {
    steps = ["Das Browsermenü öffnen.", "„App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.", "Die Installation bestätigen."];
  } else if (browser === "Edge") {
    steps = ["Im Browsermenü „Apps“ öffnen.", "„Diese Site als App installieren“ wählen und bestätigen."];
  } else if (browser === "Chrome") {
    steps = ["Im Browsermenü „Streamen, speichern und teilen“ öffnen.", "„Seite als App installieren“ wählen und bestätigen, falls angeboten."];
  } else {
    description = "Dieser Browser bietet hier keine direkte App-Installation an.";
    steps = ["Die Seite in Chrome, Edge oder Safari öffnen."];
  }
  document.querySelector("#install-description").textContent = description;
  document.querySelector("#install-instructions").replaceChildren(...steps.map((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
  const feedback = document.querySelector("#install-feedback");
  feedback.textContent = failed ? "Der Installationsdialog konnte nicht geöffnet werden. Nutze das Browsermenü." : "";
  feedback.hidden = !failed;
  if (!dialog.open) dialog.showModal();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  updateButton();
});

window.addEventListener("appinstalled", () => {
  installed = true;
  deferredPrompt = null;
  if (dialog.open) dialog.close();
  updateButton();
});

button.addEventListener("click", async () => {
  if (prompting) return;
  if (!deferredPrompt) { showInstructions(); return; }
  const prompt = deferredPrompt;
  deferredPrompt = null; // Native install events can only be used once.
  prompting = true;
  updateButton();
  try {
    await prompt.prompt(); // Keep the native prompt in the user's click gesture.
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") installed = true;
  } catch { showInstructions(true); }
  finally { prompting = false; updateButton(); }
});

standalone.addEventListener("change", updateButton);
updateButton();

// Only exported builds cache an app shell. Source development stays uncached.
if (isSecureContext && "serviceWorker" in navigator && new URL(import.meta.url).searchParams.has("v")) {
  const register = () => navigator.serviceWorker.register(new URL("../sw.js", import.meta.url), { updateViaCache: "none" }).catch(() => {
    // Browser policy may block offline storage; the online game still works.
  });
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
