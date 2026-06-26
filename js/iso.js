// ============================================================
// iso.js — 等距(2.5D)座標換算工具
// 「格子座標 (gx, gy)」<-> 「螢幕像素座標 (sx, sy)」的互相轉換。
// 這是整個斜角畫面的數學核心。
// ============================================================
import { TILE_W, TILE_H } from "./config.js";

// 格子座標 -> 螢幕座標（不含相機位移，相機在 render 時再加）
// 經典等距公式：往 x 走會往右下，往 y 走會往左下。
export function gridToScreen(gx, gy) {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

// 螢幕座標 -> 格子座標（上面公式的反運算）
// 傳進來的 sx, sy 必須是「已經扣掉相機位移、除掉縮放」後的座標。
export function screenToGrid(sx, sy) {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return {
    gx: Math.floor((a + b) / 2),
    gy: Math.floor((b - a) / 2),
  };
}
