// ============================================================
// draw.js — 用 Phaser Graphics 畫動物園（世界座標，相機交給 Phaser）
//  drawGround：地面（變動才重畫）
//  drawDynamic：獸欄/商店/樹木/動物/遊客（每幀、依深度排序）＋放置預覽
// 之後有立繪：把動物改成 this.add.sprite + this.anims 即可。
// ============================================================
import { TILE_W, TILE_H, GROUND, STRUCTURES, ANIMALS } from "./config.js";
import { gridToScreen } from "./iso.js";

const HW = TILE_W / 2, HH = TILE_H / 2;
const toInt = (h) => parseInt(h.slice(1), 16);
function shadeInt(h, amt) { const n = parseInt(h.slice(1), 16); const r = Math.min(255, (n >> 16) + amt), g = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt); return (r << 16) | (g << 8) | b; }
function diamond(cx, cy) { return [{ x: cx, y: cy - HH }, { x: cx + HW, y: cy }, { x: cx, y: cy + HH }, { x: cx - HW, y: cy }]; }

export function drawGround(g, zoo) {
  g.clear();
  for (let cy = 0; cy < zoo.h; cy++) for (let cx = 0; cx < zoo.w; cx++) {
    const t = zoo.tiles[cy * zoo.w + cx], p = gridToScreen(cx, cy), pts = diamond(p.x, p.y);
    g.fillStyle(toInt(GROUND[t.g].color), 1); g.fillPoints(pts, true);
    g.lineStyle(1, 0x000000, 0.10); g.strokePoints(pts, true);
  }
}

export function drawDynamic(g, zoo, preview) {
  g.clear();
  // 放置預覽
  if (preview && preview.footprint) {
    const { gx, gy, footprint: f, ok } = preview;
    for (let y = gy; y < gy + f.h; y++) for (let x = gx; x < gx + f.w; x++) {
      const p = gridToScreen(x, y), pts = diamond(p.x, p.y);
      g.fillStyle(ok ? 0x7be08a : 0xe06a6a, 0.45); g.fillPoints(pts, true);
      g.lineStyle(1, 0xffffff, 0.6); g.strokePoints(pts, true);
    }
  }

  const items = [];
  for (const s of zoo.structures) {
    if (s.kind === "enclosure") {
      items.push({ d: s.ox + s.oy - 0.5, fn: () => pen(g, s) });
      for (const a of s.animals) items.push({ d: a.fx + a.fy, fn: () => animal(g, s.species, a) });
    } else if (s.kind === "tree") {
      items.push({ d: s.ox + s.oy, fn: () => tree(g, s) });
    } else {
      items.push({ d: s.ox + s.oy, fn: () => box(g, s.ox, s.oy, s.w, s.h, STRUCTURES[s.kind].color, STRUCTURES[s.kind].side, 0.6) });
    }
  }
  for (const v of zoo.visitors) items.push({ d: v.fx + v.fy + 0.05, fn: () => visitor(g, v) });
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.fn();
}

// 獸欄：沙地 + 圍欄邊框
function pen(g, s) {
  const def = STRUCTURES.enclosure;
  for (let y = s.oy; y < s.oy + s.h; y++) for (let x = s.ox; x < s.ox + s.w; x++) {
    const p = gridToScreen(x, y); g.fillStyle(toInt(def.pen), 1); g.fillPoints(diamond(p.x, p.y), true);
  }
  // 邊框（四角連線）
  const n = gridToScreen(s.ox, s.oy), e = gridToScreen(s.ox + s.w - 1, s.oy), so = gridToScreen(s.ox + s.w - 1, s.oy + s.h - 1), w = gridToScreen(s.ox, s.oy + s.h - 1);
  const N = { x: n.x, y: n.y - HH }, E = { x: e.x + HW, y: e.y }, S = { x: so.x, y: so.y + HH }, W = { x: w.x - HW, y: w.y };
  g.lineStyle(2.5, toInt(def.side), 1);
  g.beginPath(); g.moveTo(N.x, N.y); g.lineTo(E.x, E.y); g.lineTo(S.x, S.y); g.lineTo(W.x, W.y); g.closePath(); g.strokePath();
}

function box(g, ox, oy, w, h, colorHex, sideHex, hf) {
  const n = gridToScreen(ox, oy), e = gridToScreen(ox + w - 1, oy), s = gridToScreen(ox + w - 1, oy + h - 1), wc = gridToScreen(ox, oy + h - 1);
  const N = { x: n.x, y: n.y - HH }, E = { x: e.x + HW, y: e.y }, S = { x: s.x, y: s.y + HH }, W = { x: wc.x - HW, y: wc.y };
  const bh = hf * TILE_W;
  g.fillStyle(toInt(sideHex), 1); g.fillPoints([W, S, { x: S.x, y: S.y - bh }, { x: W.x, y: W.y - bh }], true);
  g.fillStyle(shadeInt(sideHex, 16), 1); g.fillPoints([S, E, { x: E.x, y: E.y - bh }, { x: S.x, y: S.y - bh }], true);
  g.fillStyle(toInt(colorHex), 1); g.fillPoints([{ x: N.x, y: N.y - bh }, { x: E.x, y: E.y - bh }, { x: S.x, y: S.y - bh }, { x: W.x, y: W.y - bh }], true);
}

