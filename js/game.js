// ============================================================
// game.js — 遊戲狀態與經濟邏輯
// 負責：地圖資料（含多格建築）、等級、金錢/人口、蓋/拆/升級、
//       每月結算、存檔/讀檔。完全不碰畫面繪製（畫面在 render.js）。
// ============================================================
import { GRID_SIZE, BUILDINGS, START_MONEY, SAVE_KEY, LEVEL_MAX } from "./config.js";

// ---- 地圖每格的資料設計 ----
// 一棟建築可能佔多格。我們指定其左上角(ox,oy)為「主格」：
//   ‧ 主格：    { type:<建築>, level, residents, ox, oy, w, h }
//   ‧ 被佔格：  { type:"occupied", ox, oy }   <- 指回主格
//   ‧ 空地：    { type:"grass" }

export class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.size = GRID_SIZE;
    this.tiles = [];
    for (let i = 0; i < this.size * this.size; i++) {
      this.tiles.push({ type: "grass" });
    }
    this.money = START_MONEY;
    this.month = 1;
    this.camX = 0;
    this.camY = 0;
    this.zoom = 1;
    this._cameraInited = false;
  }

  inBounds(gx, gy) {
    return gx >= 0 && gy >= 0 && gx < this.size && gy < this.size;
  }

  tile(gx, gy) {
    if (!this.inBounds(gx, gy)) return null;
    return this.tiles[gy * this.size + gx];
  }

  // 從任何一格（可能是被佔格）找到它所屬建築的「主格」
  originTile(gx, gy) {
    const t = this.tile(gx, gy);
    if (!t) return null;
    if (t.type === "occupied") return this.tile(t.ox, t.oy);
    return t;
  }

  // 是不是一棟「真的建築」的主格（不是空地、不是被佔格）
  isBuildingOrigin(t) {
    return t && BUILDINGS[t.type] && BUILDINGS[t.type].buildable;
  }

  // ---- 等級換算後的數值 ----
  // 量體高度：隨等級變高
  heightOf(t) {
    const def = BUILDINGS[t.type];
    return def.baseHeight * (0.6 + (t.level - 1) * 0.09); // Lv1≈0.6× → Lv10≈1.41×
  }
  // 住宅可住人口上限
  maxResidentsOf(t) {
    const def = BUILDINGS[t.type];
    return def.maxResidentsL1 ? def.maxResidentsL1 * t.level : 0;
  }
  // 升級到下一級的費用
  upgradeCostOf(t) {
    const def = BUILDINGS[t.type];
    return Math.round(def.cost * 0.6 * t.level);
  }

  // 走訪某棟建築佔據的每一格 (gx,gy)
  eachFootprint(originTile, cb) {
    const { ox, oy, w, h } = originTile;
    for (let y = oy; y < oy + h; y++)
      for (let x = ox; x < ox + w; x++) cb(x, y);
  }

  // 這棟建築的佔地「周圍一圈」有沒有道路
  hasAdjacentRoad(originTile) {
    const { ox, oy, w, h } = originTile;
    for (let x = ox - 1; x <= ox + w; x++) {
      for (let y = oy - 1; y <= oy + h; y++) {
        // 只看外圈（跳過建築本體內部）
        const inside = x >= ox && x < ox + w && y >= oy && y < oy + h;
        if (inside) continue;
        // 只看正上下左右那一圈（不含斜角），避免對角也算接到路
        const orthAdj = (x >= ox && x < ox + w) || (y >= oy && y < oy + h);
        if (!orthAdj) continue;
        const t = this.tile(x, y);
        if (t && t.type === "road") return true;
      }
    }
    return false;
  }

  // 檢查一塊 w×h 區域是否可以蓋（在界內且全是空地）
  areaFree(gx, gy, w, h) {
    for (let y = gy; y < gy + h; y++)
      for (let x = gx; x < gx + w; x++) {
        const t = this.tile(x, y);
        if (!t || t.type !== "grass") return false;
      }
    return true;
  }

  // 蓋建築（gx,gy 視為左上角主格）
  build(gx, gy, type) {
    const def = BUILDINGS[type];
    if (!def || !def.buildable) return { ok: false, msg: "不能蓋這個" };
    const { w, h } = def.footprint;
    if (!this.inBounds(gx, gy) || !this.inBounds(gx + w - 1, gy + h - 1))
      return { ok: false, msg: "超出地圖範圍" };
    if (!this.areaFree(gx, gy, w, h))
      return { ok: false, msg: `需要 ${w}×${h} 的空地` };
    if (this.money < def.cost) return { ok: false, msg: "資金不足！" };

    this.money -= def.cost;
    // 設定主格
    const origin = this.tile(gx, gy);
    origin.type = type;
    origin.level = 1;
    origin.residents = 0;
    origin.ox = gx; origin.oy = gy;
    origin.w = w; origin.h = h;
    // 其餘格標記為被佔
    this.eachFootprint(origin, (x, y) => {
      if (x === gx && y === gy) return;
      const t = this.tile(x, y);
      t.type = "occupied"; t.ox = gx; t.oy = gy;
      delete t.level; delete t.residents; delete t.w; delete t.h;
    });
    return { ok: true };
  }

  // 升級（點到建築的任一格都可以）
  upgrade(gx, gy) {
    const o = this.originTile(gx, gy);
    if (!this.isBuildingOrigin(o)) return { ok: false, msg: "這裡沒有可升級的建築" };
    if (o.level >= LEVEL_MAX) return { ok: false, msg: "已經是最高等級 Lv.10" };
    const cost = this.upgradeCostOf(o);
    if (this.money < cost) return { ok: false, msg: `升級需要 $${cost}` };
    this.money -= cost;
    o.level += 1;
    return { ok: true, msg: `升級成功 → Lv.${o.level}`, level: o.level };
  }

  // 拆除（點到建築任一格都可以），退款 = 退款基數 × 等級
  bulldoze(gx, gy) {
    const o = this.originTile(gx, gy);
    if (!this.isBuildingOrigin(o)) return { ok: false, msg: "這裡沒東西可拆" };
    const def = BUILDINGS[o.type];
    this.money += (def.refund || 0) * o.level;
    this.eachFootprint(o, (x, y) => {
      const t = this.tile(x, y);
      t.type = "grass";
      delete t.level; delete t.residents; delete t.ox; delete t.oy;
      delete t.w; delete t.h;
    });
    return { ok: true };
  }

  // 走訪所有「建築主格」
  eachBuilding(cb) {
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      if (this.isBuildingOrigin(t)) cb(t);
    }
  }

  get population() {
    let p = 0;
    this.eachBuilding((t) => { p += t.residents || 0; });
    return p;
  }

  monthlyIncome() {
    let income = 0;
    this.eachBuilding((t) => {
      const def = BUILDINGS[t.type];
      const connected = !def.needsRoad || this.hasAdjacentRoad(t);
      if (t.type === "house" && connected) {
        income += (t.residents || 0) * def.taxPerResident;
      }
      if (t.type === "shop") {
        if (connected) income += def.incomeL1 * t.level;
        income -= (def.upkeep || 0) + t.level; // 維護費隨等級微增
      }
      if (t.type === "park") {
        income -= (def.upkeep || 0);
      }
    });
    return income;
  }

  // 每月結算：人口成長 + 收支 + 月份 +1
  tick() {
    this.eachBuilding((t) => {
      if (t.type !== "house") return;
      const cap = this.maxResidentsOf(t);
      if (this.hasAdjacentRoad(t)) {
        if (t.residents < cap) t.residents = Math.min(cap, (t.residents || 0) + 1);
      } else if (t.residents > 0) {
        t.residents -= 1; // 沒接到路，居民慢慢搬走
      }
    });
    this.money += this.monthlyIncome();
    this.month += 1;
  }

  // ---- 存檔 / 讀檔 ----
  serialize() {
    // 只存「主格」，被佔格在讀檔時依佔地重建
    const cells = [];
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      if (this.isBuildingOrigin(t)) {
        cells.push({ ox: t.ox, oy: t.oy, type: t.type, level: t.level, residents: t.residents || 0 });
      }
    }
    return {
      v: 2,
      size: this.size,
      money: this.money,
      month: this.month,
      cam: { x: this.camX, y: this.camY, zoom: this.zoom },
      cells,
    };
  }

  load(data) {
    if (!data || data.size !== GRID_SIZE) return false;
    this.reset();
    this.money = data.money ?? START_MONEY;
    this.month = data.month ?? 1;
    if (data.cam) {
      this.camX = data.cam.x; this.camY = data.cam.y; this.zoom = data.cam.zoom || 1;
      this._cameraInited = true;
    }
    for (const c of data.cells || []) {
      const def = BUILDINGS[c.type];
      if (!def || !def.footprint) continue;
      const { w, h } = def.footprint;
      if (!this.inBounds(c.ox, c.oy) || !this.inBounds(c.ox + w - 1, c.oy + h - 1)) continue;
      const origin = this.tile(c.ox, c.oy);
      origin.type = c.type;
      origin.level = Math.min(LEVEL_MAX, Math.max(1, c.level || 1));
      origin.residents = c.residents || 0;
      origin.ox = c.ox; origin.oy = c.oy; origin.w = w; origin.h = h;
      this.eachFootprint(origin, (x, y) => {
        if (x === c.ox && y === c.oy) return;
        const t = this.tile(x, y);
        t.type = "occupied"; t.ox = c.ox; t.oy = c.oy;
      });
    }
    return true;
  }

  saveToStorage() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.serialize()));
      return true;
    } catch (e) { console.error("存檔失敗", e); return false; }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      return this.load(JSON.parse(raw));
    } catch (e) { console.error("讀檔失敗", e); return false; }
  }

  hasSave() { return !!localStorage.getItem(SAVE_KEY); }
}
