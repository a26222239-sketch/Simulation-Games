// ============================================================
// world.js — 農場世界的狀態與規則
// 兩個場景：farm(農場) / town(城鎮)。負責地圖、作物、畜舍、動物、
// 庫存金錢、換日、買賣、換裝資料、存讀檔。畫面在 render.js。
// ============================================================
import {
  FARM_W, FARM_H, TOWN_W, TOWN_H, GROUND, CROPS, BUILDINGS, ANIMALS,
  SELLABLE, START_MONEY, SAVE_KEY, CLOTHES,
} from "./config.js";
import { Player } from "./player.js";

const ri = (n) => Math.floor(Math.random() * n);

export class World {
  constructor() { this.player = new Player(); this.reset(); }

  reset() {
    this.money = START_MONEY;
    this.day = 1;
    this.active = "farm";
    this.inventory = {};      // {item: count}
    this.seedSel = "turnip";  // 目前要種的種子
    this.ownedClothes = ["basic"];
    this.player.appearance.outfit = "basic";

    this.makeFarm();
    this.makeTown();
    // 主角站農場中央
    this.player.fx = 8; this.player.fy = 10; this.player.dir = "down";
    this._needCreator = true; // 新遊戲要先捏臉
  }

  // ---- 建地圖 ----
  blankScene(w, h, g) {
    const tiles = [];
    for (let i = 0; i < w * h; i++) tiles.push({ g, crop: null, b: null });
    return { w, h, tiles };
  }
  makeFarm() {
    const s = this.blankScene(FARM_W, FARM_H, "grass");
    this.farm = s;
    // 一個小池塘
    for (let y = 3; y <= 5; y++) for (let x = 15; x <= 18; x++) this.setG(s, x, y, "water");
    // 一條步道
    for (let y = 0; y < FARM_H; y++) this.setG(s, 10, y, "path");
    this.buildings = [];      // 玩家蓋的畜舍
    this.animals = [];        // 動物
    this.bin = { x: 7, y: 12 }; // 出貨箱（蓋好就在那）
  }
  makeTown() {
    const s = this.blankScene(TOWN_W, TOWN_H, "plaza");
    this.town = s;
    for (let x = 0; x < TOWN_W; x++) this.setG(s, x, 10, "path");
    // 兩間店：服飾店 / 種子店（佔地，會擋路，要走到旁邊互動）
    this.shops = [
      { kind: "clothes", name: "服飾店", x: 3, y: 5, w: 3, h: 2, color: "#c8669b", side: "#9c4a78" },
      { kind: "seed",    name: "種子店", x: 10, y: 5, w: 3, h: 2, color: "#6aa84f", side: "#4d7d39" },
    ];
    for (const sh of this.shops)
      for (let y = sh.y; y < sh.y + sh.h; y++) for (let x = sh.x; x < sh.x + sh.w; x++)
        { const t = this.tileOf(s, x, y); if (t) t.b = "shop"; }
  }

  // ---- 取用 ----
  scene() { return this.active === "farm" ? this.farm : this.town; }
  tileOf(s, cx, cy) { return (cx >= 0 && cy >= 0 && cx < s.w && cy < s.h) ? s.tiles[cy * s.w + cx] : null; }
  tile(cx, cy) { return this.tileOf(this.scene(), cx, cy); }
  setG(s, cx, cy, g) { const t = this.tileOf(s, cx, cy); if (t) t.g = g; }

  walkable(fx, fy) {
    const cx = Math.round(fx), cy = Math.round(fy);
    const t = this.tile(cx, cy);
    if (!t) return false;
    if (GROUND[t.g].solid) return false;  // 水等
    if (t.b != null) return false;        // 畜舍/店面擋路（注意 id 可能為 0）
    return true;
  }

  neighbors4(cx, cy) { return [[1,0],[-1,0],[0,1],[0,-1]].map(([dx, dy]) => ({ cx: cx + dx, cy: cy + dy })); }

  // 從主角目前位置，找一條到「目標格(tx,ty)旁(或其上)」的路徑。
  // 目標可走 → 走到它上面；不可走(店面/畜舍/水) → 走到相鄰可走格。走不到回 null。
  pathToCell(tx, ty) {
    const s = this.scene();
    const start = { cx: Math.round(this.player.fx), cy: Math.round(this.player.fy) };
    // 一律停在目標「旁邊」再執行（更符合農場操作，也不會站在作物上）。
    // 若四周都不可走、但目標本身可走，才退而走到目標上。
    let goals = this.neighbors4(tx, ty).filter((n) => this.walkable(n.cx, n.cy));
    if (!goals.length && this.walkable(tx, ty)) goals = [{ cx: tx, cy: ty }];
    if (!goals.length) return null;
    const key = (x, y) => y * s.w + x;
    const goalSet = new Set(goals.map((g) => key(g.cx, g.cy)));
    if (goalSet.has(key(start.cx, start.cy))) return [start];

    const prev = new Map(), seen = new Set([key(start.cx, start.cy)]);
    let q = [start];
    while (q.length) {
      const nq = [];
      for (const c of q) {
        for (const d of this.neighbors4(c.cx, c.cy)) {
          const k = key(d.cx, d.cy);
          if (seen.has(k) || !this.walkable(d.cx, d.cy)) continue;
          seen.add(k); prev.set(k, c);
          if (goalSet.has(k)) {
            const path = [{ cx: d.cx, cy: d.cy }]; let p = c;
            while (p) { path.push({ cx: p.cx, cy: p.cy }); p = prev.get(key(p.cx, p.cy)); }
            return path.reverse();
          }
          nq.push(d);
        }
      }
      q = nq;
    }
    return null;
  }

