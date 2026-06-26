// ============================================================
// config.js — 農場經營版的資料設定（全部集中在這裡）
// 想調整地圖、作物、動物、價格、衣服、外觀選項，改這裡就好。
//
// 視角：2.5D 等距。場景：農場(farm) 與 城鎮(town)。
// 主角是會走動的小人；捏臉/換裝用「正面立繪」(character.js)。
// ============================================================

export const TILE_W = 64;
export const TILE_H = 32;

export const FARM_W = 22, FARM_H = 22;
export const TOWN_W = 16, TOWN_H = 14;

export const START_MONEY = 500;
export const SAVE_KEY = "mini-farm-save-v1";

export const PLAYER_SPEED = 3.6; // 格/秒

// ---- 地面種類 ----
// solid: 是否擋住主角行走
export const GROUND = {
  grass:  { name: "草地",  color: "#5ba049", side: "#48823a", solid: false },
  soil:   { name: "農地",  color: "#8a5a3b", side: "#6f4630", solid: false },
  soilwet:{ name: "濕農地", color: "#5e3d28", side: "#48301f", solid: false },
  water:  { name: "水",    color: "#3d86c6", side: "#2f69a0", solid: true  },
  path:   { name: "步道",  color: "#cdbb91", side: "#a9986f", solid: false },
  plaza:  { name: "廣場",  color: "#bfb2a0", side: "#9b9080", solid: false },
};

// ---- 作物 ----
// stages: 生長階段數（種下=0，到 maxStage 可收成）；每天澆水才會長一階
export const CROPS = {
  turnip:     { name: "蘿蔔", seed: 20, sell: 38, maxStage: 3, color: "#e8e1d0", leaf: "#7fc24a" },
  potato:     { name: "馬鈴薯", seed: 30, sell: 55, maxStage: 4, color: "#caa46a", leaf: "#5fa83d" },
  strawberry: { name: "草莓", seed: 45, sell: 80, maxStage: 5, color: "#e8443b", leaf: "#5fb33d" },
};

// ---- 畜舍 ----
// footprint 佔地；houses 能養哪種動物
export const BUILDINGS = {
  coop: { name: "雞舍", footprint: { w: 2, h: 2 }, cost: 300, color: "#caa15a", side: "#a07c3c", houses: ["chicken"] },
  barn: { name: "畜舍", footprint: { w: 3, h: 2 }, cost: 500, color: "#b5654a", side: "#8c4634", houses: ["cow", "sheep"] },
};

// ---- 動物 ----
// product: 產物名；每天產出一次，可賣
export const ANIMALS = {
  chicken: { name: "雞", buy: 120, product: "egg",  productName: "蛋", sell: 25, body: "#f3f0e6", speed: 1.1 },
  cow:     { name: "牛", buy: 400, product: "milk", productName: "牛奶", sell: 85, body: "#e9e4d8", speed: 0.8 },
  sheep:   { name: "羊", buy: 320, product: "wool", productName: "羊毛", sell: 70, body: "#efece2", speed: 0.9 },
};

// 可賣出的物品（收成/產物）統一查價
export const SELLABLE = {
  turnip: CROPS.turnip.sell, potato: CROPS.potato.sell, strawberry: CROPS.strawberry.sell,
  egg: ANIMALS.chicken.sell, milk: ANIMALS.cow.sell, wool: ANIMALS.sheep.sell,
};
export const ITEM_NAME = {
  turnip: "蘿蔔", potato: "馬鈴薯", strawberry: "草莓", egg: "蛋", milk: "牛奶", wool: "羊毛",
};

// ============================================================
//  角色外觀（捏臉）選項 + 立繪建議
// ============================================================
export const SKIN_TONES = ["#f3c9a0", "#e0a878", "#c98a55", "#8d5a36"];
export const HAIR_COLORS = ["#2b2620", "#5a3a1e", "#caa14a", "#9b3b2e", "#d96fa0", "#cfd2d6"];
export const HAIR_STYLES = ["short", "long", "bun", "spiky"]; // 短髮/長髮/包頭/刺蝟

// ---- 衣服（換裝）----
// 起始服裝免費，其餘進城買。shirt = 上衣顏色（影響立繪與小人）
export const CLOTHES = {
  basic:  { name: "棉布衣", price: 0,   shirt: "#7fa7d8" },
  red:    { name: "紅上衣", price: 80,  shirt: "#d9534f" },
  green:  { name: "綠工作服", price: 120, shirt: "#4f9d5d" },
  purple: { name: "紫外套", price: 160, shirt: "#8a5fc0" },
  dress:  { name: "黃洋裝", price: 220, shirt: "#e8c14a" },
};

// 角色立繪建議（給你之後用 GPT 生圖）：
//   正面半身像，Q版，分層：膚色底 + 髮型(透明背景) + 上衣。
//   若要換成真立繪：每件衣服一張 assets/outfit_<id>.png(正面)，
//   髮型 assets/hair_<style>_<color索引>.png，程式可改成 drawImage 疊圖。
export const ART_NOTE =
  "角色正面 Q 版半身；衣服每件一張正面 PNG(透明背景)，髮型分層。世界中的小人用同色系簡化版。";
