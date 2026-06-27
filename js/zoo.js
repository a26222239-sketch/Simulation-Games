// ============================================================
// zoo.js — 動物園世界狀態與經營邏輯（上帝視角）
// 放置：步道/獸欄/咖啡廳/紀念品店/樹木。
// 遊客：從入口進場(付門票)→沿步道走到獸欄看動物/到商店消費→離場。
// 動物：在自己的獸欄內走動。畫面在 draw.js。
// ============================================================
import { ZOO_W, ZOO_H, GROUND, STRUCTURES, ANIMALS, VISITOR, START_MONEY, SAVE_KEY, DAY_SEC, TICKET } from "./config.js";

const rnd = (r) => r[0] + Math.random() * (r[1] - r[0]);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Zoo {
  constructor() { this.reset(); }

  reset() {
    this.w = ZOO_W; this.h = ZOO_H;
    this.tiles = [];
    for (let i = 0; i < this.w * this.h; i++) this.tiles.push({ g: "grass", b: null });
    this.money = START_MONEY;
    this.day = 1; this.timeAcc = 0; this.spawnAcc = 0;
    this.structures = []; this.visitors = []; this.served = 0;
    this.nextId = 0;

    // 入口廣場（底部中央）+ 一段步道作起點
    this.entrance = { cx: Math.floor(this.w / 2), cy: this.h - 1 };
    this.setG(this.entrance.cx, this.entrance.cy, "plaza");
    this.setG(this.entrance.cx - 1, this.h - 1, "plaza");
    for (let y = this.h - 2; y >= this.h - 7; y--) this.setG(this.entrance.cx, y, "path");

    // 預設先放一個獅子獸欄 + 一間咖啡廳，讓遊客馬上會來（示範）
    const px = this.entrance.cx;
    this.place("enclosure", px - 4, this.h - 6, "lion");
    for (let y = this.h - 6; y <= this.h - 4; y++) this.setG(px - 1, y, "path"); // 通到獸欄旁
    this.place("cafe", px + 2, this.h - 6);
    this.setG(px + 1, this.h - 5, "path");

    this.camInited = false;
  }

  inBounds(cx, cy) { return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h; }
  tile(cx, cy) { return this.inBounds(cx, cy) ? this.tiles[cy * this.w + cx] : null; }
  setG(cx, cy, g) { const t = this.tile(cx, cy); if (t) t.g = g; }
  // 遊客可走：步道/廣場且無設施
  walkable(cx, cy) { const t = this.tile(cx, cy); return !!t && (t.g === "path" || t.g === "plaza") && t.b == null; }

  // ---- 放置 ----
  areaFree(cx, cy, w, h) {
    for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) {
      const t = this.tile(x, y);
      if (!t || t.b != null || t.g === "water") return false;
    }
    return true;
  }
  setPath(cx, cy) {
    const t = this.tile(cx, cy);
    if (!t) return { msg: "" };
    if (t.b != null) return { msg: "這裡有設施" };
    if (t.g === "water") return { msg: "不能在水上鋪路" };
    if (this.money < 5) return { msg: "資金不足" };
    if (t.g !== "path") { this.money -= 5; t.g = "path"; }
    return { ok: true };
  }
  place(kind, cx, cy, species) {
    const def = STRUCTURES[kind];
    const { w, h } = def.footprint;
    if (!this.inBounds(cx, cy) || !this.inBounds(cx + w - 1, cy + h - 1)) return { msg: "超出範圍" };
    if (!this.areaFree(cx, cy, w, h)) return { msg: `需要 ${w}×${h} 空地` };
    let cost = def.cost;
    if (kind === "enclosure") cost += ANIMALS[species].buy * 2; // 含 2 隻動物
    if (this.money < cost) return { msg: "資金不足" };
    this.money -= cost;
    const id = this.nextId++;
    const st = { id, kind, ox: cx, oy: cy, w, h, species: species || null, animals: [] };
    if (kind === "enclosure") for (let i = 0; i < 2; i++) st.animals.push(this.makeAnimal(st));
    this.structures.push(st);
    for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) { const t = this.tile(x, y); t.b = id; }
    return { ok: true, msg: `蓋好${def.name}${species ? "（" + ANIMALS[species].name + "）" : ""}` };
  }
  bulldoze(cx, cy) {
    const t = this.tile(cx, cy);
    if (!t) return { msg: "" };
    if (t.b != null) {
      const idx = this.structures.findIndex((s) => s.id === t.b);
      if (idx >= 0) {
        const s = this.structures[idx];
        for (let y = s.oy; y < s.oy + s.h; y++) for (let x = s.ox; x < s.ox + s.w; x++) { const tt = this.tile(x, y); if (tt) tt.b = null; }
        this.structures.splice(idx, 1);
        return { ok: true, msg: "已拆除" };
      }
    }
    if (t.g === "path") { t.g = "grass"; return { ok: true, msg: "拆除步道" }; }
    return { msg: "這裡沒東西" };
  }
  buyAnimal(structId) {
    const s = this.structures.find((x) => x.id === structId);
    if (!s || s.kind !== "enclosure") return { msg: "請選一個獸欄" };
    if (s.animals.length >= 5) return { msg: "獸欄滿了" };
    const cost = ANIMALS[s.species].buy;
    if (this.money < cost) return { msg: "資金不足" };
    this.money -= cost; s.animals.push(this.makeAnimal(s));
    return { ok: true, msg: `加了一隻${ANIMALS[s.species].name}` };
  }
  makeAnimal(st) {
    const a = { fx: st.ox + Math.random() * st.w, fy: st.oy + Math.random() * st.h,
      tx: 0, ty: 0, state: "walk", stateT: 0, frame: 0, animTime: 0, moving: false, dir: "down",
      yawning: false, yawnDur: 0, yawnT: 3 + Math.random() * 6, eatStarted: false };
    this.startWander(st, a);
    return a;
  }
  startWander(st, a) {
    a.tx = st.ox + Math.random() * (st.w - 0.2);
    a.ty = st.oy + Math.random() * (st.h - 0.2);
    a.state = "walk"; a.stateT = 6; // 最多走 6 秒到不了就改做別的
  }
  // 抵達後隨機選活動：再走 / 待機 / 進食 / 睡覺
  pickActivity(st, a) {
    const r = Math.random();
    if (r < 0.40) this.startWander(st, a);
    else if (r < 0.65) { a.state = "idle"; a.stateT = 2 + Math.random() * 3; }
    else if (r < 0.85) { a.state = "eat"; a.stateT = 4.5 + Math.random() * 2.5; a.eatStarted = false; } // 夠長讓骨頭停留
    else { a.state = "sleep"; a.stateT = 5 + Math.random() * 5; }
  }

  // 魅力（影響遊客生成速度）
  attraction() {
    let a = 0;
    for (const s of this.structures) {
      if (s.kind === "enclosure") a += ANIMALS[s.species].popularity * s.animals.length;
      else if (s.kind === "tree") a += STRUCTURES.tree.attraction;
      else a += 2;
    }
    return a;
  }

  // ---- 尋路（遊客走步道）----
  neighbors(cx, cy) { return [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => ({ cx: cx + dx, cy: cy + dy })); }
  bfs(start, goalSet) {
    const key = (x, y) => y * this.w + x;
    if (goalSet.has(key(start.cx, start.cy))) return [start];
    const prev = new Map(), seen = new Set([key(start.cx, start.cy)]); let q = [start];
    while (q.length) { const nq = [];
      for (const c of q) for (const d of this.neighbors(c.cx, c.cy)) {
        const k = key(d.cx, d.cy);
        if (seen.has(k) || !this.walkable(d.cx, d.cy)) continue;
        seen.add(k); prev.set(k, c);
        if (goalSet.has(k)) { const path = [d]; let p = c; while (p) { path.push(p); p = prev.get(key(p.cx, p.cy)); } return path.reverse(); }
        nq.push(d);
      } q = nq; }
    return null;
  }
  // 設施旁可站的步道格集合
  adjGoals(s) {
    const key = (x, y) => y * this.w + x; const set = new Set();
    for (let y = s.oy - 1; y <= s.oy + s.h; y++) for (let x = s.ox - 1; x <= s.ox + s.w; x++) {
      const inside = x >= s.ox && x < s.ox + s.w && y >= s.oy && y < s.oy + s.h;
      const orth = (x >= s.ox && x < s.ox + s.w) || (y >= s.oy && y < s.oy + s.h);
      if (inside || !orth) continue;
      if (this.walkable(x, y)) set.add(key(x, y));
    }
    return set;
  }

  // ---- 主更新 ----
  update(dt) {
    // 換日：扣維護費
    this.timeAcc += dt;
    if (this.timeAcc >= DAY_SEC) {
      this.timeAcc -= DAY_SEC; this.day += 1;
      let upkeep = 0;
      for (const s of this.structures) {
        if (s.kind === "enclosure") upkeep += s.animals.length * 8;
        else if (s.kind === "cafe" || s.kind === "souvenir") upkeep += 10;
      }
      this.money -= upkeep;
    }
    // 生成遊客（魅力越高越快）
    this.spawnAcc += dt;
    const interval = Math.max(0.6, VISITOR.baseSpawnSec / (1 + this.attraction() * 0.04));
    if (this.spawnAcc >= interval) { this.spawnAcc = 0; this.spawn(); }
    // 更新遊客 / 動物
    for (const v of this.visitors) this.updVisitor(v, dt);
    this.visitors = this.visitors.filter((v) => !v.done);
    for (const s of this.structures) if (s.kind === "enclosure") for (const a of s.animals) this.updAnimal(s, a, dt);
  }

  spawn() {
    if (this.visitors.length >= VISITOR.maxInPark) return;
    if (!this.walkable(this.entrance.cx, this.entrance.cy)) return;
    this.money += TICKET; this.served += 1;
    const v = { fx: this.entrance.cx, fy: this.entrance.cy, path: null, pi: 1, state: "idle",
      wait: 0, dir: "up", frame: 0, animTime: 0, moving: false, color: pick(VISITOR.colors), visits: 1 + Math.floor(Math.random() * 3) };
    this.visitors.push(v);
    this.planNext(v);
  }
  cell(v) { return { cx: Math.round(v.fx), cy: Math.round(v.fy) }; }
  planNext(v) {
    // 隨機挑一個設施去逛；走不到就離場
    const targets = this.structures.filter((s) => s.kind === "enclosure" || s.kind === "cafe" || s.kind === "souvenir");
    if (v.visits <= 0 || targets.length === 0) return this.goLeave(v);
    const s = pick(targets);
    const goals = this.adjGoals(s);
    const path = goals.size ? this.bfs(this.cell(v), goals) : null;
    if (!path) return this.goLeave(v);
    v.path = path; v.pi = path.length > 1 ? 1 : 0; v.target = s; v.state = "move";
  }
  goLeave(v) {
    v.target = null;
    const path = this.bfs(this.cell(v), new Set([this.entrance.cy * this.w + this.entrance.cx]));
    if (!path) { v.done = true; return; }
    v.path = path; v.pi = path.length > 1 ? 1 : 0; v.state = "leave";
  }
  updVisitor(v, dt) {
    v.animTime += dt;
    if (v.state === "view" || v.state === "buy") {
      v.moving = false; v.wait -= dt;
      if (v.wait <= 0) { v.visits -= 1; this.planNext(v); }
      return;
    }
    if (!v.path || v.pi >= v.path.length) { this.arrive(v); return; }
    v.moving = true; v.frame = Math.floor(v.animTime / 0.13) % 4;
    const tgt = v.path[v.pi], dx = tgt.cx - v.fx, dy = tgt.cy - v.fy, d = Math.hypot(dx, dy);
    this.faceWorld(v, dx, dy);
    const step = VISITOR.speed * dt;
    if (d <= step || d < 0.001) { v.fx = tgt.cx; v.fy = tgt.cy; v.pi += 1; if (v.pi >= v.path.length) this.arrive(v); }
    else { v.fx += dx / d * step; v.fy += dy / d * step; }
  }
  arrive(v) {
    v.moving = false; v.path = null;
    if (v.state === "leave") { v.done = true; return; }
    const s = v.target;
    if (s && s.kind === "enclosure") { v.state = "view"; v.wait = rnd(VISITOR.viewSec); }
    else if (s) { v.state = "buy"; v.wait = rnd(VISITOR.buySec); this.money += STRUCTURES[s.kind].sale; }
    else this.planNext(v);
  }
  faceWorld(o, dx, dy) {
    const sdx = dx - dy, sdy = dx + dy;
    if (Math.abs(sdx) >= Math.abs(sdy)) o.dir = sdx > 0 ? "right" : "left";
    else o.dir = sdy > 0 ? "down" : "up";
  }
  updAnimal(s, a, dt) {
    a.animTime += dt; a.stateT -= dt;
    if (a.state === "walk") {
      const def = ANIMALS[s.species], dx = a.tx - a.fx, dy = a.ty - a.fy, d = Math.hypot(dx, dy);
      if (d > 0.06 && a.stateT > 0) {
        a.moving = true; a.frame = Math.floor(a.animTime / 0.16) % 4; this.faceWorld(a, dx, dy);
        a.fx += dx / d * def.speed * dt; a.fy += dy / d * def.speed * dt;
      } else { a.moving = false; this.pickActivity(s, a); }     // 到達或逾時 → 選下一個活動
    } else {
      a.moving = false; a.frame = Math.floor(a.animTime / 0.28) % 4; // 進食/睡覺的動畫格
      if (a.state === "idle") {
        // 待機大多時間發呆站著，偶爾才打一次哈欠
        if (a.yawning) { a.yawnDur -= dt; if (a.yawnDur <= 0) a.yawning = false; }
        else { a.yawnT -= dt; if (a.yawnT <= 0) { a.yawning = true; a.yawnDur = 1.6; a.yawnT = 6 + Math.random() * 6; } }
      }
      if (a.stateT <= 0) this.startWander(s, a);
    }
  }

  // ---- 存讀檔（遊客/動物即時狀態不存，重建）----
  serialize() {
    return { v: 1, w: this.w, h: this.h, money: this.money, day: this.day, served: this.served, nextId: this.nextId,
      tiles: this.tiles.map((t) => ({ g: t.g, b: t.b })),
      structures: this.structures.map((s) => ({ id: s.id, kind: s.kind, ox: s.ox, oy: s.oy, w: s.w, h: s.h, species: s.species, n: s.animals.length })) };
  }
  load(data) {
    if (!data || data.v !== 1 || data.w !== this.w || data.h !== this.h) return false;
    this.reset();
    this.money = data.money; this.day = data.day; this.served = data.served || 0; this.nextId = data.nextId || 0;
    this.tiles = data.tiles.map((t) => ({ g: t.g, b: t.b }));
    this.structures = data.structures.map((s) => {
      const st = { ...s, animals: [] };
      if (s.kind === "enclosure") for (let i = 0; i < (s.n || 0); i++) st.animals.push(this.makeAnimal(st));
      delete st.n; return st;
    });
    this.visitors = []; this.timeAcc = 0; this.spawnAcc = 0;
    return true;
  }
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.serialize())); return true; } catch (e) { return false; } }
  loadStorage() { try { const r = localStorage.getItem(SAVE_KEY); return r ? this.load(JSON.parse(r)) : false; } catch (e) { return false; } }
  hasSave() { return !!localStorage.getItem(SAVE_KEY); }
}
