import { SIZE, addTile, canMove, hasWon, moveBoard, newBoard, readSavedGame } from "./game.js";
const { resolveUIStyle, UI_LABELS, UI_STYLES, defaultAppearance: createDefaultAppearance, updateThemeColor, initial } = globalThis.PlatformUI;

const STORAGE = "2048-glass-game";
const BEST_STORAGE = "2048-glass-best";
const $ = (selector) => document.querySelector(selector);
const boardElement = $("#board");
const tileLayer = $("#tile-layer");
const scoreElement = $("#score");
const bestElement = $("#best");
const undoButton = $("#undo-button");
const overlay = $("#game-overlay");
const helpDialog = $("#help-dialog");
const restartDialog = $("#restart-dialog");
const settingsDialog = $("#settings-dialog");
const dialogs = [helpDialog, restartDialog, settingsDialog];
const dialogOpen = () => dialogs.some((dialog) => dialog.open);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
const detectedPlatform = initial.detected;
const defaultAppearance = () => createDefaultAppearance(matchMedia("(prefers-reduced-transparency: reduce)").matches);
const numberFormat = new Intl.NumberFormat("de-DE");

let storageWarningShown = false;
let toastTimer;
let previous = null;
let busy = false;
let queuedDirection = null;
let overlayKind = null;
let best = 0;
let state;
let appearance = { ...initial.preferences.appearance };
let themePreference = initial.preferences.themePreference;
let uiPreference = initial.preferences.uiPreference;

function notify(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
}

function storageWarning() {
  if (storageWarningShown) return;
  storageWarningShown = true;
  notify("Dein Browser erlaubt kein Speichern. Du kannst trotzdem spielen.");
}

try {
  const savedBest = Number(localStorage.getItem(BEST_STORAGE));
  best = Number.isSafeInteger(savedBest) && savedBest >= 0 ? savedBest : 0;
  const raw = localStorage.getItem(STORAGE);
  if (raw) {
    try { state = readSavedGame(JSON.parse(raw)); } catch { /* An invalid save starts a fresh round. */ }
  }
} catch { storageWarning(); }
if (!initial.preferences.storageAvailable) storageWarning();

state ??= { board: newBoard(), score: 0, moves: 0, continued: false };
best = Math.max(best, state.score);

function save() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify({ version: 1, ...state }));
    localStorage.setItem(BEST_STORAGE, String(best));
  } catch { storageWarning(); }
}

const cells = [];
for (let row = 0; row < SIZE; row++) {
  const rowElement = document.createElement("div");
  rowElement.className = "board-row";
  rowElement.setAttribute("role", "row");
  for (let column = 0; column < SIZE; column++) {
    const cell = document.createElement("div");
    cell.className = "board-cell";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-rowindex", row + 1);
    cell.setAttribute("aria-colindex", column + 1);
    rowElement.append(cell);
    cells.push(cell);
  }
  $("#board-cells").append(rowElement);
}

function renderTiles(spawn = null, merged = []) {
  const fragment = document.createDocumentFragment();
  state.board.forEach((value, index) => {
    cells[index].setAttribute("aria-label", `Zeile ${Math.floor(index / SIZE) + 1}, Spalte ${index % SIZE + 1}: ${value || "leer"}`);
    if (!value) return;
    const tile = document.createElement("div");
    tile.className = "tile";
    if (index === spawn) tile.classList.add("spawn");
    if (merged.includes(index)) tile.classList.add("merge");
    tile.dataset.index = index;
    tile.dataset.value = value;
    tile.dataset.large = value >= 1024;
    tile.dataset.huge = value >= 16384;
    tile.dataset.super = value > 2048;
    tile.style.setProperty("--x", index % SIZE);
    tile.style.setProperty("--y", Math.floor(index / SIZE));
    const face = document.createElement("div");
    face.className = "tile-face";
    face.textContent = value;
    tile.append(face);
    fragment.append(tile);
  });
  tileLayer.replaceChildren(fragment);
}

function updateScores() {
  scoreElement.textContent = numberFormat.format(state.score);
  bestElement.textContent = numberFormat.format(best);
  for (const [element, value] of [[scoreElement, state.score], [bestElement, best]]) {
    element.style.fontSize = value >= 1_000_000 ? "19px" : value >= 100_000 ? "23px" : "";
  }
  $("#move-count").textContent = `${numberFormat.format(state.moves)} ${state.moves === 1 ? "Zug" : "Züge"}`;
  undoButton.disabled = !previous || busy;
}

