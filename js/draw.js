// ============================================================
// draw.js — 用 Phaser Graphics 把世界畫出來（世界座標，相機交給 Phaser）
//  drawGround：地面 + 作物（變動時才重畫）
//  drawDynamic：高亮 + 建築 + 出貨箱 + 店面 + 動物 + 主角（每幀重畫、依深度排序）
// 之後有立繪時，可把這裡逐項改成 Phaser Sprite。
// ============================================================
import { TILE_W, TILE_H, GROUND, CROPS, BUILDINGS, ANIMALS, CLOTHES } from "./config.js";
import { gridToScreen } from "./iso.js";

const HW = TILE_W / 2, HH = TILE_H / 2;
const toInt = (hex) => parseInt(hex.slice(1), 16);
function shadeInt(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = Math.min(255, (n >> 16) + amt), g = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt);
  return (r << 16) | (g << 8) | b;
}
function diamond(cx, cy) {
  return [{ x: cx, y: cy - HH }, { x: cx + HW, y: cy }, { x: cx, y: cy + HH }, { x: cx - HW, y: cy }];
}

export function drawGround(g, world) {
  g.clear();
  const s = world.scene();
  for (let cy = 0; cy < s.h; cy++)
    for (let cx = 0; cx < s.w; cx++) {
      const t = s.tiles[cy * s.w + cx];
      const p = gridToScreen(cx, cy);
      const pts = diamond(p.x, p.y);
      g.fillStyle(toInt(GROUND[t.g].color), 1); g.fillPoints(pts, true);
      g.lineStyle(1, 0x000000, 0.12); g.strokePoints(pts, true);
      if (world.active === "farm" && t.crop) drawCrop(g, cx, cy, t.crop);
    }
}

function drawCrop(g, cx, cy, crop) {
  const def = CROPS[crop.type], p = gridToScreen(cx, cy);
  const h = 6 + (crop.stage / def.maxStage) * 18;
  g.lineStyle(2, 0x3f7d2e, 1); g.lineBetween(p.x, p.y, p.x, p.y - h);
  if (crop.stage >= def.maxStage) { g.fillStyle(toInt(def.color), 1); g.fillCircle(p.x, p.y - h, 5); }
  else { g.fillStyle(toInt(def.leaf), 1); g.fillEllipse(p.x - 3, p.y - h, 8, 5); g.fillEllipse(p.x + 3, p.y - h, 8, 5); }
}

export function drawDynamic(g, world) {
  g.clear();
  // 操作目標高亮
  const fc = world.player.targetCell || world.player.facingCell();
  if (fc) { const p = gridToScreen(fc.cx, fc.cy); const pts = diamond(p.x, p.y);
    g.fillStyle(0xffffff, 0.25); g.fillPoints(pts, true); g.lineStyle(2, 0xffffff, 0.8); g.strokePoints(pts, true); }

  const items = [];
  if (world.active === "farm") {
    for (const b of world.buildings) items.push({ d: b.ox + b.oy, fn: () => box(g, b.ox, b.oy, b.w, b.h, BUILDINGS[b.type].color, BUILDINGS[b.type].side, 0.6) });
    if (world.bin) items.push({ d: world.bin.x + world.bin.y, fn: () => box(g, world.bin.x, world.bin.y, 1, 1, "#a9784a", "#7a5230", 0.3) });
    for (const a of world.animals) items.push({ d: a.fx + a.fy, fn: () => drawAnimal(g, a) });
  } else {
    for (const sh of world.shops) items.push({ d: sh.x + sh.y, fn: () => box(g, sh.x, sh.y, sh.w, sh.h, sh.color, sh.side, 0.6) });
  }
  items.push({ d: world.player.fx + world.player.fy + 0.05, fn: () => drawAvatar(g, world.player) });
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.fn();
}

function box(g, ox, oy, w, h, colorHex, sideHex, hf) {
  const n = gridToScreen(ox, oy), e = gridToScreen(ox + w - 1, oy), s = gridToScreen(ox + w - 1, oy + h - 1), wc = gridToScreen(ox, oy + h - 1);
  const N = { x: n.x, y: n.y - HH }, E = { x: e.x + HW, y: e.y }, S = { x: s.x, y: s.y + HH }, W = { x: wc.x - HW, y: wc.y };
  const bh = hf * TILE_W;
  g.fillStyle(toInt(sideHex), 1); g.fillPoints([W, S, { x: S.x, y: S.y - bh }, { x: W.x, y: W.y - bh }], true);
  g.fillStyle(shadeInt(sideHex, 16), 1); g.fillPoints([S, E, { x: E.x, y: E.y - bh }, { x: S.x, y: S.y - bh }], true);
  g.fillStyle(toInt(colorHex), 1); g.fillPoints([{ x: N.x, y: N.y - bh }, { x: E.x, y: E.y - bh }, { x: S.x, y: S.y - bh }, { x: W.x, y: W.y - bh }], true);
}

function drawAnimal(g, a) {
  const def = ANIMALS[a.type], p = gridToScreen(a.fx, a.fy);
  g.fillStyle(0x000000, 0.22); g.fillEllipse(p.x, p.y, 18, 8);
  g.fillStyle(toInt(def.body), 1); g.fillEllipse(p.x, p.y - 7, 20, 14); g.fillCircle(p.x + 8, p.y - 10, 4.5);
  if (a.type === "chicken") { g.fillStyle(0xd9534f, 1); g.fillCircle(p.x + 8, p.y - 14, 2); }
  if (a.hasProduct) { g.fillStyle(0xffd54a, 1); g.fillCircle(p.x, p.y - 22, 3.5); }
}

function drawAvatar(g, pl) {
  const app = pl.appearance;
  const p = gridToScreen(pl.fx, pl.fy);
  const x = p.x, y = p.y;
  const shirt = toInt((CLOTHES[app.outfit] || CLOTHES.basic).shirt);
  g.fillStyle(0x000000, 0.28); g.fillEllipse(x, y, 20, 9);
  const bob = pl.moving ? Math.abs(Math.sin(pl.frame * 1.6)) * 2 : 0;
  const footY = y - bob, bodyH = 16, bodyW = 11, headR = 6;
  const sw = pl.moving ? Math.sin(pl.frame * 1.6) * 3 : 0;
  g.lineStyle(3, 0x3a4750, 1);
  g.lineBetween(x, footY - bodyH, x - 3 + sw, footY);
  g.lineBetween(x, footY - bodyH, x + 3 - sw, footY);
  g.fillStyle(shirt, 1); g.fillRoundedRect(x - bodyW / 2, footY - bodyH - bodyH, bodyW, bodyH + 2, 3);
  const hx = x, hy = footY - bodyH - bodyH - headR + 2;
  g.fillStyle(toInt(app.skin), 1); g.fillCircle(hx, hy, headR);
  // 頭髮（上半圈）
  g.fillStyle(toInt(app.hairColor), 1); g.slice(hx, hy, headR * 1.08, Math.PI, Math.PI * 2, false); g.fillPath();
  if (pl.dir !== "up") {
    g.fillStyle(0x3a2c22, 1);
    const ex = pl.dir === "left" ? -2 : pl.dir === "right" ? 2 : 0;
    g.fillCircle(hx - 2.4 + ex, hy + 1, 1.3); g.fillCircle(hx + 2.4 + ex, hy + 1, 1.3);
  }
}
