// ============================================================
// phaser-main.js — 動物園（上帝視角）Phaser 進入點
//  Phaser 負責：場景、相機(拖曳平移 + 滾輪/雙指縮放)、輸入、主迴圈、縮放
//  邏輯重用 zoo.js；畫面用 draw.js
// 需求：index.html 先載入 vendor/phaser.min.js
// ============================================================
import { Zoo } from "./zoo.js";
import { UI } from "./ui.js";
import { Renderer } from "./render.js";
import { gridToScreen } from "./iso.js";
import { TILE_W, TILE_H, STRUCTURES } from "./config.js";

const HW = TILE_W / 2, HH = TILE_H / 2;
const zoo = new Zoo();
const loaded = zoo.hasSave() ? zoo.loadStorage() : false;
const ui = new UI();

let currentTool = "path";
let pendingSpecies = null;   // 獸欄要放的動物
let sceneRef = null;
let hover = null;            // {gx,gy}

const refresh = (msg) => { updateHUD(); zoo.save(); if (sceneRef && sceneRef.renderer) sceneRef.renderer.groundDirty = true; if (msg) toast(msg); };

class MainScene extends Phaser.Scene {
  constructor() { super("main"); }
  preload() { Renderer.preload(this); }
  create() {
    sceneRef = this;
    this.renderer = new Renderer(this, zoo);
    const cam = this.cameras.main;
    cam.setZoom(1);
    const c = gridToScreen(zoo.entrance.cx, zoo.h - 5); cam.centerOn(c.x, c.y); // 對準入口起始區

    this.dragging = false; this.moved = false; this.pinchDist = 0;

    this.input.on("pointerdown", (p) => {
      this.downX = p.x; this.downY = p.y; this.moved = false;
      this.startSX = cam.scrollX; this.startSY = cam.scrollY;
    });
    this.input.on("pointermove", (p) => {
      // 雙指縮放
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      if (p1.isDown && p2.isDown) {
        const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (this.pinchDist > 0) this.zoomBy(d / this.pinchDist, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        this.pinchDist = d; this.moved = true; return;
      }
      hover = this.toGrid(p); // 更新預覽位置
      if (p.isDown) {
        const dx = p.x - this.downX, dy = p.y - this.downY;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) this.moved = true;
        cam.scrollX = this.startSX - dx / cam.zoom;
        cam.scrollY = this.startSY - dy / cam.zoom;
      }
    });
    this.input.on("pointerup", () => {
      if (!this.moved && this.pinchDist === 0 && hover) onTap(hover.gx, hover.gy);
      this.pinchDist = 0;
    });
    this.input.on("wheel", (p, go, dx, dy) => this.zoomBy(dy < 0 ? 1.1 : 1 / 1.1, p.x, p.y));

    bindUI();
    updateHUD();
  }

  zoomBy(factor, sx, sy) {
    const cam = this.cameras.main;
    const before = cam.getWorldPoint(sx, sy);
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, 0.5, 2.2));
    const after = cam.getWorldPoint(sx, sy);
    cam.scrollX += before.x - after.x; cam.scrollY += before.y - after.y;
  }

  toGrid(p) {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const a = wp.x / HW, b = wp.y / HH;
    return { gx: Math.floor((a + b) / 2), gy: Math.floor((b - a) / 2) };
  }

  update(t, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000);
    zoo.update(dt);
    if (this.renderer.groundDirty) { this.renderer.redrawGround(); this.renderer.groundDirty = false; }
    this.renderer.drawPreview(previewState());
    this.renderer.sync();
    updateHUD();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
  backgroundColor: "#bfe3f0",
  scene: MainScene,
});

// 放置預覽（目前工具下，hover 位置的佔地與可否放置）
function previewState() {
  if (!hover) return null;
  if (currentTool === "bulldoze") return { gx: hover.gx, gy: hover.gy, footprint: { w: 1, h: 1 }, ok: true };
  let fp = { w: 1, h: 1 };
  if (currentTool === "enclosure") fp = STRUCTURES.enclosure.footprint;
  else if (currentTool === "cafe" || currentTool === "souvenir") fp = STRUCTURES.cafe.footprint;
  const ok = currentTool === "path" ? canPath(hover.gx, hover.gy) : zoo.areaFree(hover.gx, hover.gy, fp.w, fp.h);
  return { gx: hover.gx, gy: hover.gy, footprint: fp, ok };
}
function canPath(cx, cy) { const t = zoo.tile(cx, cy); return !!t && t.b == null && t.g !== "water"; }

