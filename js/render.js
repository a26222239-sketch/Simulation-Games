// ============================================================
// render.js — Phaser 繪製管理（Sprite 化，支援「有圖用圖、沒圖用程式佔位」）
//  ‧ 地面/獸欄沙地/圍欄：Graphics（變動才重畫）
//  ‧ 建築/樹/動物/遊客：Phaser GameObject（每幀同步位置與深度，正確遮擋）
//    - 若 assets/ 有對應 PNG（preload 載入成功）→ 用圖；動物/遊客有精靈圖則播放走路動畫
//    - 否則用程式生成的佔位貼圖（generateTexture），動物/遊客仍有上下彈跳
// ============================================================
import { TILE_W, TILE_H, GROUND, STRUCTURES, ANIMALS } from "./config.js";
import { gridToScreen } from "./iso.js";

const HW = TILE_W / 2, HH = TILE_H / 2;
const ASSET_VER = 19; // 換 assets 圖後 +1，自動破壞快取載新圖
const toInt = (h) => parseInt(h.slice(1), 16);
const ROW = { down: 0, left: 1, right: 2, up: 3 }; // 精靈圖方向列順序：前/左/右/後

function diamondPts(g, cx, cy) { g.fillPoints([{ x: cx, y: cy - HH }, { x: cx + HW, y: cy }, { x: cx, y: cy + HH }, { x: cx - HW, y: cy }], true); }

export class Renderer {
  // 在 scene.preload() 裡呼叫：嘗試載入玩家提供的圖（失敗不會中斷遊戲）
  // ★ 換了 assets 裡的圖後，把 ASSET_VER 加 1，就會自動載新圖(破壞快取)
  static preload(scene) {
    const v = "?v=" + ASSET_VER;
    scene.load.on("loaderror", () => {}); // 沒有對應圖檔就略過，改用佔位貼圖
    for (const id of Object.keys(ANIMALS)) {
      const fr = ANIMALS[id].frame || 64; // 單格像素依動物體型(獅子64基準)
      scene.load.spritesheet("animal_" + id, `assets/animal_${id}.png${v}`, { frameWidth: fr, frameHeight: fr });        // 走路(4方向×4格)
      scene.load.spritesheet("animal_" + id + "_idle", `assets/animal_${id}_idle.png${v}`, { frameWidth: fr, frameHeight: fr });   // 待機(單排，可選)
      scene.load.spritesheet("animal_" + id + "_eat", `assets/animal_${id}_eat.png${v}`, { frameWidth: fr, frameHeight: fr });   // 進食(單排)
      scene.load.spritesheet("animal_" + id + "_sleep", `assets/animal_${id}_sleep.png${v}`, { frameWidth: fr, frameHeight: fr }); // 睡覺(單排)
    }
    scene.load.spritesheet("visitor", `assets/visitor.png${v}`, { frameWidth: 48, frameHeight: 64 });
    scene.load.image("cafe", `assets/cafe.png${v}`);
    scene.load.image("souvenir", `assets/souvenir.png${v}`);
    scene.load.image("tree", `assets/tree.png${v}`);
  }

  constructor(scene, zoo) {
    this.scene = scene; this.zoo = zoo;
    this.groundG = scene.add.graphics().setDepth(0);
    this.shadowG = scene.add.graphics().setDepth(5);
    this.previewG = scene.add.graphics().setDepth(8);
    this.groundDirty = true;
    this.structSprites = new Map(); // structId -> GameObject
    this.animalSprites = new Map(); // animal obj -> sprite
    this.visitorSprites = new Map();// visitor obj -> sprite

    this.genTextures();
    this.makeAnims();
  }

  // 判斷某動物/遊客是否有「真的精靈圖」（多格）
  animated(key) { return this.scene.textures.exists(key) && this.scene.textures.get(key).frameTotal > 1; }
  hasImg(key) { return this.scene.textures.exists(key); }

