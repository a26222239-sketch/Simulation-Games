// ============================================================
// player.js — 主角（只有你一個人）
// 狀態：位置(fx,fy 格座標,可小數)、面向 dir、外觀 appearance、走路動畫。
// 移動採「螢幕方向」操作：搖桿/方向鍵的上下左右對齊畫面，內部換算成等距世界座標。
// ============================================================
import { PLAYER_SPEED, SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from "./config.js";

export class Player {
  constructor() {
    this.fx = 0; this.fy = 0;
    this.dir = "down";   // down/up/left/right
    this.moving = false;
    this.animTime = 0;
    this.frame = 0;
    // 預設外觀（捏臉可改）
    this.appearance = {
      skin: SKIN_TONES[0],
      hairStyle: HAIR_STYLES[0],
      hairColor: HAIR_COLORS[1],
      outfit: "basic",
    };
  }

  // moveVec：螢幕方向向量 {x:右+, y:下+}，長度 0~1
  update(dt, moveVec, world) {
    this.animTime += dt;
    const len = Math.hypot(moveVec.x, moveVec.y);
    if (len < 0.01) { this.moving = false; return; }
    this.moving = true;

    // 面向（依螢幕方向）
    if (Math.abs(moveVec.x) > Math.abs(moveVec.y)) this.dir = moveVec.x > 0 ? "right" : "left";
    else this.dir = moveVec.y > 0 ? "down" : "up";
    // 走路動畫
    this.frame = Math.floor(this.animTime / 0.14) % 4;

    // 螢幕向量 -> 等距世界向量
    const ix = moveVec.x / len, iy = moveVec.y / len;
    let dx = (ix + iy) / 2, dy = (iy - ix) / 2;
    const step = PLAYER_SPEED * dt;
    const nx = this.fx + dx * step, ny = this.fy + dy * step;

    // 碰撞：先試完整移動，被擋就分別試 x / y（沿牆滑行）
    if (world.walkable(nx, ny)) { this.fx = nx; this.fy = ny; }
    else if (world.walkable(nx, this.fy)) { this.fx = nx; }
    else if (world.walkable(this.fx, ny)) { this.fy = ny; }
  }

  // 主角面前那一格（用來決定鋤地/種植的目標）
  facingCell() {
    const c = { cx: Math.round(this.fx), cy: Math.round(this.fy) };
    if (this.dir === "down") c.cx += 0, c.cy += 1;
    else if (this.dir === "up") c.cy -= 1;
    else if (this.dir === "right") c.cx += 1;
    else c.cx -= 1;
    return c;
  }
}