function syncOverlay() {
  const kind = hasWon(state.board) && !state.continued ? "won" : !canMove(state.board) ? "over" : null;
  const changed = overlayKind !== kind;
  overlayKind = kind;
  overlay.hidden = !kind;
  boardElement.setAttribute("aria-disabled", String(Boolean(kind)));
  if (!kind) return;
  const won = kind === "won";
  $("#overlay-title").textContent = won ? "2048 erreicht" : "Spiel beendet";
  $("#overlay-description").textContent = won
    ? "Du kannst weiterspielen oder ein neues Spiel starten."
    : `${numberFormat.format(state.score)} Punkte. Keine weiteren Züge möglich.`;
  const primary = $("#overlay-primary");
  primary.replaceChildren(document.createTextNode(won ? "Weiterspielen" : "Neues Spiel"));
  const secondary = $("#overlay-secondary");
  secondary.textContent = won ? "Neues Spiel" : "Letzten Zug zurück";
  secondary.hidden = !won && !previous;
  if (changed) primary.focus({ preventScroll: true });
}

function announce(message) {
  $("#game-announcement").textContent = message;
}

async function move(direction) {
  if (dialogOpen() || overlayKind) return;
  if (busy) {
    queuedDirection = direction;
    return;
  }
  const result = moveBoard(state.board, direction);
  if (!result.moved) return;
  busy = true;
  undoButton.disabled = true;
  previous = { ...state, board: [...state.board] };

  if (!reducedMotion.matches) {
    for (const { from, to } of result.movements) {
      const tile = tileLayer.querySelector(`[data-index="${from}"]`);
      tile.style.setProperty("--x", to % SIZE);
      tile.style.setProperty("--y", Math.floor(to / SIZE));
      if (from !== to) tile.style.zIndex = "2";
    }
    await new Promise((resolve) => setTimeout(resolve, 135));
  }

  const spawned = addTile(result.board);
  state = { ...state, board: spawned.board, score: state.score + result.score, moves: state.moves + 1 };
  best = Math.max(best, state.score);
  busy = false;
  renderTiles(spawned.index, result.merged);
  updateScores();
  save();
  syncOverlay();
  if (result.score) {
    const addition = $("#score-addition");
    addition.textContent = `+${numberFormat.format(result.score)}`;
    addition.classList.remove("show");
    void addition.offsetWidth;
    addition.classList.add("show");
  }
  announce(overlayKind === "won" ? "2048 erreicht! Du kannst weiterspielen."
    : overlayKind === "over" ? `Runde beendet mit ${numberFormat.format(state.score)} Punkten.`
    : `Zug ${state.moves}. ${result.score ? `${result.score} Punkte dazu. ` : ""}${numberFormat.format(state.score)} Punkte. Höchste Kachel: ${Math.max(...state.board)}.`);

  const next = queuedDirection;
  queuedDirection = null;
  if (next) requestAnimationFrame(() => move(next));
}

function undo() {
  if (!previous || busy || dialogOpen()) return;
  state = previous;
  previous = null;
  queuedDirection = null;
  renderTiles();
  updateScores();
  syncOverlay();
  save();
  boardElement.focus({ preventScroll: true });
  announce(`Letzter Zug zurückgenommen. ${numberFormat.format(state.score)} Punkte.`);
}

function startNewGame() {
  if (busy) return;
  state = { board: newBoard(), score: 0, moves: 0, continued: false };
  previous = null;
  queuedDirection = null;
  restartDialog.close();
  renderTiles();
  updateScores();
  syncOverlay();
  save();
  boardElement.focus({ preventScroll: true });
  announce("Neues Spiel. Zwei Kacheln sind bereit.");
}

function requestNewGame() {
  if (busy) return;
  if (state.moves === 0 || overlayKind) startNewGame();
  else restartDialog.showModal();
}

const directions = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  a: "left", d: "right", w: "up", s: "down",
};
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || dialogOpen()
    || event.target.matches("input, textarea, select, [contenteditable='true']")) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (directions[key] && !overlayKind) {
    event.preventDefault();
    move(directions[key]);
  } else if (key === "z") {
    event.preventDefault();
    undo();
  }
});

let pointerStart = null;
boardElement.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
  pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  boardElement.setPointerCapture(event.pointerId);
  boardElement.focus({ preventScroll: true });
});
boardElement.addEventListener("pointerup", (event) => {
  if (!pointerStart || event.pointerId !== pointerStart.id) return;
  const dx = event.clientX - pointerStart.x;
  const dy = event.clientY - pointerStart.y;
  pointerStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
});
boardElement.addEventListener("pointercancel", () => { pointerStart = null; });
boardElement.addEventListener("lostpointercapture", () => { pointerStart = null; });

