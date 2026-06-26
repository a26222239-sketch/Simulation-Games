// ============================================================
// render.js — 把遊戲狀態畫到 canvas 上（2.5D 等距畫面）
// 先畫所有地面菱形，再依「由後往前」順序畫建築量體（支援多格佔地）。
// 等級會影響量體高度、顏色亮度，並在頂端標示 Lv 數字。
//
// ★ 換成 GPT 立繪：把圖片放到 assets/<sprite>_<等級>.png，
//   程式會自動載入並改用 drawImage（見 loadSprite / drawBuilding）。
// ============================================================
import { TILE_W, TILE_H, BUILDINGS } from "./config.js";
import { gridToScreen } from "./iso.js";

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.game = game;
    this.hover = null;       // 目前指著的格子 {gx, gy}
    this.hoverFootprint = null; // 預覽要蓋的範圍（由 main.js 設定目前工具）
    this.previewTool = null;
    this.sprites = {};       // 立繪快取： key "house_3" -> Image
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
    if (!this.game._cameraInited) {
      const center = gridToScreen(this.game.size / 2, this.game.size / 2);
      this.game.camX = w / 2 - center.x;
      this.game.camY = h / 2 - center.y;
      this.game._cameraInited = true;
    }
  }

  worldToCanvas(gx, gy) {
    const s = gridToScreen(gx, gy);
    return {
      x: (s.x + this.game.camX) * this.game.zoom,
      y: (s.y + this.game.camY) * this.game.zoom,
    };
  }

  canvasToGrid(px, py) {
    const wx = px / this.game.zoom - this.game.camX;
    const wy = py / this.game.zoom - this.game.camY;
    const a = wx / (TILE_W / 2);
    const b = wy / (TILE_H / 2);
    return { gx: Math.floor((a + b) / 2), gy: Math.floor((b - a) / 2) };
  }

  // 嘗試取得某建築某等級的立繪；沒有圖就回傳 null（改用程式畫的方塊）
  getSprite(spriteName, level) {
    if (!spriteName) return null;
    const key = `${spriteName}_${level}`;
    if (this.sprites[key] === undefined) {
      // 第一次：嘗試載入，先標記 null 避免重複載
      this.sprites[key] = null;
      const img = new Image();
      img.onload = () => { this.sprites[key] = img; };
      img.onerror = () => { this.sprites[key] = null; }; // 沒這張圖就維持方塊
      img.src = `assets/${key}.png`;
    }
    return this.sprites[key];
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, this.viewH);
    g.addColorStop(0, "#16202c");
    g.addColorStop(1, "#0c121a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    const game = this.game;

    // 1) 先畫所有地面菱形（含 hover 高亮 / 建造預覽）
    for (let sum = 0; sum <= 2 * (game.size - 1); sum++) {
      for (let gx = 0; gx < game.size; gx++) {
        const gy = sum - gx;
        if (gy < 0 || gy >= game.size) continue;
        this.drawGround(gx, gy);
      }
    }

    // 2) 收集所有建築主格，由後往前（ox+oy 小的先畫）再畫量體
    const buildings = [];
    game.eachBuilding((t) => buildings.push(t));
    buildings.sort((a, b) => (a.ox + a.oy) - (b.ox + b.oy));
    for (const t of buildings) this.drawBuilding(t);
  }

  // 判斷某格是否落在「建造預覽範圍」內
  inPreview(gx, gy) {
    const fp = this.hoverFootprint;
    if (!fp) return false;
    return gx >= fp.gx && gx < fp.gx + fp.w && gy >= fp.gy && gy < fp.gy + fp.h;
  }

  drawGround(gx, gy) {
    const p = this.worldToCanvas(gx, gy);
    const margin = 220;
    if (p.x < -margin || p.x > this.viewW + margin ||
        p.y < -margin || p.y > this.viewH + margin) return;
    const z = this.game.zoom;

    let fill = BUILDINGS.grass.color, stroke = "#2c5a2c";
    if (this.inPreview(gx, gy)) {
      // 預覽：能蓋綠色、不能蓋紅色
      fill = this.hoverFootprint.ok ? "#5bb36a" : "#b65151";
      stroke = "rgba(255,255,255,.5)";
    }
    this.drawDiamondTop(p.x, p.y, z, fill, stroke);
  }

  diamondPath(cx, cy, z) {
    const hw = (TILE_W / 2) * z, hh = (TILE_H / 2) * z;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
  }

  drawDiamondTop(cx, cy, z, fill, stroke) {
    const ctx = this.ctx;
    this.diamondPath(cx, cy, z);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  // 計算一棟建築佔地的「頂面四角」螢幕座標（地面高度，未含量體高度）
  footprintCorners(t) {
    const z = this.game.zoom;
    const hw = (TILE_W / 2) * z, hh = (TILE_H / 2) * z;
    const { ox, oy, w, h } = t;
    const north = this.worldToCanvas(ox, oy);             // 上
    const east = this.worldToCanvas(ox + w - 1, oy);      // 右
    const south = this.worldToCanvas(ox + w - 1, oy + h - 1); // 下
    const west = this.worldToCanvas(ox, oy + h - 1);      // 左
    return {
      n: { x: north.x, y: north.y - hh },
      e: { x: east.x + hw, y: east.y },
      s: { x: south.x, y: south.y + hh },
      w: { x: west.x - hw, y: west.y },
    };
  }

  drawBuilding(t) {
    const def = BUILDINGS[t.type];
    const ctx = this.ctx;
    const c = this.footprintCorners(t);

    // 視窗外略過
    if (c.s.y < -300 || c.n.y > this.viewH + 300 ||
        c.e.x < -300 || c.w.x > this.viewW + 300) return;

    // 道路：只畫平面頂面（不長高）
    if (t.type === "road") {
      ctx.beginPath();
      ctx.moveTo(c.n.x, c.n.y); ctx.lineTo(c.e.x, c.e.y);
      ctx.lineTo(c.s.x, c.s.y); ctx.lineTo(c.w.x, c.w.y); ctx.closePath();
      ctx.fillStyle = this.shade(def.color, (t.level - 1) * 4);
      ctx.fill();
      ctx.strokeStyle = def.side; ctx.lineWidth = 1; ctx.stroke();
      this.drawLevelTag(t, c, 0);
      return;
    }

    // 若有立繪就用圖片
    const img = this.getSprite(def.sprite, t.level);
    if (img) {
      const wpx = c.e.x - c.w.x;             // 佔地在螢幕上的寬
      const hpx = wpx * (img.height / img.width);
      const baseY = c.s.y;                   // 前緣底部
      const cx = (c.n.x + c.s.x) / 2;
      ctx.drawImage(img, cx - wpx / 2, baseY - hpx, wpx, hpx);
      this.drawLevelTag(t, c, hpx * 0.9);
      return;
    }

    // 否則用程式畫的立體量體（等級越高越高、顏色越亮）
    const bh = this.game.heightOf(t) * TILE_W * this.game.zoom;
    const top = this.shade(def.color, (t.level - 1) * 6);
    const left = def.side;
    const right = this.shade(def.side, 20);

    // 左側面：west → south
    ctx.beginPath();
    ctx.moveTo(c.w.x, c.w.y); ctx.lineTo(c.s.x, c.s.y);
    ctx.lineTo(c.s.x, c.s.y - bh); ctx.lineTo(c.w.x, c.w.y - bh); ctx.closePath();
    ctx.fillStyle = left; ctx.fill();

    // 右側面：south → east
    ctx.beginPath();
    ctx.moveTo(c.s.x, c.s.y); ctx.lineTo(c.e.x, c.e.y);
    ctx.lineTo(c.e.x, c.e.y - bh); ctx.lineTo(c.s.x, c.s.y - bh); ctx.closePath();
    ctx.fillStyle = right; ctx.fill();

    // 頂面（四角往上平移 bh）
    ctx.beginPath();
    ctx.moveTo(c.n.x, c.n.y - bh); ctx.lineTo(c.e.x, c.e.y - bh);
    ctx.lineTo(c.s.x, c.s.y - bh); ctx.lineTo(c.w.x, c.w.y - bh); ctx.closePath();
    ctx.fillStyle = top; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.stroke();

    this.drawLevelTag(t, c, bh);
  }

  // 在建築頂端標示等級（住宅也顯示人口）
  drawLevelTag(t, c, bh) {
    const z = this.game.zoom;
    if (z < 0.55) return;
    const ctx = this.ctx;
    const cx = (c.n.x + c.s.x) / 2;
    const topY = Math.min(c.n.y, c.s.y) - bh - 6 * z;
    let label = "Lv." + (t.level || 1);
    if (t.type === "house" && t.residents > 0) label += "  👥" + t.residents;
    ctx.font = `${Math.round(11 * z)}px system-ui`;
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,.6)";
    ctx.strokeText(label, cx, topY);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, cx, topY);
  }

  shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  }
}
