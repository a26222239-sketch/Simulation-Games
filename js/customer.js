// ============================================================
// customer.js — 一位顧客的「行為」（不負責畫，畫在 render.js）
// 狀態流程：進場 → 走到貨架前『逛』 → 走到櫃台『結帳(付錢)』 → 走向門口離場
// 走路時 frame 會循環，產生腿部動畫；位置在格子間連續移動。
// ============================================================
import { CUSTOMER } from "./config.js";
import { bfs } from "./pathfind.js";

const COLORS = ["#e57373", "#64b5f6", "#81c784", "#ffb74d", "#ba68c8", "#4db6ac", "#f06292", "#a1887f"];
const rnd = (range) => range[0] + Math.random() * (range[1] - range[0]);

export class Customer {
  constructor(store, doorCell) {
    this.store = store;
    this.gx = doorCell.cx;   // 連續座標（格為單位，可為小數）
    this.gy = doorCell.cy;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.speed = CUSTOMER.speed;

    this.path = null;
    this.pi = 1;             // 下一個路徑點索引
    this.wait = 0;           // 逛/結帳的等待秒數
    this.moving = false;
    this.dir = 0;            // 朝向：0前 1左 2右 3後（給精靈圖用）
    this.frame = 0;          // 走路動畫第幾格
    this.animTime = 0;
    this.done = false;       // 離場後 = true，會被移除

    this.price = Math.round(rnd(CUSTOMER.salePrice));
    this.goShelf();          // 一進場就去找貨架
  }

  // 目前所在的整數格（給尋路當起點）
  cell() { return { cx: Math.round(this.gx), cy: Math.round(this.gy) }; }

  // 設定一個新目標並算路徑；算不到回 false
  setGoal(goal) {
    if (!goal) return false;
    const path = bfs(this.store, this.cell(), goal);
    if (!path) return false;
    this.path = path;
    this.pi = 1;
    return true;
  }

  goShelf() {
    if (this.setGoal(this.store.goalBesideType("shelf"))) this.state = "toShelf";
    else this.goLeave();
  }
  goCounter() {
    if (this.setGoal(this.store.goalBesideType("counter"))) this.state = "toCounter";
    else this.goLeave(); // 沒櫃台可結帳就直接走
  }
  goLeave() {
    this.state = "leaving";
    if (!this.setGoal(this.store.randomDoor())) this.done = true; // 被困住就直接消失
  }

  update(dt) {
    this.animTime += dt;

    // 逛 / 結帳：原地等待
    if (this.state === "shopping" || this.state === "paying") {
      this.moving = false;
      this.wait -= dt;
      if (this.wait <= 0) {
        if (this.state === "shopping") this.goCounter();
        else { this.store.sell(this.price); this.goLeave(); } // 結帳完入帳
      }
      return;
    }

    // 移動中：沿路徑前進
    if (!this.path || this.pi >= this.path.length) { this.arrive(); return; }
    this.moving = true;
    // 每 0.13 秒換一格走路動作
    this.frame = Math.floor(this.animTime / 0.13) % 4;

    const tgt = this.path[this.pi];
    const dx = tgt.cx - this.gx, dy = tgt.cy - this.gy;
    const dist = Math.hypot(dx, dy);
    this.updateDir(dx, dy);

    const step = this.speed * dt;
    if (dist <= step || dist < 0.001) {
      this.gx = tgt.cx; this.gy = tgt.cy;
      this.pi += 1;
      if (this.pi >= this.path.length) this.arrive();
    } else {
      this.gx += (dx / dist) * step;
      this.gy += (dy / dist) * step;
    }
  }

  // 抵達路徑終點時，依目前狀態決定下一步
  arrive() {
    this.moving = false;
    this.path = null;
    if (this.state === "toShelf") {
      this.state = "shopping"; this.wait = rnd(CUSTOMER.shopSec);
    } else if (this.state === "toCounter") {
      this.state = "paying"; this.wait = rnd(CUSTOMER.paySec);
    } else if (this.state === "leaving") {
      this.done = true; // 到門口 → 離場
    }
  }

  // 由移動方向換算朝向（轉成等距螢幕方向再分四向）
  updateDir(dx, dy) {
    const sdx = dx - dy;   // 螢幕水平分量
    const sdy = dx + dy;   // 螢幕垂直分量
    if (Math.abs(sdx) >= Math.abs(sdy)) this.dir = sdx > 0 ? 2 : 1; // 右 / 左
    else this.dir = sdy > 0 ? 0 : 3;                                 // 前 / 後
  }
}