// 點擊放置
function onTap(cx, cy) {
  let r;
  if (currentTool === "path") r = zoo.setPath(cx, cy);
  else if (currentTool === "bulldoze") r = zoo.bulldoze(cx, cy);
  else if (currentTool === "tree") r = zoo.place("tree", cx, cy);
  else if (currentTool === "cafe") r = zoo.place("cafe", cx, cy);
  else if (currentTool === "souvenir") r = zoo.place("souvenir", cx, cy);
  else if (currentTool === "enclosure") {
    const t = zoo.tile(cx, cy);
    // 點到既有獸欄 → 加一隻動物；否則蓋新獸欄
    const exist = t && t.b != null ? zoo.structures.find((s) => s.id === t.b && s.kind === "enclosure") : null;
    if (exist) r = zoo.buyAnimal(exist.id);
    else if (!pendingSpecies) { toast("先在工具列選獸欄、挑動物"); return; }
    else r = zoo.place("enclosure", cx, cy, pendingSpecies);
  }
  if (r && r.msg) toast(r.msg);
  refresh();
}

// ---------- HUD ----------
const elMoney = document.getElementById("stat-money");
const elVisitors = document.getElementById("stat-visitors");
const elDay = document.getElementById("stat-day");
const elAttr = document.getElementById("stat-attr");
function updateHUD() {
  elMoney.textContent = Math.floor(zoo.money).toLocaleString();
  elVisitors.textContent = zoo.visitors.length;
  elDay.textContent = zoo.day;
  elAttr.textContent = Math.round(zoo.attraction());
}

// ---------- 工具列 / 選單 ----------
function bindUI() {
  const tools = document.querySelectorAll(".tool[data-tool]");
  const sel = (name) => { currentTool = name; tools.forEach((b) => b.classList.toggle("active", b.dataset.tool === name)); };
  tools.forEach((b) => b.addEventListener("click", () => {
    sel(b.dataset.tool);
    if (b.dataset.tool === "enclosure") ui.openAnimalPick((species) => { pendingSpecies = species; toast(`點空地放${species}獸欄；點既有獸欄加動物`); });
  }));
  sel("path");

  // 縮放按鈕（以畫面中心為縮放基準）
  const zoomBtn = (factor) => { if (sceneRef) sceneRef.zoomBy(factor, window.innerWidth / 2, window.innerHeight / 2); };
  document.getElementById("btn-zoomin").addEventListener("click", () => zoomBtn(1.2));
  document.getElementById("btn-zoomout").addEventListener("click", () => zoomBtn(1 / 1.2));

  const menu = document.getElementById("menu-panel");
  document.getElementById("btn-menu").addEventListener("click", () => menu.classList.toggle("hidden"));
  document.getElementById("btn-save").addEventListener("click", () => { toast(zoo.save() ? "已存檔 ✅" : "存檔失敗"); menu.classList.add("hidden"); });
  document.getElementById("btn-load").addEventListener("click", () => { const ok = zoo.loadStorage(); refresh(ok ? "已讀取 📂" : "沒有存檔"); menu.classList.add("hidden"); });
  document.getElementById("btn-new").addEventListener("click", () => { if (confirm("重新開始？目前動物園會清除。")) { zoo.reset(); refresh("新動物園 🆕"); } menu.classList.add("hidden"); });
  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(zoo.serialize(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `mini-zoo-day${zoo.day}.json`; a.click(); URL.revokeObjectURL(url); menu.classList.add("hidden");
  });
  const fi = document.getElementById("file-input");
  document.getElementById("btn-import").addEventListener("click", () => { fi.click(); menu.classList.add("hidden"); });
  fi.addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return; const rd = new FileReader();
    rd.onload = () => { try { if (zoo.load(JSON.parse(rd.result))) refresh("已匯入 ⬆️"); else toast("格式不符"); } catch { toast("讀不懂檔案"); } };
    rd.readAsText(f); fi.value = "";
  });
}

setInterval(() => zoo.save(), 10000);
window.addEventListener("pagehide", () => zoo.save());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") zoo.save(); });

// ---------- 提示 ----------
let toastTimer = null; const toastEl = document.getElementById("toast");
function toast(msg) {
  if (!msg) return;
  toastEl.textContent = msg; toastEl.classList.remove("hidden"); toastEl.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.style.opacity = "0"; setTimeout(() => toastEl.classList.add("hidden"), 250); }, 1500);
}

if (!loaded) zoo.save();
