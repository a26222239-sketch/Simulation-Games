// ============================================================
// input.js — 滑鼠與觸控操作
//  - 點一下（沒有拖動）：在該格蓋目前選的建築 / 拆除
//  - 按住拖曳：平移地圖
//  - 滾輪 / 雙指：縮放
// 桌機與手機共用同一套 pointer 事件。
// ============================================================

export class Input {
  constructor(canvas, game, renderer, onPlace) {
    this.canvas = canvas;
    this.game = game;
    this.renderer = renderer;
    this.onPlace = onPlace; // 點擊放置時呼叫的 callback(gx, gy)

    this.pointers = new Map(); // 目前按著的指標（支援多指）
    this.dragging = false;
    this.moved = false;        // 這次按壓有沒有移動超過門檻（用來區分點擊 vs 拖曳）
    this.lastPinchDist = 0;
    this.lastSingle = null;

    this.bind();
  }

  bind() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => this.onDown(e));
    c.addEventListener("pointermove", (e) => this.onMove(e));
    c.addEventListener("pointerup", (e) => this.onUp(e));
    c.addEventListener("pointercancel", (e) => this.onUp(e));
    c.addEventListener("pointerleave", () => { this.renderer.hover = null; });
    // 滾輪縮放（桌機）
    c.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
  }

  pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  onDown(e) {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, this.pos(e));
    this.moved = false;
    if (this.pointers.size === 1) {
      this.dragging = true;
      this.lastSingle = this.pos(e);
    } else if (this.pointers.size === 2) {
      // 進入雙指縮放，取消單指拖曳
      this.dragging = false;
      this.lastPinchDist = this.pinchDist();
    }
  }

  onMove(e) {
    const p = this.pos(e);
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);

    // 更新懸停的格子（讓畫面有高亮）
    this.renderer.hover = this.renderer.canvasToGrid(p.x, p.y);

    if (this.pointers.size === 2) {
      // 雙指縮放
      const d = this.pinchDist();
      if (this.lastPinchDist > 0) {
        const factor = d / this.lastPinchDist;
        this.zoomAt(this.pinchCenter(), factor);
      }
      this.lastPinchDist = d;
      this.moved = true;
      return;
    }

    if (this.dragging && this.lastSingle) {
      const dx = p.x - this.lastSingle.x;
      const dy = p.y - this.lastSingle.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.moved = true;
      // 平移：除以 zoom 讓拖曳手感跟縮放程度一致
      this.game.camX += dx / this.game.zoom;
      this.game.camY += dy / this.game.zoom;
      this.lastSingle = p;
    }
  }

  onUp(e) {
    const wasMoved = this.moved;
    const p = this.pos(e);
    this.pointers.delete(e.pointerId);

    // 單指、且幾乎沒移動 -> 視為「點擊放置」
    if (this.pointers.size === 0) {
      if (this.dragging && !wasMoved) {
        const { gx, gy } = this.renderer.canvasToGrid(p.x, p.y);
        if (this.game.inBounds(gx, gy)) this.onPlace(gx, gy);
      }
      this.dragging = false;
      this.lastSingle = null;
      this.lastPinchDist = 0;
    }
  }

  onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.zoomAt(this.pos(e), factor);
  }

  // 以某個畫面點為中心縮放（縮放時該點底下的地圖位置保持不動）
  zoomAt(center, factor) {
    const g = this.game;
    const newZoom = Math.max(0.4, Math.min(2.5, g.zoom * factor));
    // 縮放前 center 底下對應的世界座標（世界座標 = px/zoom - cam）
    const worldX = center.x / g.zoom - g.camX;
    const worldY = center.y / g.zoom - g.camY;
    g.zoom = newZoom;
    g.camX = center.x / newZoom - worldX;
    g.camY = center.y / newZoom - worldY;
  }

  pinchDist() {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  pinchCenter() {
    const pts = [...this.pointers.values()];
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  }
}
