// ============================================================
// game.js — 遊戲狀態與經濟邏輯
// 負責：地圖資料、金錢/人口、蓋與拆、每月結算、存檔/讀檔。
// 這裡完全不碰畫面繪製（畫面在 render.js）。
// ============================================================
import { GRID_SIZE, BUILDINGS, START_MONEY, SAVE_KEY } from "./config.js";

export class Game {
  constructor() {
    this.reset();
  }

  // 開新的一局
  reset() {
    this.size = GRID_SIZE;
    // 地圖用一維陣列存，索引 = gy * size + gx。每格一個物件。
    this.tiles = [];
    for (let i = 0; i < this.size * this.size; i++) {
      this.tiles.push({ type: "grass", residents: 0 });
    }
    this.money = START_MONEY;
    this.month = 1;
    // 相機：camX/camY 是地圖中心對齊到螢幕的位移，zoom 是縮放倍率
    this.camX = 0;
    this.camY = 0;
    this.zoom = 1;
    this._cameraInited = false;
  }

  // 邊界檢查
  inBounds(gx, gy) {
    return gx >= 0 && gy >= 0 && gx < this.size && gy < this.size;
  }

  tile(gx, gy) {
    if (!this.inBounds(gx, gy)) return null;
    return this.tiles[gy * this.size + gx];
  }

  // 這格旁邊（上下左右）有沒有道路 —— 用來判斷住宅/商店是否「接到路」
  hasAdjacentRoad(gx, gy) {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    return dirs.some(([dx, dy]) => {
      const t = this.tile(gx + dx, gy + dy);
      return t && t.type === "road";
    });
  }

  // 嘗試在 (gx,gy) 蓋指定建築。回傳 {ok, msg}
  build(gx, gy, type) {
    const def = BUILDINGS[type];
    if (!def || !def.buildable) return { ok: false, msg: "不能蓋這個" };
    const t = this.tile(gx, gy);
    if (!t) return { ok: false, msg: "超出地圖範圍" };
    if (t.type !== "grass") return { ok: false, msg: "這裡已經有東西了" };
    if (this.money < def.cost) return { ok: false, msg: "資金不足！" };

    this.money -= def.cost;
    t.type = type;
    t.residents = 0;
    return { ok: true };
  }

  // 拆除 (gx,gy)，退還部分款項
  bulldoze(gx, gy) {
    const t = this.tile(gx, gy);
    if (!t || t.type === "grass") return { ok: false, msg: "這裡沒東西可拆" };
    const def = BUILDINGS[t.type];
    this.money += def.refund || 0;
    t.type = "grass";
    t.residents = 0;
    return { ok: true };
  }

  // 全市總人口
  get population() {
    let p = 0;
    for (const t of this.tiles) p += t.residents || 0;
    return p;
  }

  // 計算「這個月」的淨收入（給上方資訊列預覽用，也用於結算）
  monthlyIncome() {
    let income = 0;
    for (let gy = 0; gy < this.size; gy++) {
      for (let gx = 0; gx < this.size; gx++) {
        const t = this.tile(gx, gy);
        const def = BUILDINGS[t.type];
        if (!def) continue;
        const connected = !def.needsRoad || this.hasAdjacentRoad(gx, gy);
        if (t.type === "house" && connected) {
          income += (t.residents || 0) * def.taxPerResident;
        }
        if (t.type === "shop") {
          if (connected) income += def.incomePerMonth;
          income -= def.upkeep || 0;
        }
        if (t.type === "park") {
          income -= def.upkeep || 0;
        }
      }
    }
    return income;
  }

  // 每月結算：人口成長 + 收支結算 + 月份 +1
  tick() {
    // 1) 接到路的住宅，人口慢慢往上長
    for (let gy = 0; gy < this.size; gy++) {
      for (let gx = 0; gx < this.size; gx++) {
        const t = this.tile(gx, gy);
        if (t.type !== "house") continue;
        const def = BUILDINGS.house;
        if (this.hasAdjacentRoad(gx, gy)) {
          if (t.residents < def.maxResidents) t.residents += 1;
        } else {
          // 沒接到路，居民會慢慢搬走
          if (t.residents > 0) t.residents -= 1;
        }
      }
    }
    // 2) 收支結算
    this.money += this.monthlyIncome();
    // 3) 過一個月
    this.month += 1;
  }

  // ---- 存檔 / 讀檔 ----

  // 把目前狀態壓成一個純資料物件（之後序列化成 JSON）
  serialize() {
    // 地圖只存有東西的格子（grass 不存），存檔更小
    const cells = [];
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      if (t.type !== "grass") {
        cells.push({ i, type: t.type, residents: t.residents || 0 });
      }
    }
    return {
      v: 1,
      size: this.size,
      money: this.money,
      month: this.month,
      cam: { x: this.camX, y: this.camY, zoom: this.zoom },
      cells,
    };
  }

  // 從資料物件還原狀態
  load(data) {
    if (!data || data.size !== GRID_SIZE) {
      // 地圖大小不符就不載入（避免舊存檔崩潰）
      return false;
    }
    this.reset();
    this.money = data.money ?? START_MONEY;
    this.month = data.month ?? 1;
    if (data.cam) {
      this.camX = data.cam.x; this.camY = data.cam.y; this.zoom = data.cam.zoom || 1;
      this._cameraInited = true;
    }
    for (const c of data.cells || []) {
      if (this.tiles[c.i]) {
        this.tiles[c.i].type = c.type;
        this.tiles[c.i].residents = c.residents || 0;
      }
    }
    return true;
  }

  // 存到瀏覽器的 localStorage（自動存檔與手動存檔都用這個）
  saveToStorage() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.serialize()));
      return true;
    } catch (e) {
      console.error("存檔失敗", e);
      return false;
    }
  }

  // 從 localStorage 讀回來
  loadFromStorage() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      return this.load(JSON.parse(raw));
    } catch (e) {
      console.error("讀檔失敗", e);
      return false;
    }
  }

  hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  }
}
