// ============================================================
// render.js — 把農場/城鎮畫到 canvas（2.5D 等距，相機跟隨主角）
// 順序：① 地面 ② 作物/畜舍/動物/主角 依深度排序畫（正確遮擋）
// ============================================================
import { TILE_W, TILE_H, GROUND, CROPS, BUILDINGS, ANIMALS } from "./config.js";
import { gridToScreen } from "./iso.js";
import { drawAvatar } from "./character.js";

export class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.world = world;
    this.zoom = 1.1;
    this.camX = 0; this.camY = 0;
    this.hover = null;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = w * this.dpr; this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + "px"; this.canvas.style.height = h + "px";
    this.viewW = w; this.viewH = h;
  }
  // 讓主角置中
  updateCam() {
    const p = gridToScreen(this.world.player.fx, this.world.player.fy);
    this.camX = this.viewW / 2 / this.zoom - p.x;
    this.camY = this.viewH / 2 / this.zoom - p.y;
  }
  w2s(fx, fy) { const s = gridToScreen(fx, fy); return { x: (s.x + this.camX) * this.zoom, y: (s.y + this.camY) * this.zoom }; }
  canvasToGrid(px, py) {
    const wx = px / this.zoom - this.camX, wy = py / this.zoom - this.camY;
    const a = wx / (TILE_W / 2), b = wy / (TILE_H / 2);
    return { gx: Math.floor((a + b) / 2), gy: Math.floor((b - a) / 2) };
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, this.viewH);
    sky.addColorStop(0, "#bfe3f0"); sky.addColorStop(1, "#e9f6e5");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, this.viewW, this.viewH);
    this.updateCam();

    const world = this.world, s = world.scene();
    // 主角面前那格（操作目標）高亮
    const fc = world.player.facingCell();

    // ① 地面
    for (let sum = 0; sum <= s.w + s.h; sum++)
      for (let cx = 0; cx < s.w; cx++) {
        const cy = sum - cx; if (cy < 0 || cy >= s.h) continue;
        const t = s.tiles[cy * s.w + cx];
        this.drawFlat(cx, cy, GROUND[t.g].color, "rgba(0,0,0,.10)");
        if (cx === fc.cx && cy === fc.cy)
          this.drawFlat(cx, cy, "rgba(255,255,255,.28)", "rgba(255,255,255,.8)");
      }

    // ② 實體（依深度）
    const items = [];
    if (world.active === "farm") {
      for (let cy = 0; cy < s.h; cy++) for (let cx = 0; cx < s.w; cx++) {
        const t = s.tiles[cy * s.w + cx];
        if (t.crop) items.push({ d: cx + cy - 0.1, kind: "crop", cx, cy, crop: t.crop });
      }
      for (const b of world.buildings) items.push({ d: b.ox + b.oy, kind: "build", b });
      if (world.bin) items.push({ d: world.bin.x + world.bin.y, kind: "bin" });
      for (const a of world.animals) items.push({ d: a.fx + a.fy, kind: "animal", a });
    } else {
      for (const sh of world.shops) items.push({ d: sh.x + sh.y, kind: "shop", sh });
    }
    items.push({ d: world.player.fx + world.player.fy + 0.05, kind: "player" });
    items.sort((a, b) => a.d - b.d);
    for (const it of items) {
      if (it.kind === "crop") this.drawCrop(it.cx, it.cy, it.crop);
      else if (it.kind === "build") this.drawBox(it.b.ox, it.b.oy, it.b.w, it.b.h, BUILDINGS[it.b.type], BUILDINGS[it.b.type].name);
      else if (it.kind === "shop") this.drawBox(it.sh.x, it.sh.y, it.sh.w, it.sh.h, it.sh, it.sh.name);
      else if (it.kind === "bin") this.drawBin();
      else if (it.kind === "animal") this.drawAnimal(it.a);
      else this.drawPlayer();
    }
  }

  diamond(cx, cy, z) {
    const hw = (TILE_W / 2) * z, hh = (TILE_H / 2) * z, ctx = this.ctx;
    ctx.beginPath(); ctx.moveTo(cx, cy - hh); ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.closePath();
  }
  drawFlat(cx, cy, fill, stroke) {
    const p = this.w2s(cx, cy), z = this.zoom, m = 120;
    if (p.x < -m || p.x > this.viewW + m || p.y < -m || p.y > this.viewH + m) return;
    this.diamond(p.x, p.y, z); this.ctx.fillStyle = fill; this.ctx.fill();
    this.ctx.lineWidth = 1; this.ctx.strokeStyle = stroke; this.ctx.stroke();
  }

  corners(ox, oy, w, h) {
    const z = this.zoom, hw = (TILE_W / 2) * z, hh = (TILE_H / 2) * z;
    const n = this.w2s(ox, oy), e = this.w2s(ox + w - 1, oy);
    const s = this.w2s(ox + w - 1, oy + h - 1), wc = this.w2s(ox, oy + h - 1);
    return { n: { x: n.x, y: n.y - hh }, e: { x: e.x + hw, y: e.y },
             s: { x: s.x, y: s.y + hh }, w: { x: wc.x - hw, y: wc.y } };
  }
  drawBox(ox, oy, w, h, def, label) {
    const ctx = this.ctx, z = this.zoom, c = this.corners(ox, oy, w, h);
    const bh = 0.6 * TILE_W * z;
    ctx.beginPath(); ctx.moveTo(c.w.x, c.w.y); ctx.lineTo(c.s.x, c.s.y); ctx.lineTo(c.s.x, c.s.y - bh); ctx.lineTo(c.w.x, c.w.y - bh); ctx.closePath();
    ctx.fillStyle = def.side; ctx.fill();
    ctx.beginPath(); ctx.moveTo(c.s.x, c.s.y); ctx.lineTo(c.e.x, c.e.y); ctx.lineTo(c.e.x, c.e.y - bh); ctx.lineTo(c.s.x, c.s.y - bh); ctx.closePath();
    ctx.fillStyle = this.shade(def.side, 16); ctx.fill();
    // 屋頂（頂面）
    ctx.beginPath(); ctx.moveTo(c.n.x, c.n.y - bh); ctx.lineTo(c.e.x, c.e.y - bh); ctx.lineTo(c.s.x, c.s.y - bh); ctx.lineTo(c.w.x, c.w.y - bh); ctx.closePath();
    ctx.fillStyle = def.color; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 1; ctx.stroke();
    if (label && z > 0.5) {
      const mx = (c.n.x + c.s.x) / 2, my = Math.min(c.n.y, c.e.y, c.w.y) - bh - 4 * z;
      ctx.font = `${Math.round(12 * z)}px system-ui`; ctx.textAlign = "center";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.strokeText(label, mx, my);
      ctx.fillStyle = "#fff"; ctx.fillText(label, mx, my);
    }
  }
  drawBin() {
    const b = this.world.bin, ctx = this.ctx, z = this.zoom, c = this.corners(b.x, b.y, 1, 1);
    const bh = 0.3 * TILE_W * z;
    ctx.beginPath(); ctx.moveTo(c.w.x, c.w.y); ctx.lineTo(c.s.x, c.s.y); ctx.lineTo(c.s.x, c.s.y - bh); ctx.lineTo(c.w.x, c.w.y - bh); ctx.closePath();
    ctx.fillStyle = "#7a5230"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(c.s.x, c.s.y); ctx.lineTo(c.e.x, c.e.y); ctx.lineTo(c.e.x, c.e.y - bh); ctx.lineTo(c.s.x, c.s.y - bh); ctx.closePath();
    ctx.fillStyle = "#92663d"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(c.n.x, c.n.y - bh); ctx.lineTo(c.e.x, c.e.y - bh); ctx.lineTo(c.s.x, c.s.y - bh); ctx.lineTo(c.w.x, c.w.y - bh); ctx.closePath();
    ctx.fillStyle = "#a9784a"; ctx.fill();
    if (z > 0.5) { ctx.font = `${Math.round(10 * z)}px system-ui`; ctx.textAlign = "center"; ctx.fillStyle = "#fff";
      ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 3;
      const mx = (c.n.x + c.s.x) / 2, my = c.n.y - bh - 3 * z; ctx.strokeText("出貨", mx, my); ctx.fillText("出貨", mx, my); }
  }
  drawCrop(cx, cy, crop) {
    const def = CROPS[crop.type], ctx = this.ctx, z = this.zoom, p = this.w2s(cx, cy);
    const ratio = crop.stage / def.maxStage;
    const hgt = (6 + ratio * 18) * z;
    // 莖
    ctx.strokeStyle = "#3f7d2e"; ctx.lineWidth = 2 * z;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - hgt); ctx.stroke();
    // 葉/果
    if (crop.stage >= def.maxStage) {
      ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(p.x, p.y - hgt, 5 * z, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = def.leaf;
      ctx.beginPath(); ctx.ellipse(p.x - 3 * z, p.y - hgt, 4 * z, 2.4 * z, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(p.x + 3 * z, p.y - hgt, 4 * z, 2.4 * z, 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  drawAnimal(a) {
    const def = ANIMALS[a.type], ctx = this.ctx, z = this.zoom, p = this.w2s(a.fx, a.fy);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * z, 4 * z, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fill();
    // 身體
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 7 * z, 10 * z, 7 * z, 0, 0, Math.PI * 2); ctx.fill();
    // 頭
    ctx.beginPath(); ctx.arc(p.x + 8 * z, p.y - 10 * z, 4.5 * z, 0, Math.PI * 2); ctx.fill();
    // 雞冠/牛角小細節
    if (a.type === "chicken") { ctx.fillStyle = "#d9534f"; ctx.beginPath(); ctx.arc(p.x + 8 * z, p.y - 14 * z, 2 * z, 0, Math.PI * 2); ctx.fill(); }
    // 有產物時頭上冒提示
    if (a.hasProduct && z > 0.45) {
      ctx.font = `${Math.round(13 * z)}px system-ui`; ctx.textAlign = "center";
      ctx.fillText("❗", p.x, p.y - 22 * z);
    }
  }
  drawPlayer() {
    const p = this.w2s(this.world.player.fx, this.world.player.fy);
    drawAvatar(this.ctx, p.x, p.y, this.zoom, this.world.player.appearance,
      this.world.player.dir, this.world.player.frame, this.world.player.moving);
  }
  shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  }
}