  makeAnims() {
    const s = this.scene;
    // 走路：4 方向（每方向 4 格）
    const buildWalk = (key) => {
      if (!this.animated(key)) return;
      for (const dir in ROW) {
        const r = ROW[dir], name = key + "_" + dir;
        if (!s.anims.exists(name)) s.anims.create({ key: name, frames: s.anims.generateFrameNumbers(key, { start: r * 4, end: r * 4 + 3 }), frameRate: 7, repeat: -1 });
      }
    };
    // 單排動畫（進食/睡覺）：用整張的所有格
    const buildLoop = (key, fps) => {
      if (!this.animated(key)) return;
      if (!s.anims.exists(key)) s.anims.create({ key, frames: s.anims.generateFrameNumbers(key, {}), frameRate: fps, repeat: -1 });
    };
    // 進食：放慢，咀嚼(2↔3)反覆多次後停在第4格(骨頭)，只播一次(不循環)
    // 序列 0 +(1,2)x11 +3 = 24 格；frameRate 3 → 約 8 秒，之後停在骨頭(由 stateT 再停 ~2 秒)
    const buildEat = (key) => {
      if (!this.animated(key)) return;
      const n = s.textures.get(key).frameTotal - 1; // 去掉 __BASE
      let seq;
      if (n >= 4) { seq = [0]; for (let i = 0; i < 11; i++) seq.push(1, 2); seq.push(3); }
      if (!s.anims.exists(key)) s.anims.create({
        key, frames: s.anims.generateFrameNumbers(key, seq ? { frames: seq } : {}),
        frameRate: 3, repeat: 0,
      });
    };
    for (const id of Object.keys(ANIMALS)) {
      buildWalk("animal_" + id);
      buildLoop("animal_" + id + "_idle", 3);
      buildEat("animal_" + id + "_eat");
      buildLoop("animal_" + id + "_sleep", 3);
    }
    buildWalk("visitor");
  }

  // 生成佔位貼圖（沒有玩家圖時使用）
  genTextures() {
    const s = this.scene;
    for (const id of Object.keys(ANIMALS)) if (!this.hasImg("animal_" + id)) this.genAnimal(id);
    if (!this.hasImg("visitor")) this.genVisitor();
    if (!this.hasImg("cafe")) this.genBuilding("cafe");
    if (!this.hasImg("souvenir")) this.genBuilding("souvenir");
    if (!this.hasImg("tree")) this.genTree();
  }
  gfx() { return this.scene.make.graphics({ add: false }); }

  genAnimal(id) {
    const def = ANIMALS[id], g = this.gfx(), F = def.frame || 64, W = F, H = F, cx = F / 2, footY = F - 4, sz = def.size;
    const body = toInt(def.body), acc = toInt(def.accent);
    if (id === "penguin") {
      g.fillStyle(body, 1); g.fillEllipse(cx, footY - 16 * sz, 18 * sz, 26 * sz);
      g.fillStyle(0xf1f1f1, 1); g.fillEllipse(cx, footY - 13 * sz, 10 * sz, 18 * sz);
      g.fillStyle(0xe8a33a, 1); g.fillTriangle(cx + 7 * sz, footY - 22 * sz, cx + 13 * sz, footY - 20 * sz, cx + 7 * sz, footY - 18 * sz);
    } else {
      g.fillStyle(body, 1); g.fillEllipse(cx, footY - 11 * sz, 28 * sz, 17 * sz);
      if (id === "giraffe") { g.lineStyle(7 * sz, body, 1); g.lineBetween(cx + 8 * sz, footY - 14 * sz, cx + 14 * sz, footY - 34 * sz); }
      const hx = cx + (id === "giraffe" ? 14 * sz : 12 * sz), hy = footY - (id === "giraffe" ? 38 * sz : 16 * sz);
      g.fillStyle(body, 1); g.fillCircle(hx, hy, 7 * sz);
      if (id === "lion") { g.fillStyle(acc, 1); g.fillCircle(hx, hy, 10 * sz); g.fillStyle(body, 1); g.fillCircle(hx, hy, 7 * sz); }
      if (id === "elephant") { g.lineStyle(5 * sz, body, 1); g.lineBetween(hx + 4 * sz, hy, hx + 7 * sz, hy + 11 * sz); g.fillStyle(acc, 1); g.fillCircle(hx - 5 * sz, hy, 5 * sz); }
      if (id === "monkey") { g.fillStyle(acc, 1); g.fillCircle(hx, hy + 1, 4 * sz); }
      g.fillStyle(0x2a2a2a, 1); g.fillCircle(hx + 2 * sz, hy - 1, 1.5 * sz);
    }
    g.generateTexture("animal_" + id, W, H); g.destroy();
    return;
  }
  genVisitor() {
    const g = this.gfx(), x = 24, footY = 62, bH = 14, bW = 9, hR = 6;
    g.lineStyle(3, 0x3a4750, 1); g.lineBetween(x, footY - bH, x - 3, footY); g.lineBetween(x, footY - bH, x + 3, footY);
    g.fillStyle(0x64b5f6, 1); g.fillRoundedRect(x - bW / 2, footY - bH - bH, bW, bH + 2, 3);
    g.fillStyle(0xf1c9a5, 1); g.fillCircle(x, footY - bH - bH - hR + 2, hR);
    g.generateTexture("visitor", 48, 64); g.destroy();
  }
  genBuilding(id) {
    const def = STRUCTURES[id], w = def.footprint.w, h = def.footprint.h, g = this.gfx();
    const texW = (w + h) * HW, bh = 0.6 * TILE_W, texH = (w + h) * HH + bh + 4;
    // 以 south 角為基準放到貼圖底部中央
    const n = { x: 0, y: -HH }, e = { x: (w - 1) * HW + HW, y: (w - 1) * HH }, so = { x: (w - 1) * HW - (h - 1) * HW, y: (w - 1) * HH + (h - 1) * HH + HH }, wc = { x: -(h - 1) * HW - HW, y: (h - 1) * HH };
    const offx = texW / 2 - so.x, offy = texH - 2 - so.y;
    const P = (p) => ({ x: p.x + offx, y: p.y + offy });
    const N = P(n), E = P(e), S = P(so), W = P(wc);
    const col = toInt(def.color), side = toInt(def.side);
    g.fillStyle(side, 1); g.fillPoints([W, S, { x: S.x, y: S.y - bh }, { x: W.x, y: W.y - bh }], true);
    g.fillStyle(side, 0.85); g.fillPoints([S, E, { x: E.x, y: E.y - bh }, { x: S.x, y: S.y - bh }], true);
    g.fillStyle(col, 1); g.fillPoints([{ x: N.x, y: N.y - bh }, { x: E.x, y: E.y - bh }, { x: S.x, y: S.y - bh }, { x: W.x, y: W.y - bh }], true);
    g.generateTexture(id, Math.ceil(texW), Math.ceil(texH)); g.destroy();
  }
  genTree() {
    const g = this.gfx(), x = 32;
    g.fillStyle(toInt(STRUCTURES.tree.trunk), 1); g.fillRect(x - 3, 70, 6, 22);
    g.fillStyle(0x256b2f, 1); g.fillCircle(x, 60, 15);
    g.fillStyle(toInt(STRUCTURES.tree.color), 1); g.fillCircle(x - 5, 54, 12); g.fillCircle(x + 7, 57, 11);
    g.generateTexture("tree", 64, 96); g.destroy();
  }