  // ---- 場景切換 ----
  goTown() { this.active = "town"; this.player.fx = 8; this.player.fy = 12; this.player.dir = "up"; }
  goFarm() { this.active = "farm"; this.player.fx = 9; this.player.fy = 10; this.player.dir = "down"; }

  inv(item, n = 1) { this.inventory[item] = (this.inventory[item] || 0) + n; }
  invCount() { let c = 0; for (const k in this.inventory) c += this.inventory[k]; return c; }

  // ============================================================
  //  農場動作（對某格 cx,cy 用目前工具）
  //  tool: hoe / seed / water / interact / build(由 UI 另外處理)
  // ============================================================
  act(tool, cx, cy) {
    if (this.active !== "farm") return this.actTown(cx, cy);
    const t = this.tile(cx, cy);
    if (!t) return { msg: "" };

    // 太遠就不能操作
    if (Math.hypot(cx - this.player.fx, cy - this.player.fy) > 2.2) return { msg: "走近一點再操作" };

    // 先看互動：收成 / 撿產物 / 出貨箱
    if (tool === "interact") {
      // 出貨箱
      if (this.bin && cx === this.bin.x && cy === this.bin.y) return this.sellAll();
      // 撿動物產物（找主角附近有產物的動物）
      const a = this.animals.find((an) => an.hasProduct && Math.hypot(an.fx - this.player.fx, an.fy - this.player.fy) < 1.5);
      if (a) { this.inv(ANIMALS[a.type].product); a.hasProduct = false; return { msg: `撿到${ANIMALS[a.type].productName} ✋` }; }
      // 收成
      if (t.crop && t.crop.stage >= CROPS[t.crop.type].maxStage) {
        this.inv(t.crop.type); t.crop = null; t.g = "soil";
        return { msg: "收成 🌾" };
      }
      return { msg: "" };
    }
    if (tool === "hoe") {
      if (t.g === "grass" && !t.b) { t.g = "soil"; return { msg: "鋤地 🪓" }; }
      return { msg: "只能鋤草地" };
    }
    if (tool === "seed") {
      if ((t.g === "soil" || t.g === "soilwet") && !t.crop) {
        const def = CROPS[this.seedSel];
        if (this.money < def.seed) return { msg: "錢不夠買種子" };
        this.money -= def.seed;
        t.crop = { type: this.seedSel, stage: 0, watered: false };
        return { msg: `種下${def.name} 🌱` };
      }
      return { msg: "要在農地上種" };
    }
    if (tool === "water") {
      if (t.crop && !t.crop.watered) { t.crop.watered = true; t.g = "soilwet"; return { msg: "澆水 💧" }; }
      return { msg: "" };
    }
    return { msg: "" };
  }

  // 城鎮互動：走近店面點一下開商店
  actTown(cx, cy) {
    if (Math.hypot(cx - this.player.fx, cy - this.player.fy) > 2.5) return { msg: "走近商店再點" };
    for (const sh of this.shops) {
      if (cx >= sh.x - 1 && cx <= sh.x + sh.w && cy >= sh.y - 1 && cy <= sh.y + sh.h)
        return { openShop: sh.kind };
    }
    return { msg: "" };
  }

