// ============================================================
// main.js — 進入點：組裝農場世界並啟動
// ============================================================
import { World } from "./world.js";
import { Renderer } from "./render.js";
import { Input } from "./input.js";
import { UI } from "./ui.js";
import { ITEM_NAME } from "./config.js";

const canvas = document.getElementById("game");
const world = new World();
const loaded = world.hasSave() ? world.loadStorage() : false;

const renderer = new Renderer(canvas, world);

let currentTool = "hoe";
let pendingBuild = null; // 選了要蓋的建築，等下一次點地圖放置

const refresh = (msg) => { updateHUD(); world.save(); if (msg) toast(msg); };
const ui = new UI(world, refresh, (type) => { pendingBuild = type; });

// 搖桿與點擊
const input = new Input(
  canvas,
  { base: document.getElementById("joy"), stick: document.getElementById("joy-stick") },
  renderer,
  onTap
);

function onTap(cx, cy) {
  // 建造是「直接放置」，不需要走過去
  if (pendingBuild) {
    const r = world.build(pendingBuild, cx, cy);
    if (r && r.msg) toast(r.msg);
    if (r && r.msg && r.msg.startsWith("蓋好")) pendingBuild = null;
    refresh();
    return;
  }
  // 其餘：先尋路走到目標旁，抵達才執行（中途取消/走不到就不執行）
  const path = world.pathToCell(cx, cy);
  if (!path) { toast("走不過去"); return; }
  const tool = currentTool, scene = world.active;
  world.player.setPath(path, () => doAction(scene, tool, cx, cy), { cx, cy });
}

// 抵達目標旁後實際執行的動作
function doAction(scene, tool, cx, cy) {
  if (scene !== world.active) return; // 中途切換場景就不執行
  if (world.active === "town") {
    const r = world.actTown(cx, cy);
    if (r.openShop) ui.openShop(r.openShop);
    else if (r.msg) toast(r.msg);
    return;
  }
  const r = world.act(tool, cx, cy);
  if (r && r.msg) toast(r.msg);
  refresh();
}

// ---------- 主迴圈 ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  world.player.update(dt, input.moveVec, world);
  if (world.active === "farm") world.updateAnimals(dt);
  renderer.draw();
  updateHUD();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 自動存檔
setInterval(() => world.save(), 10000);
window.addEventListener("pagehide", () => world.save());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") world.save(); });

// ---------- HUD ----------
const elMoney = document.getElementById("stat-money");
const elDay = document.getElementById("stat-day");
const elInv = document.getElementById("stat-inv");
const elScene = document.getElementById("stat-scene");
function updateHUD() {
  elMoney.textContent = Math.floor(world.money).toLocaleString();
  elDay.textContent = world.day;
  elInv.textContent = world.invCount();
  elScene.textContent = world.active === "farm" ? "農場" : "城鎮";
}

// ---------- 工具列 ----------
const toolButtons = document.querySelectorAll(".tool[data-tool]");
function selectTool(name) {
  currentTool = name; pendingBuild = null;
  toolButtons.forEach((b) => b.classList.toggle("active", b.dataset.tool === name));
}
toolButtons.forEach((b) => b.addEventListener("click", () => selectTool(b.dataset.tool)));
selectTool("hoe");
document.getElementById("btn-build").addEventListener("click", () => ui.openBuildMenu());

// ---------- 動作按鈕 ----------
document.getElementById("btn-sleep").addEventListener("click", () => { const r = world.nextDay(); refresh(r.msg); });
document.getElementById("btn-travel").addEventListener("click", () => {
  if (world.active === "farm") world.goTown(); else world.goFarm();
  refresh(world.active === "town" ? "來到城鎮 🏘️（走到店旁點一下）" : "回到農場 🏡");
});
document.getElementById("btn-face").addEventListener("click", () => ui.openCreator(false));
document.getElementById("btn-wardrobe").addEventListener("click", () => ui.openWardrobe());

// ---------- 選單 ----------
const menuPanel = document.getElementById("menu-panel");
document.getElementById("btn-menu").addEventListener("click", () => menuPanel.classList.toggle("hidden"));
document.getElementById("btn-save").addEventListener("click", () => { toast(world.save() ? "已存檔 ✅" : "存檔失敗"); menuPanel.classList.add("hidden"); });
document.getElementById("btn-load").addEventListener("click", () => { toast(world.loadStorage() ? "已讀取 📂" : "沒有存檔"); menuPanel.classList.add("hidden"); });
document.getElementById("btn-new").addEventListener("click", () => {
  if (confirm("重新開始？目前進度會清除。")) { world.reset(); world.save(); ui.openCreator(true); }
  menuPanel.classList.add("hidden");
});
document.getElementById("btn-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(world.serialize(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `mini-farm-day${world.day}.json`; a.click(); URL.revokeObjectURL(url);
  menuPanel.classList.add("hidden");
});
const fileInput = document.getElementById("file-input");
document.getElementById("btn-import").addEventListener("click", () => { fileInput.click(); menuPanel.classList.add("hidden"); });
fileInput.addEventListener("change", (e) => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { try { if (world.load(JSON.parse(rd.result))) { world.save(); toast("已匯入 ⬆️"); } else toast("格式不符"); } catch { toast("讀不懂檔案"); } };
  rd.readAsText(f); fileInput.value = "";
});

// ---------- 浮動提示 ----------
let toastTimer = null;
const toastEl = document.getElementById("toast");
function toast(msg) {
  if (!msg) return;
  toastEl.textContent = msg; toastEl.classList.remove("hidden"); toastEl.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.style.opacity = "0"; setTimeout(() => toastEl.classList.add("hidden"), 250); }, 1400);
}

// ---------- 首次遊玩先捏臉 ----------
updateHUD();
if (!loaded && world._needCreator) ui.openCreator(true);
