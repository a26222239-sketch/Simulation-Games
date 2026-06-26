// ============================================================
// main.js — 進入點：組裝商店場景並啟動
//
// 【場景架構】目前只有商店場景(store)。未來要加城市經營時，
//  可把 store 換成一個「目前場景」物件，提供 update(dt)/draw()/setTile 等
//  介面，再做個切換選單即可，這個迴圈與 UI 幾乎不用動。
// ============================================================
import { Store } from "./store.js";
import { Renderer } from "./render.js";
import { Input } from "./input.js";
import { TILES } from "./config.js";

const canvas = document.getElementById("game");
const store = new Store();
if (store.hasSave()) store.loadFromStorage();

const renderer = new Renderer(canvas, store);

// 目前選的工具（要放置的設施），預設貨架
let currentTool = "shelf";
renderer.previewType = currentTool;

// 點格子 → 放置目前設施
const input = new Input(canvas, store, renderer, (gx, gy) => {
  const res = store.setTile(gx, gy, currentTool);
  if (res && res.msg) toast(res.msg);
  if (res && res.ok) store.saveToStorage();
});

// ---------- 主迴圈（含 dt 讓顧客平滑移動）----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // 夾住 dt，分頁切回來時不會暴衝
  last = now;
  store.update(dt);
  renderer.draw();
  updateStats();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- 自動存檔 ----------
setInterval(() => store.saveToStorage(), 10000);
window.addEventListener("pagehide", () => store.saveToStorage());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") store.saveToStorage();
});

// ---------- 上方資訊列 ----------
const elMoney = document.getElementById("stat-money");
const elInStore = document.getElementById("stat-instore");
const elServed = document.getElementById("stat-served");
const elOpen = document.getElementById("stat-open");
function updateStats() {
  elMoney.textContent = Math.floor(store.money).toLocaleString();
  elInStore.textContent = store.customers.length;
  elServed.textContent = store.served.toLocaleString();
  elOpen.textContent = store.open ? "營業中" : "休息中";
  elOpen.style.color = store.open ? "#7fe08a" : "#ff8a8a";
}

// ---------- 工具列 ----------
const toolButtons = document.querySelectorAll(".tool");
function selectTool(name) {
  currentTool = name;
  renderer.previewType = name;
  toolButtons.forEach((b) => b.classList.toggle("active", b.dataset.tool === name));
}
toolButtons.forEach((btn) => {
  btn.addEventListener("click", () => selectTool(btn.dataset.tool));
  const def = TILES[btn.dataset.tool];
  if (def) btn.title = def.name;
});
selectTool("shelf");

// ---------- 右上選單 ----------
const menuPanel = document.getElementById("menu-panel");
document.getElementById("btn-menu").addEventListener("click", () => menuPanel.classList.toggle("hidden"));

document.getElementById("btn-toggle-open").addEventListener("click", () => {
  store.open = !store.open;
  toast(store.open ? "開始營業 🟢" : "暫停營業 🔴");
  menuPanel.classList.add("hidden");
});
document.getElementById("btn-save").addEventListener("click", () => {
  toast(store.saveToStorage() ? "已存檔 ✅" : "存檔失敗 ❌");
  menuPanel.classList.add("hidden");
});
document.getElementById("btn-load").addEventListener("click", () => {
  if (!store.hasSave()) return toast("找不到存檔");
  toast(store.loadFromStorage() ? "已讀取存檔 📂" : "讀檔失敗");
  menuPanel.classList.add("hidden");
});
document.getElementById("btn-new").addEventListener("click", () => {
  if (confirm("確定要重設店面嗎？目前的佈置會回到預設。")) {
    store.reset(); store.saveToStorage(); toast("已重設店面 🆕");
  }
  menuPanel.classList.add("hidden");
});
document.getElementById("btn-export").addEventListener("click", () => {
  const data = JSON.stringify(store.serialize(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `mini-store-資金${Math.floor(store.money)}.json`; a.click();
  URL.revokeObjectURL(url);
  menuPanel.classList.add("hidden");
});
const fileInput = document.getElementById("file-input");
document.getElementById("btn-import").addEventListener("click", () => { fileInput.click(); menuPanel.classList.add("hidden"); });
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (store.load(data)) { store.saveToStorage(); toast("已匯入存檔 ⬆️"); }
      else toast("存檔格式不符");
    } catch (err) { toast("匯入失敗：檔案讀不懂"); }
  };
  reader.readAsText(file);
  fileInput.value = "";
});

// ---------- 浮動提示 ----------
let toastTimer = null;
const toastEl = document.getElementById("toast");
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  toastEl.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.style.opacity = "0";
    setTimeout(() => toastEl.classList.add("hidden"), 250);
  }, 1400);
}