  // ---- 蓋畜舍 ----
  canBuild(type, cx, cy) {
    const def = BUILDINGS[type]; if (!def) return false;
    const { w, h } = def.footprint;
    for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) {
      const t = this.tileOf(this.farm, x, y);
      if (!t || t.g === "water" || t.b != null || t.crop) return false;
    }
    return true;
  }
  build(type, cx, cy) {
    const def = BUILDINGS[type];
    if (this.active !== "farm") return { msg: "只能在農場蓋" };
    if (!this.canBuild(type, cx, cy)) return { msg: `需要 ${def.footprint.w}×${def.footprint.h} 空地` };
    if (this.money < def.cost) return { msg: "資金不足" };
    this.money -= def.cost;
    const id = this.buildings.length;
    const b = { id, type, ox: cx, oy: cy, w: def.footprint.w, h: def.footprint.h };
    this.buildings.push(b);
    for (let y = cy; y < cy + b.h; y++) for (let x = cx; x < cx + b.w; x++)
      { const t = this.tileOf(this.farm, x, y); if (t) t.b = id; }
    return { msg: `蓋好${def.name} 🏠` };
  }

  // ---- 買動物 ----
  buyAnimal(type) {
    const def = ANIMALS[type];
    // 找一個能養這種動物的畜舍
    const home = this.buildings.find((b) => BUILDINGS[b.type].houses.includes(type));
    if (!home) return { msg: `要先蓋能養${def.name}的畜舍` };
    const count = this.animals.filter((a) => a.home === home.id).length;
    if (count >= 4) return { msg: "這個畜舍滿了" };
    if (this.money < def.buy) return { msg: "資金不足" };
    this.money -= def.buy;
    this.animals.push({
      type, home: home.id,
      fx: home.ox + Math.random() * home.w, fy: home.oy + home.h + 0.5,
      tx: home.ox + Math.random() * home.w, ty: home.oy + home.h + Math.random() * 2,
      hasProduct: false, t: 0,
    });
    return { msg: `買了一隻${def.name} 🐾` };
  }

  animalAt(cx, cy) {
    return this.animals.find((a) => Math.round(a.fx) === cx && Math.round(a.fy) === cy);
  }

  // ---- 賣出全部庫存 ----
  sellAll() {
    let total = 0, n = 0;
    for (const k in this.inventory) { total += (SELLABLE[k] || 0) * this.inventory[k]; n += this.inventory[k]; }
    if (n === 0) return { msg: "沒有東西可賣" };
    this.money += total; this.inventory = {};
    return { msg: `賣出 ${n} 件，+$${total} 💰` };
  }

  // ---- 換日（睡覺）----
  nextDay() {
    this.day += 1;
    // 作物：有澆水才長一階；長完重置澆水、地變回乾
    for (const t of this.farm.tiles) {
      if (t.crop && t.crop.watered) {
        t.crop.stage = Math.min(CROPS[t.crop.type].maxStage, t.crop.stage + 1);
        t.crop.watered = false;
      }
      if (t.g === "soilwet") t.g = "soil";
    }
    // 動物：產出產物
    for (const a of this.animals) a.hasProduct = true;
    return { msg: `第 ${this.day} 天 ☀️` };
  }

  // 動物隨機走動（每幀）
  updateAnimals(dt) {
    for (const a of this.animals) {
      const def = ANIMALS[a.type];
      a.t = (a.t || 0) - dt;
      if (a.t <= 0) { // 換目標
        const home = this.buildings.find((b) => b.id === a.home);
        a.tx = home.ox + Math.random() * home.w;
        a.ty = home.oy + home.h + Math.random() * 2.2;
        a.t = 1.5 + Math.random() * 2;
      }
      const dx = a.tx - a.fx, dy = a.ty - a.fy, d = Math.hypot(dx, dy);
      if (d > 0.05) { a.fx += (dx / d) * def.speed * dt; a.fy += (dy / d) * def.speed * dt; }
    }
  }

  // ---- 衣服 ----
  buyClothes(id) {
    const c = CLOTHES[id]; if (!c) return { msg: "" };
    if (this.ownedClothes.includes(id)) { this.equip(id); return { msg: "已擁有，已換上" }; }
    if (this.money < c.price) return { msg: "資金不足" };
    this.money -= c.price; this.ownedClothes.push(id); this.equip(id);
    return { msg: `買了${c.name}並換上 👕` };
  }
  equip(id) { if (this.ownedClothes.includes(id)) this.player.appearance.outfit = id; }

  // ---- 存讀檔 ----
  serialize() {
    return {
      v: 1, money: this.money, day: this.day, active: this.active,
      inventory: this.inventory, seedSel: this.seedSel,
      ownedClothes: this.ownedClothes, appearance: this.player.appearance,
      px: this.player.fx, py: this.player.fy, dir: this.player.dir,
      farmTiles: this.farm.tiles.map((t) => ({ g: t.g, crop: t.crop, b: t.b })),
      buildings: this.buildings,
      animals: this.animals.map((a) => ({ type: a.type, home: a.home, fx: a.fx, fy: a.fy, hasProduct: a.hasProduct })),
    };
  }
  load(data) {
    if (!data || data.v !== 1) return false;
    this.reset();
    this._needCreator = false;
    this.money = data.money; this.day = data.day; this.active = data.active || "farm";
    this.inventory = data.inventory || {}; this.seedSel = data.seedSel || "turnip";
    this.ownedClothes = data.ownedClothes || ["basic"];
    Object.assign(this.player.appearance, data.appearance || {});
    this.player.fx = data.px; this.player.fy = data.py; this.player.dir = data.dir || "down";
    if (Array.isArray(data.farmTiles))
      data.farmTiles.forEach((d, i) => { if (this.farm.tiles[i]) { this.farm.tiles[i].g = d.g; this.farm.tiles[i].crop = d.crop; this.farm.tiles[i].b = d.b; } });
    this.buildings = data.buildings || [];
    this.animals = (data.animals || []).map((a) => ({ ...a, tx: a.fx, ty: a.fy, t: 0 }));
    return true;
  }
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.serialize())); return true; } catch (e) { return false; } }
  loadStorage() { try { const r = localStorage.getItem(SAVE_KEY); return r ? this.load(JSON.parse(r)) : false; } catch (e) { return false; } }
  hasSave() { return !!localStorage.getItem(SAVE_KEY); }
}
