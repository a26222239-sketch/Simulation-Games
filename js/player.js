// ============================================================
// player.js — 主角（只有你一個人）
// 兩種移動：
//  ① 手動：搖桿/方向鍵（會即時取消自動尋路與排定的動作）
//  ② 自動：點地圖 → 沿路徑走到目標旁 → 抵達才執行排定的動作
// ============================================================
import { PLAYER_SPEED } from "./config.js";

export class Player {
  constructor() {
    this.fx = 0; this.fy = 0;
    this.dir = "down";
    this.moving = false;
    this.animTime = 0; this.frame = 0;
    this.path = null;          // 自動尋路的路徑（cell 陣列）
    this.pi = 0;               // 下一個路徑點
    this.pendingAction = null; // 抵達後要執行的動作
    this.targetCell = null;    // 排定操作的目標格（給畫面高亮）
    this.appearance = { skin: "#f3c9a0", hairStyle: "short", hairColor: "#5a3a1e", outfit: "basic" };
  }

  // 排定：走到 path 終點後執行 action（targetCell 用於高亮）
  setPath(path, action, targetCell) {
    if (!path || !path.length) { if (action) action(); return; }
    this.path = path; this.pi = path.length > 1 ? 1 : 0;
    this.pendingAction = action; this.targetCell = targetCell || null;
  }
  cancelPath() { this.path = null; this.pendingAction = null; this.targetCell = null; }

  update(dt, moveVec, world) {
    this.animTime += dt;
    const manual = Math.hypot(moveVec.x, moveVec.y) > 0.01;
    if (manual) { this.cancelPath(); this.moveManual(dt, moveVec, world); return; }
    if (this.path) { this.follow(dt, world); return; }
    this.moving = false;
  }

  // ① 手動移動（螢幕方向 → 等距世界向量）
  moveManual(dt, moveVec, world) {
    this.moving = true;
    if (Math.abs(moveVec.x) > Math.abs(moveVec.y)) this.dir = moveVec.x > 0 ? "right" : "left";
    else this.dir = moveVec.y > 0 ? "down" : "up";
    this.frame = Math.floor(this.animTime / 0.14) % 4;
    const len = Math.hypot(moveVec.x, moveVec.y);
    const ix = moveVec.x / len, iy = moveVec.y / len;
    const dx = (ix + iy) / 2, dy = (iy - ix) / 2;
    this.tryMove(dx, dy, PLAYER_SPEED * dt, world);
  }

  // ② 沿路徑自動走
  follow(dt, world) {
    const tgt = this.path[this.pi];
    const dx = tgt.cx - this.fx, dy = tgt.cy - this.fy;
    const d = Math.hypot(dx, dy);
    this.moving = true;
    this.frame = Math.floor(this.animTime / 0.14) % 4;
    this.faceWorld(dx, dy);
    const step = PLAYER_SPEED * dt;
    if (d <= step || d < 0.001) {
      this.fx = tgt.cx; this.fy = tgt.cy; this.pi += 1;
      if (this.pi >= this.path.length) this.arrive();
    } else {
      this.fx += (dx / d) * step; this.fy += (dy / d) * step;
    }
  }

  arrive() {
    this.path = null; this.targetCell = null; this.moving = false;
    const a = this.pendingAction; this.pendingAction = null;
    if (a) a(); // 到了才執行
  }

  // 嘗試移動（含沿牆滑行）
  tryMove(dx, dy, step, world) {
    const nx = this.fx + dx * step, ny = this.fy + dy * step;
    if (world.walkable(nx, ny)) { this.fx = nx; this.fy = ny; }
    else if (world.walkable(nx, this.fy)) { this.fx = nx; }
    else if (world.walkable(this.fx, ny)) { this.fy = ny; }
  }

  // 由世界向量決定面向（轉成螢幕方向再分四向）
  faceWorld(dx, dy) {
    const sdx = dx - dy, sdy = dx + dy;
    if (Math.abs(sdx) >= Math.abs(sdy)) this.dir = sdx > 0 ? "right" : "left";
    else this.dir = sdy > 0 ? "down" : "up";
  }

  // 手動模式時面前那格（給高亮用）
  facingCell() {
    const c = { cx: Math.round(this.fx), cy: Math.round(this.fy) };
    if (this.dir === "down") c.cy += 1;
    else if (this.dir === "up") c.cy -= 1;
    else if (this.dir === "right") c.cx += 1;
    else c.cx -= 1;
    return c;
  }
}
