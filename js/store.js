// ============================================================
// store.js — 商店場景的狀態與經營邏輯
// 負責：店面格子、金錢/已服務人數、編輯店面、生成與更新顧客、
//       營收結算、存檔/讀檔。不負責畫面（畫面在 render.js）。
// ============================================================
import { STORE_W, STORE_H, TILES, START_MONEY, SAVE_KEY, CUSTOMER } from "./config.js";
import { Customer } from "./customer.js";

export class Store {
  constructor() {
    this.w = STORE_W;
    this.h = STORE_H;
    this.reset();
  }

  // 預設店面：四周牆、底部開一道門、兩排貨架、一個櫃台
  reset() {
    this.tiles = [];
    for (let i = 0; i < this.w * this.h; i++) this.tiles.push({ type: "floor" });

    // 外牆
    for (let x = 0; x < this.w; x++) { this.set(x, 0, "wall"); this.set(x, this.h - 1, "wall"); }
    for (let y = 0; y < this.h; y++) { this.set(0, y, "wall"); this.set(this.w - 1, y, "wall"); }
    // 門（底邊中間）
    this.set(Math.floor(this.w / 2), this.h - 1, "door");
    // 兩排貨架
    for (let x = 3; x <= 6; x++) { this.set(x, 3, "shelf"); this.set(x, 5, "shelf"); }
    for (let x = 8; x <= 10; x++) { this.set(x, 3, "shelf"); this.set(x, 5, "shelf"); }
    // 櫃台（靠近門口）
    this.set(5, this.h - 4, "counter"); this.set(6, this.h - 4, "counter");

    this.money = START_MONEY;
    this.served = 0;
    this.customers = [];
    this.spawnTimer = 0;
    this.open = true;

    this.camX = 0; this.camY = 0; this.zoom = 1;
    this._cameraInited = false;
  }

  // ---- 基本存取 ----
  inBounds(cx, cy) { return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h; }
  tile(cx, cy) { return this.inBounds(cx, cy) ? this.tiles[cy * this.w + cx] : null; }
  set(cx, cy, type) { if (this.inBounds(cx, cy)) this.tiles[cy * this.w + cx].type = type; }
  walkableAt(cx, cy) {
    const t = this.tile(cx, cy);
    return !!t && TILES[t.type].walkable;
  }

  // 玩家編輯店面（放置地磚/設施）
  setTile(cx, cy, type) {
    if (!this.inBounds(cx, cy)) return { ok: false, msg: "超出範圍" };
    if (!TILES[type] || !TILES[type].editable) return { ok: false, msg: "不能放這個" };
    this.set(cx, cy, type);
    return { ok: true };
  }

  // ---- 找目標格（給顧客用）----
  cellsOfType(type) {
    const out = [];
    for (let cy = 0; cy < this.h; cy++)
      for (let cx = 0; cx < this.w; cx++)
        if (this.tile(cx, cy).type === type) out.push({ cx, cy });
    return out;
  }
  walkableNeighbors(cx, cy) {
    return [[1,0],[-1,0],[0,1],[0,-1]]
      .map(([dx, dy]) => ({ cx: cx + dx, cy: cy + dy }))
      .filter((c) => this.walkableAt(c.cx, c.cy));
  }
  // 隨機挑一個某類設施旁邊「能站的格子」
  goalBesideType(type) {
    const cells = this.cellsOfType(type);
    for (let tries = 0; tries < 8 && cells.length; tries++) {
      const c = cells[Math.floor(Math.random() * cells.length)];
      const ns = this.walkableNeighbors(c.cx, c.cy);
      if (ns.length) return ns[Math.floor(Math.random() * ns.length)];
    }
    return null;
  }
  randomDoor() {
    const doors = this.cellsOfType("door");
    return doors.length ? doors[Math.floor(Math.random() * doors.length)] : null;
  }

  // 顧客結帳：入帳並計數
  sell(price) { this.money += price; this.served += 1; }

  // ---- 每幀更新（dt 秒）----
  update(dt) {
    // 生成顧客
    this.spawnTimer += dt;
    if (this.spawnTimer >= CUSTOMER.spawnEverySec) {
      this.spawnTimer = 0;
      this.trySpawn();
    }
    // 更新顧客，移除已離場的
    for (const c of this.customers) c.update(dt);
    this.customers = this.customers.filter((c) => !c.done);
  }

  trySpawn() {
    if (!this.open) return;
    if (this.customers.length >= CUSTOMER.maxInStore) return;
    const door = this.randomDoor();
    if (!door) return;                  // 沒有門就不會有客人
    if (!this.goalBesideType("shelf")) return; // 沒有可逛的貨架也不來
    this.customers.push(new Customer(this, door));
  }

  // ---- 存檔 / 讀檔（顧客是暫時的，不存）----
  serialize() {
    return {
      v: 3, w: this.w, h: this.h,
      money: this.money, served: this.served, open: this.open,
      cam: { x: this.camX, y: this.camY, zoom: this.zoom },
      tiles: this.tiles.map((t) => t.type),
    };
  }
  load(data) {
    if (!data || data.w !== this.w || data.h !== this.h) return false;
    this.reset();
    this.money = data.money ?? START_MONEY;
    this.served = data.served ?? 0;
    this.open = data.open ?? true;
    if (data.cam) { this.camX = data.cam.x; this.camY = data.cam.y; this.zoom = data.cam.zoom || 1; this._cameraInited = true; }
    if (Array.isArray(data.tiles)) {
      for (let i = 0; i < this.tiles.length && i < data.tiles.length; i++) {
        if (TILES[data.tiles[i]]) this.tiles[i].type = data.tiles[i];
      }
    }
    return true;
  }
  saveToStorage() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.serialize())); return true; }
    catch (e) { console.error("存檔失敗", e); return false; }
  }
  loadFromStorage() {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? this.load(JSON.parse(raw)) : false; }
    catch (e) { console.error("讀檔失敗", e); return false; }
  }
  hasSave() { return !!localStorage.getItem(SAVE_KEY); }
}