function tree(g, s) {
  const def = STRUCTURES.tree, p = gridToScreen(s.ox, s.oy);
  g.fillStyle(0x000000, 0.2); g.fillEllipse(p.x, p.y, 18, 8);
  g.fillStyle(toInt(def.trunk), 1); g.fillRect(p.x - 2.5, p.y - 18, 5, 18);
  g.fillStyle(0x256b2f, 1); g.fillCircle(p.x, p.y - 22, 13);
  g.fillStyle(toInt(def.color), 1); g.fillCircle(p.x - 4, p.y - 26, 10); g.fillCircle(p.x + 6, p.y - 24, 9);
}

// 動物（會走動的 2.5D 動圖：身體+頭+腿擺動，依種類加特徵）
function animal(g, species, a) {
  const def = ANIMALS[species], p = gridToScreen(a.fx, a.fy), sz = def.size;
  const body = toInt(def.body), acc = toInt(def.accent);
  g.fillStyle(0x000000, 0.22); g.fillEllipse(p.x, p.y, 20 * sz, 8 * sz);
  const bob = a.moving ? Math.abs(Math.sin(a.frame * 1.6)) * 2 : 0;
  const cy = p.y - bob;
  // 腿
  const sw = a.moving ? Math.sin(a.frame * 1.6) * 2.5 : 0;
  g.lineStyle(2.5 * sz, acc, 1);
  g.lineBetween(p.x - 6 * sz, cy - 4, p.x - 6 * sz + sw, p.y); g.lineBetween(p.x + 6 * sz, cy - 4, p.x + 6 * sz - sw, p.y);
  if (species === "penguin") {
    g.fillStyle(body, 1); g.fillEllipse(p.x, cy - 12 * sz, 16 * sz, 22 * sz);
    g.fillStyle(0xf1f1f1, 1); g.fillEllipse(p.x, cy - 10 * sz, 9 * sz, 15 * sz);
    g.fillStyle(0xe8a33a, 1); g.fillTriangle(p.x + 6 * sz, cy - 18 * sz, p.x + 12 * sz, cy - 16 * sz, p.x + 6 * sz, cy - 14 * sz);
    return;
  }
  // 身體
  g.fillStyle(body, 1); g.fillEllipse(p.x, cy - 9 * sz, 24 * sz, 15 * sz);
  // 長頸鹿脖子
  if (species === "giraffe") { g.lineStyle(6 * sz, body, 1); g.lineBetween(p.x + 8 * sz, cy - 12 * sz, p.x + 14 * sz, cy - 30 * sz); }
  // 頭
  const hx = p.x + (species === "giraffe" ? 14 * sz : 11 * sz), hy = cy - (species === "giraffe" ? 32 * sz : 14 * sz);
  g.fillStyle(body, 1); g.fillCircle(hx, hy, 6 * sz);
  if (species === "lion") { g.fillStyle(acc, 1); g.fillCircle(hx, hy, 8.5 * sz); g.fillStyle(body, 1); g.fillCircle(hx, hy, 6 * sz); }
  if (species === "elephant") { g.lineStyle(4 * sz, body, 1); g.lineBetween(hx + 3 * sz, hy, hx + 6 * sz, hy + 9 * sz); g.fillStyle(acc, 1); g.fillCircle(hx - 4 * sz, hy, 4 * sz); }
  if (species === "monkey") { g.fillStyle(acc, 1); g.fillCircle(hx, hy + 1 * sz, 3.5 * sz); }
  // 眼睛
  g.fillStyle(0x2a2a2a, 1); g.fillCircle(hx + 2 * sz, hy - 1 * sz, 1.3 * sz);
}

function visitor(g, v) {
  const p = gridToScreen(v.fx, v.fy), x = p.x, y = p.y, shirt = toInt(v.color);
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y, 16, 7);
  const bob = v.moving ? Math.abs(Math.sin(v.frame * 1.6)) * 1.6 : 0, footY = y - bob;
  const bH = 13, bW = 8, hR = 5, sw = v.moving ? Math.sin(v.frame * 1.6) * 2.5 : 0;
  g.lineStyle(2.5, 0x3a4750, 1);
  g.lineBetween(x, footY - bH, x - 2.5 + sw, footY); g.lineBetween(x, footY - bH, x + 2.5 - sw, footY);
  g.fillStyle(shirt, 1); g.fillRoundedRect(x - bW / 2, footY - bH - bH, bW, bH + 2, 3);
  g.fillStyle(0xf1c9a5, 1); g.fillCircle(x, footY - bH - bH - hR + 2, hR);
}
