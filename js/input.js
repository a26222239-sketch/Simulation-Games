// ============================================================
// input.js — 操作：移動 + 點擊互動
//  ‧ 電腦：WASD / 方向鍵移動；滑鼠點地圖格子互動
//  ‧ 手機：左下虛擬搖桿移動；點地圖格子互動
// main.js 每幀讀 input.moveVec 來移動主角；點擊時呼叫 onTap(cx,cy)。
// ============================================================
export class Input {
  constructor(canvas, joystick, renderer, onTap) {
    this.canvas = canvas; this.renderer = renderer; this.onTap = onTap;
    this.joystick = joystick;           // { base, stick } DOM
    this.keys = {};                     // 鍵盤狀態
    this.joyVec = { x: 0, y: 0 };       // 搖桿向量
    this.moveVec = { x: 0, y: 0 };
    this.bindKeys();
    this.bindJoystick();
    this.bindTap();
  }

  bindKeys() {
    const map = { w: [0,-1], a: [-1,0], s: [0,1], d: [1,0],
      arrowup: [0,-1], arrowleft: [-1,0], arrowdown: [0,1], arrowright: [1,0] };
    const upd = () => {
      let x = 0, y = 0;
      for (const k in this.keys) if (this.keys[k] && map[k]) { x += map[k][0]; y += map[k][1]; }
      this.keyVec = { x, y };
      this.recompute();
    };
    window.addEventListener("keydown", (e) => { const k = e.key.toLowerCase(); if (map[k]) { this.keys[k] = true; upd(); e.preventDefault(); } });
    window.addEventListener("keyup", (e) => { const k = e.key.toLowerCase(); if (map[k]) { this.keys[k] = false; upd(); } });
    this.keyVec = { x: 0, y: 0 };
  }

  recompute() {
    // 鍵盤優先；沒按鍵就用搖桿
    const kv = this.keyVec || { x: 0, y: 0 };
    if (kv.x || kv.y) this.moveVec = { x: kv.x, y: kv.y };
    else this.moveVec = { x: this.joyVec.x, y: this.joyVec.y };
  }

  bindJoystick() {
    const base = this.joystick.base, stick = this.joystick.stick;
    const R = 42;
    let id = null, ox = 0, oy = 0;
    const start = (e) => { id = e.pointerId; const r = base.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; base.setPointerCapture(id); move(e); };
    const move = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const d = Math.hypot(dx, dy); if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      stick.style.transform = `translate(${dx}px,${dy}px)`;
      this.joyVec = { x: dx / R, y: dy / R }; this.recompute();
    };
    const end = (e) => { if (e.pointerId !== id) return; id = null; stick.style.transform = "translate(0,0)"; this.joyVec = { x: 0, y: 0 }; this.recompute(); };
    base.addEventListener("pointerdown", start);
    base.addEventListener("pointermove", move);
    base.addEventListener("pointerup", end);
    base.addEventListener("pointercancel", end);
  }

  bindTap() {
    let downX = 0, downY = 0, downT = 0;
    this.canvas.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; downT = performance.now(); });
    this.canvas.addEventListener("pointerup", (e) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved < 10 && performance.now() - downT < 500) {
        const r = this.canvas.getBoundingClientRect();
        const { gx, gy } = this.renderer.canvasToGrid(e.clientX - r.left, e.clientY - r.top);
        this.onTap(gx, gy);
      }
    });
  }
}