  // 地面 + 獸欄沙地/圍欄（變動才重畫）
  redrawGround() {
    const g = this.groundG, zoo = this.zoo; g.clear();
    for (let cy = 0; cy < zoo.h; cy++) for (let cx = 0; cx < zoo.w; cx++) {
      const t = zoo.tiles[cy * zoo.w + cx], p = gridToScreen(cx, cy);
      g.fillStyle(toInt(GROUND[t.g].color), 1); diamondPts(g, p.x, p.y);
      g.lineStyle(1, 0x000000, 0.10); g.strokePoints([{ x: p.x, y: p.y - HH }, { x: p.x + HW, y: p.y }, { x: p.x, y: p.y + HH }, { x: p.x - HW, y: p.y }], true);
    }
    for (const sct of zoo.structures) if (sct.kind === "enclosure") this.drawPen(g, sct);
  }
  drawPen(g, s) {
    for (let y = s.oy; y < s.oy + s.h; y++) for (let x = s.ox; x < s.ox + s.w; x++) { const p = gridToScreen(x, y); g.fillStyle(toInt(STRUCTURES.enclosure.pen), 1); diamondPts(g, p.x, p.y); }
    const n = gridToScreen(s.ox, s.oy), e = gridToScreen(s.ox + s.w - 1, s.oy), so = gridToScreen(s.ox + s.w - 1, s.oy + s.h - 1), w = gridToScreen(s.ox, s.oy + s.h - 1);
    g.lineStyle(2.5, toInt(STRUCTURES.enclosure.side), 1);
    g.strokePoints([{ x: n.x, y: n.y - HH }, { x: e.x + HW, y: e.y }, { x: so.x, y: so.y + HH }, { x: w.x - HW, y: w.y }], true);
  }

  drawPreview(preview) {
    const g = this.previewG; g.clear();
    if (!preview || !preview.footprint) return;
    const { gx, gy, footprint: f, ok } = preview;
    for (let y = gy; y < gy + f.h; y++) for (let x = gx; x < gx + f.w; x++) {
      const p = gridToScreen(x, y);
      g.fillStyle(ok ? 0x7be08a : 0xe06a6a, 0.45); diamondPts(g, p.x, p.y);
    }
  }

