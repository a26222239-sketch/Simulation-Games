// ============================================================
// render.js — 把商店場景畫到 canvas（2.5D 等距）
// 順序：① 先鋪所有地板/門（平面）
//       ② 把「會擋住視線的設施(牆/貨架/櫃台)」與「顧客」一起依深度排序後再畫，
//          這樣站在貨架後面的顧客會被正確遮住。
//
// ★ 換立繪：assets/<sprite>.png 存在就自動改用圖片（設施）；
//   顧客走路精靈圖放 assets/customer.png（4方向×4走路格）自動套用。
// ============================================================
import { TILE_W, TILE_H, TILES, CUSTOMER } from "./config.js";
import { gridToScreen } from "./iso.js";

export class Renderer {
  constructor(canvas, store) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.store = store;
    this.hover = null;       // 目前指著的格子 {gx,gy}
    this.previewType = null; // 目前要放置的設施種類（由 main.js 設定）
    this.sprites = {};
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.viewW = w; this.viewH = h;
    if (!this.store._cameraInited) {
      const center = gridToScreen(this.store.w / 2, this.store.h / 2);
      this.store.camX = w / 2 - center.x;
      this.store.camY = h / 2 - center.y + 40;
      this.store._cameraInited = true;
    }
  }

  worldToCanvas(gx, gy) {
    const s = gridToScreen(gx, gy);
    return { x: (s.x + this.store.camX) * this.store.zoom, y: (s.y + this.store.camY) * this.store.zoom };
  }
  canvasToGrid(px, py) {
    const wx = px / this.store.zoom - this.store.camX;
    const wy = py / this.store.zoom - this.store.camY;
    const a = wx / (TILE_W / 2), b = wy / (TILE_H / 2);
    return { gx: Math.floor((a + b) / 2), gy: Math.floor((b - a) / 2) };
  }

  getSprite(name) {
    if (!name) return null;
    if (this.sprites[name] === undefined) {
      this.sprites[name] = null;
      const img = new Image();
      img.onload = () => { this.sprites[name] = img; };
      img.onerror = () => { this.sprites[name] = null; };
      img.src = `assets/${name}.png`;
    }
    return this.sprites[name];
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, this.viewH);
    bg.addColorStop(0, "#1a232e"); bg.addColorStop(1, "#0c121a");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.viewW, this.viewH);

    const store = this.store;

    // ① 地板層：每格先鋪地板色；門畫成門色
    for (let sum = 0; sum <= store.w + store.h; sum++) {
      for (let cx = 0; cx < store.w; cx++) {
        const cy = sum - cx;
        if (cy < 0 || cy >= store.h) continue;
        const t = store.tile(cx, cy);
        const isFloorLike = TILES[t.type].height === 0;
        const color = t.type === "door" ? TILES.door.color : TILES.floor.color;
        this.drawFlat(cx, cy, color, "rgba(0,0,0,.12)");
        // 預覽高亮（要放置時）
        if (this.hover && this.hover.gx === cx && this.hover.gy === cy && this.previewType) {
          this.drawFlat(cx, cy, "rgba(120,220,140,.45)", "rgba(255,255,255,.7)");
        }
      }
    }

    // ② 設施 + 顧客一起依深度排序
    const items = [];
    for (let cy = 0; cy < store.h; cy++)
      for (let cx = 0; cx < store.w; cx++) {
        const t = store.tile(cx, cy);
        if (TILES[t.type].height > 0) items.push({ depth: cx + cy, kind: "fixture", cx, cy, t });
      }
    for (const c of store.customers) items.push({ depth: c.gx + c.gy + 0.5, kind: "cust", c });
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) {
      if (it.kind === "fixture") this.drawFixture(it.cx, it.cy, it.t);
      else this.drawCustomer(it.c);
    }
  }

  diamondPath(cx, cy, z) {
    const hw = (TILE_W / 2) * z, hh = (TILE_H / 2) * z, ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh); ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.closePath();
  }
  drawFlat(cx, cy, fill, stroke) {
    const p = this.worldToCanvas(cx, cy), z = this.store.zoom;
    const m = 200;
    if (p.x < -m || p.x > this.viewW + m || p.y < -m || p.y > this.viewH + m) return;
    this.diamondPath(p.x, p.y, z);
    this.ctx.fillStyle = fill; this.ctx.fill();
    this.ctx.lineWidth = 1; this.ctx.strokeStyle = stroke; this.ctx.stroke();
  }

  drawFixture(cx, cy, t) {
    const def = TILES[t.type], ctx = this.ctx, z = this.store.zoom;
    const p = this.worldToCanvas(cx, cy);
    const hw = (TILE_W / 2) * z, hh = (TILE_H / 2) * z;
    const n = { x: p.x, y: p.y - hh }, e = { x: p.x + hw, y: p.y };
    const s = { x: p.x, y: p.y + hh }, w = { x: p.x - hw, y: p.y };

    const img = this.getSprite(def.sprite);
    if (img) {
      const wpx = (e.x - w.x), hpx = wpx * (img.height / img.width);
      ctx.drawImage(img, p.x - wpx / 2, s.y - hpx, wpx, hpx);
      return;
    }

    const bh = def.height * TILE_W * z;
    // 左面
    ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(s.x, s.y);
    ctx.lineTo(s.x, s.y - bh); ctx.lineTo(w.x, w.y - bh); ctx.closePath();
    ctx.fillStyle = def.side; ctx.fill();
    // 右面
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y);
    ctx.lineTo(e.x, e.y - bh); ctx.lineTo(s.x, s.y - bh); ctx.closePath();
    ctx.fillStyle = this.shade(def.side, 18); ctx.fill();
    // 頂
    ctx.beginPath(); ctx.moveTo(n.x, n.y - bh); ctx.lineTo(e.x, e.y - bh);
    ctx.lineTo(s.x, s.y - bh); ctx.lineTo(w.x, w.y - bh); ctx.closePath();
    ctx.fillStyle = def.color; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.stroke();
  }

  // 顧客：有精靈圖就用圖，否則畫個會走路的小人
  drawCustomer(c) {
    const ctx = this.ctx, z = this.store.zoom;
    const p = this.worldToCanvas(c.gx, c.gy);

    // 影子
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2 * z, 9 * z, 4 * z, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fill();

    const sheet = this.getSprite("customer");
    if (sheet) {
      const fw = sheet.width / 4, fh = sheet.height / 4;       // 4格×4方向
      const dw = 30 * z, dh = dw * (fh / fw);
      ctx.drawImage(sheet, c.frame * fw, c.dir * fh, fw, fh, p.x - dw / 2, p.y - dh, dw, dh);
      return;
    }

    // 內建小人
    const bob = c.moving ? Math.abs(Math.sin(c.animTime * 9)) * 2 * z : 0;
    const footY = p.y - bob;
    const bodyH = 15 * z, bodyW = 9 * z, headR = 5 * z;
    // 腿（走路時前後擺動）
    const sw = c.moving ? Math.sin(c.animTime * 13) * 3 * z : 0;
    ctx.strokeStyle = "#39424d"; ctx.lineWidth = 2.5 * z; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p.x, footY - bodyH); ctx.lineTo(p.x - 3 * z + sw, footY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x, footY - bodyH); ctx.lineTo(p.x + 3 * z - sw, footY); ctx.stroke();
    // 身體
    this.roundRect(p.x - bodyW / 2, footY - bodyH - bodyH, bodyW, bodyH + 2 * z, 3 * z);
    ctx.fillStyle = c.color; ctx.fill();
    // 頭
    ctx.beginPath(); ctx.arc(p.x, footY - bodyH - bodyH - headR + 2 * z, headR, 0, Math.PI * 2);
    ctx.fillStyle = "#f1c9a5"; ctx.fill();
    // 結帳中冒個 $ 提示
    if (c.state === "paying" && z > 0.5) {
      ctx.font = `${Math.round(12 * z)}px system-ui`; ctx.textAlign = "center";
      ctx.fillStyle = "#ffe082";
      ctx.fillText("$", p.x, footY - bodyH * 2 - headR * 2 - 2 * z);
    }
  }

  roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  }
}
