// ============================================================
// phaser-main.js — 用 Phaser 驅動的進入點
//  ‧ 重用遊戲邏輯：world.js / config.js / player.js / ui.js / iso.js
//  ‧ Phaser 負責：場景、相機跟隨、輸入、主迴圈、畫面縮放
//  ‧ 畫面用 draw.js（Phaser Graphics）；之後有立繪可改成 Sprite
// 需求：index.html 先載入 vendor/phaser.min.js（提供全域 Phaser）
// ============================================================
import { World } from "./world.js";
import { UI } from "./ui.js";
import { drawGround, drawDynamic } from "./draw.js";
import { gridToScreen } from "./iso.js";
import { TILE_W, TILE_H } from "./config.js";

const HW = TILE_W / 2, HH = TILE_H / 2;

const world = new World();
const loaded = world.hasSave() ? world.loadStorage() : false;

let currentTool = "hoe";
let pendingBuild = null;
let sceneRef = null;
const joyVec = { x: 0, y: 0 };

const refresh = (msg) => { updateHUD(); world.save(); if (sceneRef) sceneRef.groundDirty = true; if (msg) toast(msg); };
const ui = new UI(world, refresh, (type) => { pendingBuild = type; });

// ---------- Phaser 場景 ----------
class MainScene extends Phaser.Scene {
  constructor() { super("main"); }

  create() {
    sceneRef = this;
    this.groundG = this.add.graphics().setDepth(0);
    this.dynG = this.add.graphics().setDepth(10);
    this.groundDirty = true;
    this.cameras.main.setZoom(1.1);

    // 鍵盤
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");

    // 點擊（拖曳超過門檻就不算點擊，避免誤觸）
    this.input.on("pointerup", (pointer) => {
      if (pointer.getDistance() > 12) return;
      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const a = wp.x / HW, b = wp.y / HH;
      onTap(Math.floor((a + b) / 2), Math.floor((b - a) / 2));
    });

    bindJoystick();
    bindUI();
    updateHUD();
    if (!loaded && world._needCreator) ui.openCreator(true);
  }

  update(time, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000);
    // 移動向量：鍵盤優先，否則搖桿
    let x = 0, y = 0;
    const k = this.keys;
    if (k.A.isDown || k.LEFT.isDown) x -= 1;
    if (k.D.isDown || k.RIGHT.isDown) x += 1;
    if (k.W.isDown || k.UP.isDown) y -= 1;
    if (k.S.isDown || k.DOWN.isDown) y += 1;
    const mv = (x || y) ? { x, y } : joyVec;

    world.player.update(dt, mv, world);
    if (world.active === "farm") world.updateAnimals(dt);

    const p = gridToScreen(world.player.fx, world.player.fy);
    this.cameras.main.centerOn(p.x, p.y);

    if (this.groundDirty) { drawGround(this.groundG, world); this.groundDirty = false; }
    drawDynamic(this.dynG, world);
    updateHUD();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
  backgroundColor: "#bfe3f0",
  scene: MainScene,
});

// ---------- 點擊：尋路 → 到旁邊才執行 ----------
function onTap(cx, cy) {
  if (pendingBuild) {
    const r = world.build(pendingBuild, cx, cy);
    if (r && r.msg) toast(r.msg);
    if (r && r.msg && r.msg.startsWith("蓋好")) pendingBuild = null;
    refresh();
    return;
  }
  const path = world.pathToCell(cx, cy);
  if (!path) { toast("走不過去"); return; }
  const tool = currentTool, scene = world.active;
  world.player.setPath(path, () => doAction(scene, tool, cx, cy), { cx, cy });
}
function doAction(scene, tool, cx, cy) {
  if (scene !== world.active) return;
  if (world.active === "town") {
    const r = world.actTown(cx, cy);
    if (r.openShop) ui.openShop(r.openShop); else if (r.msg) toast(r.msg);
    return;
  }
  const r = world.act(tool, cx, cy);
  if (r && r.msg) toast(r.msg);
  refresh();
}

// ---------- 虛擬搖桿（DOM）----------
function bindJoystick() {
  const base = document.getElementById("joy"), stick = document.getElementById("joy-stick");
  const R = 42; let id = null, ox = 0, oy = 0;
  const start = (e) => { id = e.pointerId; const r = base.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; base.setPointerCapture(id); move(e); };
  const move = (e) => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    stick.style.transform = `translate(${dx}px,${dy}px)`;
    joyVec.x = dx / R; joyVec.y = dy / R;
  };
  const end = (e) => { if (e.pointerId !== id) return; id = null; stick.style.transform = "translate(0,0)"; joyVec.x = 0; joyVec.y = 0; };
  base.addEventListener("pointerdown", start);
  base.addEventListener("pointermove", move);
  base.addEventListener("pointerup", end);
  base.addEventListener("pointercancel", end);
}

// ---------- HUD / 工具列 / 動作 / 選單 ----------
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

function bindUI() {
  const toolButtons = document.querySelectorAll(".tool[data-tool]");
  const selectTool = (name) => { currentTool = name; pendingBuild = null; toolButtons.forEach((b) => b.classList.toggle("active", b.dataset.tool === name)); };
  toolButtons.forEach((b) => b.addEventListener("click", () => selectTool(b.dataset.tool)));
  selectTool("hoe");
  document.getElementById("btn-build").addEventListener("click", () => ui.openBuildMenu());

  document.getElementById("btn-sleep").addEventListener("click", () => { const r = world.nextDay(); refresh(r.msg); });
  document.getElementById("btn-travel").addEventListener("click", () => {
    if (world.active === "farm") world.goTown(); else world.goFarm();
    refresh(world.active === "town" ? "來到城鎮 🏘️（走到店旁點一下）" : "回到農場 🏡");
  });
  document.getElementById("btn-face").addEventListener("click", () => ui.openCreator(false));
  document.getElementById("btn-wardrobe").addEventListener("click", () => ui.openWardrobe());

  const menuPanel = document.getElementById("menu-panel");
  document.getElementById("btn-menu").addEventListener("click", () => menuPanel.classList.toggle("hidden"));
  document.getElementById("btn-save").addEventListener("click", () => { toast(world.save() ? "已存檔 ✅" : "存檔失敗"); menuPanel.classList.add("hidden"); });
  document.getElementById("btn-load").addEventListener("click", () => { const ok = world.loadStorage(); refresh(ok ? "已讀取 📂" : "沒有存檔"); menuPanel.classList.add("hidden"); });
  document.getElementById("btn-new").addEventListener("click", () => { if (confirm("重新開始？目前進度會清除。")) { world.reset(); refresh(); ui.openCreator(true); } menuPanel.classList.add("hidden"); });
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
    rd.onload = () => { try { if (world.load(JSON.parse(rd.result))) { refresh("已匯入 ⬆️"); } else toast("格式不符"); } catch { toast("讀不懂檔案"); } };
    rd.readAsText(f); fileInput.value = "";
  });
}

// ---------- 自動存檔 ----------
setInterval(() => world.save(), 10000);
window.addEventListener("pagehide", () => world.save());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") world.save(); });

// ---------- 浮動提示 ----------
let toastTimer = null;
const toastEl = document.getElementById("toast");
function toast(msg) {
  if (!msg) return;
  toastEl.textContent = msg; toastEl.classList.remove("hidden"); toastEl.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.style.opacity = "0"; setTimeout(() => toastEl.classList.add("hidden"), 250); }, 1400);
}
