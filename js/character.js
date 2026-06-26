// ============================================================
// character.js — 角色外觀繪製（捏臉/換裝的視覺）
//  drawPortrait：捏臉/衣櫃介面用的「正面半身立繪」
//  drawAvatar  ：世界裡走動的小人（同色系簡化版）
// 都用程式畫，之後可換成 GPT 立繪(見 config.js ART_NOTE)。
// ============================================================
import { CLOTHES } from "./config.js";

// 依髮型畫頭髮（front：正面用較大；給世界小人用較小）
function drawHair(ctx, x, y, r, style, color, front) {
  ctx.fillStyle = color;
  if (style === "short") {
    ctx.beginPath(); ctx.arc(x, y, r * 1.12, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - r * 1.12, y - 2, r * 2.24, r * 0.5);
  } else if (style === "long") {
    ctx.beginPath(); ctx.arc(x, y, r * 1.12, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - r * 1.2, y - 2, r * 2.4, r * (front ? 2.2 : 1.4)); // 長髮垂下
  } else if (style === "bun") {
    ctx.beginPath(); ctx.arc(x, y, r * 1.12, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - r * 1.2, r * 0.5, 0, Math.PI * 2); ctx.fill(); // 頭頂包包
  } else { // spiky
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.45, y - r * 0.2);
      ctx.lineTo(x + i * r * 0.45 - r * 0.18, y - r * 1.4);
      ctx.lineTo(x + i * r * 0.45 + r * 0.22, y - r * 0.2);
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, r * 1.05, Math.PI, 0); ctx.fill();
  }
}

// 正面半身立繪（捏臉/衣櫃預覽）。cx,cy 是腳底中心，s 是縮放
export function drawPortrait(ctx, cx, cy, s, app) {
  const shirt = (CLOTHES[app.outfit] || CLOTHES.basic).shirt;
  const headR = 26 * s;
  const headY = cy - 70 * s;
  // 身體（上衣）
  ctx.fillStyle = shirt;
  roundRect(ctx, cx - 34 * s, headY + headR * 0.4, 68 * s, 70 * s, 14 * s); ctx.fill();
  // 脖子
  ctx.fillStyle = app.skin;
  ctx.fillRect(cx - 8 * s, headY + headR * 0.4, 16 * s, 14 * s);
  // 頭
  ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fillStyle = app.skin; ctx.fill();
  // 頭髮
  drawHair(ctx, cx, headY, headR, app.hairStyle, app.hairColor, true);
  // 臉：眼睛、嘴
  ctx.fillStyle = "#3a2c22";
  ctx.beginPath(); ctx.arc(cx - 9 * s, headY + 2 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 9 * s, headY + 2 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b5635a"; ctx.lineWidth = 2 * s;
  ctx.beginPath(); ctx.arc(cx, headY + 10 * s, 6 * s, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
}

// 世界裡的小人。sx,sy 腳底螢幕座標，z 縮放
export function drawAvatar(ctx, sx, sy, z, app, dir, frame, moving) {
  const shirt = (CLOTHES[app.outfit] || CLOTHES.basic).shirt;
  // 影子
  ctx.beginPath(); ctx.ellipse(sx, sy, 10 * z, 4.5 * z, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fill();

  const bob = moving ? Math.abs(Math.sin(frame * 1.6)) * 2 * z : 0;
  const footY = sy - bob;
  const bodyH = 16 * z, bodyW = 11 * z, headR = 6 * z;
  // 腿
  const sw = moving ? Math.sin(frame * 1.6) * 3 * z : 0;
  ctx.strokeStyle = "#3a4750"; ctx.lineWidth = 3 * z; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(sx, footY - bodyH); ctx.lineTo(sx - 3 * z + sw, footY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx, footY - bodyH); ctx.lineTo(sx + 3 * z - sw, footY); ctx.stroke();
  // 身體
  roundRect(ctx, sx - bodyW / 2, footY - bodyH - bodyH, bodyW, bodyH + 2 * z, 3 * z);
  ctx.fillStyle = shirt; ctx.fill();
  // 頭
  const hx = sx, hy = footY - bodyH - bodyH - headR + 2 * z;
  ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI * 2); ctx.fillStyle = app.skin; ctx.fill();
  // 頭髮（小）
  drawHair(ctx, hx, hy, headR, app.hairStyle, app.hairColor, false);
  // 面向：背對時把臉(無五官)；其餘畫眼睛
  if (dir !== "up") {
    ctx.fillStyle = "#3a2c22";
    const ex = dir === "left" ? -2 * z : dir === "right" ? 2 * z : 0;
    ctx.beginPath(); ctx.arc(hx - 2.4 * z + ex, hy + 1 * z, 1.3 * z, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 2.4 * z + ex, hy + 1 * z, 1.3 * z, 0, Math.PI * 2); ctx.fill();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