undoButton.addEventListener("click", undo);
document.querySelectorAll("[data-new-game]").forEach((button) => button.addEventListener("click", requestNewGame));
$("#confirm-restart").addEventListener("click", startNewGame);
$("#help-button").addEventListener("click", () => helpDialog.showModal());
$("#settings-button").addEventListener("click", () => settingsDialog.showModal());
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
for (const dialog of dialogs) {
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
}

$("#overlay-primary").addEventListener("click", () => {
  if (overlayKind === "won") {
    state.continued = true;
    syncOverlay();
    save();
    boardElement.focus({ preventScroll: true });
  } else startNewGame();
});
$("#overlay-secondary").addEventListener("click", () => {
  if (overlayKind === "won") startNewGame();
  else undo();
});

function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === "dark";
  $("#theme-button").setAttribute("aria-label", dark ? "Helle Darstellung aktivieren" : "Dunkle Darstellung aktivieren");
  $("#theme-icon").setAttribute("href", dark ? "#icon-sun" : "#icon-moon");
  updateThemeColor();
}

function setUIStyle(preference, persist = false) {
  uiPreference = UI_STYLES.includes(preference) ? preference : "auto";
  const style = resolveUIStyle(uiPreference, detectedPlatform);
  document.documentElement.dataset.ui = style;
  $("#ui-style").value = uiPreference;
  $("#platform-detection").textContent = `${detectedPlatform.browser} · ${detectedPlatform.os} · ${uiPreference === "auto" ? "Automatisch" : "Manuell"}: ${UI_LABELS[style]}`;
  $("#glass-settings").hidden = style !== "liquid";
  $("#transparency-setting").hidden = style === "material";
  updateThemeButton();
  if (persist) {
    try { localStorage.setItem("2048-ui-style", uiPreference); } catch { storageWarning(); }
  }
}

function setTheme(preference, persist = false) {
  themePreference = preference;
  document.documentElement.dataset.theme = preference === "system" ? (systemTheme.matches ? "dark" : "light") : preference;
  document.querySelectorAll("[name='appearance-theme']").forEach((input) => { input.checked = input.value === preference; });
  updateThemeButton();
  if (persist) {
    try { localStorage.setItem("2048-glass-theme", preference); } catch { storageWarning(); }
  }
}

function applyAppearance() {
  const level = appearance.glassLevel;
  document.documentElement.style.setProperty("--glass-level", level / 100);
  document.documentElement.dataset.layout = appearance.fillScreen ? "fill" : "square";
  document.documentElement.dataset.reduceTransparency = String(appearance.reduceTransparency);
  const slider = $("#glass-level");
  slider.value = level;
  slider.disabled = appearance.reduceTransparency;
  slider.setAttribute("aria-valuetext", `${level} % eingefärbt`);
  slider.style.setProperty("--range-progress", `${level}%`);
  $("#glass-value").textContent = `${level} %`;
  $("#fill-screen").checked = appearance.fillScreen;
  $("#reduce-transparency").checked = appearance.reduceTransparency;
}

function saveAppearance() {
  try { localStorage.setItem("2048-glass-appearance", JSON.stringify({ version: 1, ...appearance })); } catch { storageWarning(); }
}

$("#glass-level").addEventListener("input", (event) => {
  appearance.glassLevel = Number(event.target.value);
  applyAppearance();
  saveAppearance();
});
$("#fill-screen").addEventListener("change", (event) => {
  appearance.fillScreen = event.target.checked;
  applyAppearance();
  saveAppearance();
});
$("#reduce-transparency").addEventListener("change", (event) => {
  appearance.reduceTransparency = event.target.checked;
  applyAppearance();
  saveAppearance();
});
document.querySelectorAll("[name='appearance-theme']").forEach((input) => input.addEventListener("change", () => setTheme(input.value, true)));
$("#ui-style").addEventListener("change", (event) => setUIStyle(event.target.value, true));
$("#reset-appearance").addEventListener("click", () => {
  appearance = defaultAppearance();
  applyAppearance();
  saveAppearance();
  setTheme("system", true);
  setUIStyle("auto", true);
});
$("#theme-button").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true));
systemTheme.addEventListener("change", () => { if (themePreference === "system") setTheme("system"); });

renderTiles();
updateScores();
applyAppearance();
setTheme(themePreference);
setUIStyle(uiPreference);
save();
syncOverlay();
