// ============================================================
// render.js — 把遊戲狀態畫到 canvas 上（2.5D 等距畫面）
// 每一格先畫地面菱形，有建築的再往上疊一個「箱子」當立體量體。
// 之後要換成 GPT 立繪：在 drawBuilding 裡改成 drawImage 即可（見下方註解）。
// ============================================================
import { TILE_W, TILE_H, BUILDINGS } from "./config.js";
import { gridToScreen } from "./iso.js";

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.game = game;
    this.hover = null; // 目前滑鼠/手指指著的格子 {gx, gy}
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  // 配合視窗大小與裝置像素比，讓畫面在手機上也清晰
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.viewW = w; this.viewH = h;
    // 第一次進來時，把相機對準地圖中央
    if (!this.game._cameraInited) {
      const center = gridToScreen(this.game.size / 2, this.game.size / 2);
      this.game.camX = w / 2 - center.x;
      this.game.camY = h / 2 - center.y;
      this.game._cameraInited = true;
    }
  }

  // 把一個格子座標換成「畫面上實際像素」（含相機位移與縮放）
  worldToCanvas(gx, gy) {
    const s = gridToScreen(gx, gy);
    return {
      x: (s.x + this.game.camX) * this.game.zoom,
      y: (s.y + this.game.camY) * this.game.zoom,
    };
  }

  // 反向：螢幕點擊位置 -> 地圖格子（input.js 會用到）
  canvasToGrid(px, py) {
    const wx = px / this.game.zoom - this.game.camX;
    const wy = py / this.game.zoom - this.game.camY;
    const a = wx / (TILE_W / 2);
    const b = wy / (TILE_H / 2);
    return { gx: Math.floor((a + b) / 2), gy: Math.floor((b - a) / 2) };
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // 天空背景
    const g = ctx.createLinearGradient(0, 0, 0, this.viewH);
    g.addColorStop(0, "#16202c");
    g.addColorStop(1, "#0c121a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    const game = this.game;
    // 重要：等距畫面要由「後往前」畫（gx+gy 小的在後面），前面的建築才能正確蓋住後面的。
    for (let sum = 0; sum <= 2 * (game.size - 1); sum++) {
      for (let gx = 0; gx < game.size; gx++) {
        const gy = sum - gx;
        if (gy < 0 || gy >= game.size) continue;
        this.drawTile(gx, gy);
      }
    }
  }

  drawTile(gx, gy) {
    const game = this.game;
    const t = game.tile(gx, gy);
    const p = this.worldToCanvas(gx, gy);

    // 視窗外的格子就略過，省效能
    const margin = 200;
    if (p.x < -margin || p.x > this.viewW + margin ||
        p.y < -margin || p.y > this.viewH + margin) return;

    const z = game.zoom;
    const isHover = this.hover && this.hover.gx === gx && this.hover.gy === gy;

    // 1) 畫地面菱形
    const groundColor = isHover ? "#5a9a5a" : BUILDINGS.grass.color;
    this.drawDiamondTop(p.x, p.y, z, groundColor, "#2c5a2c");

    // 2) 有建築就疊上去
    if (t.type !== "grass") {
      this.drawBuilding(p.x, p.y, z, t);
    }

    // 3) 懸停格子加白框
    if (isHover) {
      this.diamondPath(p.x, p.y, z);
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = "rgba(255,255,255,.85)";
      this.ctx.stroke();
    }
  }

  // 畫菱形地面（頂面）的路徑
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

  // 畫一棟建築（暫時用立體方塊代替立繪）
  // ★ 之後要換成 GPT 立繪：把這個函式內容換成
  //   ctx.drawImage(sprites[t.type], cx - w/2, cy - h, w, h)
  //   並在外部先用 new Image() 載入 assets/ 裡的圖片即可。
  drawBuilding(cx, cy, z, t) {
    const def = BUILDINGS[t.type];
    const ctx = this.ctx;
    const hw = (TILE_W / 2) * z, hh = (TILE_H / 2) * z;

    // 道路：直接畫平面深色菱形，不長高
    if (t.type === "road") {
      this.drawDiamondTop(cx, cy, z, def.color, def.side);
      return;
    }

    const bh = def.height * TILE_W * z; // 建築量體高度（像素）

    // 左側面
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx, cy + hh - bh);
    ctx.lineTo(cx - hw, cy - bh);
    ctx.closePath();
    ctx.fillStyle = def.side;
    ctx.fill();

    // 右側面（稍亮一點，做出受光感）
    ctx.beginPath();
    ctx.moveTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx, cy + hh - bh);
    ctx.lineTo(cx + hw, cy - bh);
    ctx.closePath();
    ctx.fillStyle = this.shade(def.side, 18);
    ctx.fill();

    // 頂面
    this.diamondPath(cx, cy - bh, z);
    ctx.fillStyle = def.color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,.2)";
    ctx.stroke();

    // 住宅：頭頂顯示目前住了幾人（小圓點），讓玩家有回饋
    if (t.type === "house" && t.residents > 0 && z > 0.6) {
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = `${Math.round(11 * z)}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText("👥" + t.residents, cx, cy - bh - 4 * z);
    }
  }

  // 把顏色變亮一點（簡單做受光面）
  shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
    return `rgb(${r},${g},${b})`;
  }
}