  // 每幀：同步建築/樹/動物/遊客的 Sprite
  sync() {
    const zoo = this.zoo, scene = this.scene;
    this.shadowG.clear();

    // 建築 / 樹（少變動，用 id 對照增刪）
    const liveIds = new Set();
    for (const s of zoo.structures) {
      if (s.kind === "enclosure") continue; // 獸欄畫在地面層
      liveIds.add(s.id);
      let sp = this.structSprites.get(s.id);
      const key = s.kind === "tree" ? "tree" : s.kind;
      if (!sp) {
        const south = gridToScreen(s.ox + s.w - 1, s.oy + s.h - 1);
        sp = scene.add.image(south.x, south.y + HH, key).setOrigin(0.5, 1);
        sp.setDepth(s.ox + s.oy + 2);
        this.structSprites.set(s.id, sp);
      }
    }
    for (const [id, sp] of this.structSprites) if (!liveIds.has(id)) { sp.destroy(); this.structSprites.delete(id); }

    // 動物
    const seenA = new Set();
    for (const st of zoo.structures) if (st.kind === "enclosure") for (const a of st.animals) {
      seenA.add(a);
      const base = "animal_" + st.species;
      let sp = this.animalSprites.get(a);
      if (!sp) { sp = scene.add.sprite(0, 0, base).setOrigin(0.5, 1); this.animalSprites.set(a, sp); }
      // 依狀態挑貼圖（沒有對應圖就退回走路/待機站立）
      let key = base;
      if (a.state === "eat" && this.hasImg(base + "_eat")) key = base + "_eat";
      else if (a.state === "sleep") key = this.hasImg(base + "_sleep") ? base + "_sleep" : (this.hasImg(base + "_idle") ? base + "_idle" : base); // 沒有睡覺圖時退回盤坐
      else if (a.state === "idle" && this.hasImg(base + "_idle")) key = base + "_idle"; // 待機時一直播待機動畫(盤坐發呆)
      if (sp.texture.key !== key) sp.setTexture(key);
      // 進食/睡覺/待機是單方向圖(原圖朝左)；動物面向右時水平翻轉，左右都有
      sp.flipX = (key !== base && a.dir === "right");
      const p = gridToScreen(a.fx, a.fy);
      const bob = (!this.animated(base) && a.moving) ? Math.abs(Math.sin(a.frame * 1.6)) * 2 : 0;
      sp.setPosition(p.x, p.y - bob).setDepth(a.fx + a.fy);
      // 陰影規則：有「自帶陰影」精靈圖的動物(bakedShadow)不畫程式影子；其餘暫用程式影子直到有自帶陰影的圖
      if (!ANIMALS[st.species].bakedShadow) { const fr = ANIMALS[st.species].frame || 48; this.shadow(p.x, p.y, fr * 0.6, fr * 0.22); }
      if (key === base) { // 走路/待機（走路精靈圖）
        if (this.animated(base)) { if (a.state === "walk" && a.moving) sp.play(base + "_" + a.dir, true); else { sp.anims.stop(); sp.setFrame(ROW[a.dir] * 4); } }
      } else { // 進食/睡覺/打哈欠（單排動畫）
        if (this.animated(key)) {
          if (key === base + "_eat") { if (!a.eatStarted) { sp.play(key); a.eatStarted = true; } } // 只播一次，停在骨頭
          else sp.play(key, true); // 睡覺/哈欠循環
        } else sp.anims.stop();
      }
    }
    for (const [a, sp] of this.animalSprites) if (!seenA.has(a)) { sp.destroy(); this.animalSprites.delete(a); }

    // 遊客
    const seenV = new Set();
    for (const v of zoo.visitors) {
      seenV.add(v);
      let sp = this.visitorSprites.get(v);
      if (!sp) { sp = scene.add.sprite(0, 0, "visitor").setOrigin(0.5, 1); if (!this.animated("visitor")) sp.setTint(toInt(v.color)); this.visitorSprites.set(v, sp); }
      const p = gridToScreen(v.fx, v.fy);
      const bob = (!this.animated("visitor") && v.moving) ? Math.abs(Math.sin(v.frame * 1.6)) * 1.6 : 0;
      sp.setPosition(p.x, p.y - bob).setDepth(v.fx + v.fy);
      this.shadow(p.x, p.y, 14, 6);
      if (this.animated("visitor")) { if (v.moving) sp.play("visitor_" + v.dir, true); else { sp.anims.stop(); sp.setFrame(ROW[v.dir] * 4); } }
    }
    for (const [v, sp] of this.visitorSprites) if (!seenV.has(v)) { sp.destroy(); this.visitorSprites.delete(v); }
  }

  shadow(x, y, w, h) { this.shadowG.fillStyle(0x000000, 0.22); this.shadowG.fillEllipse(x, y, w, h); }
}
