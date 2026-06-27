// ============================================================
// config.js — 動物園經營（上帝視角）資料設定，集中在這裡
// 視角：2.5D 等距。引擎：Phaser。畫面：draw.js（之後可換立繪/精靈圖）。
// ============================================================
export const TILE_W = 64;
export const TILE_H = 32;
export const ZOO_W = 26;
export const ZOO_H = 24;

export const START_MONEY = 2500;
export const SAVE_KEY = "mini-zoo-save-v1";

export const DAY_SEC = 45;      // 幾秒過一天（換日扣維護費）
export const TICKET = 12;       // 門票（遊客進場收入）

// ---- 地面 ----
export const GROUND = {
  grass: { name: "草地", color: "#5ba049", solid: false },
  path:  { name: "步道", color: "#cdbb91", solid: false },
  plaza: { name: "廣場", color: "#bfb2a0", solid: false }, // 入口
  water: { name: "水池", color: "#3d86c6", solid: true },
};

// ---- 可放置的設施 ----
// footprint 佔地；blocksWalk 是否擋住遊客行走（遊客只走 path/plaza）
export const STRUCTURES = {
  enclosure: { name: "獸欄", footprint: { w: 3, h: 3 }, cost: 300, pen: "#caa46a", side: "#9c7b46" },
  cafe:      { name: "咖啡廳", footprint: { w: 2, h: 2 }, cost: 350, color: "#b5774a", side: "#8c5836", sale: 16 },
  souvenir:  { name: "紀念品店", footprint: { w: 2, h: 2 }, cost: 350, color: "#4f8edc", side: "#3a6aa6", sale: 24 },
  tree:      { name: "樹木", footprint: { w: 1, h: 1 }, cost: 40, color: "#2f8f3e", trunk: "#7a5230", attraction: 1 },
};

// ---- 動物（獸欄內飼養，會走動的 2.5D 動圖）----
// 立繪規格：每種動物精靈圖 assets/animal_<id>.png（走路 4方向×4格）、
//   _eat.png / _sleep.png（單排 4 格）。
// ★ frame = 單格像素，「以獅子 48 為基準，依體型調整」：
//   走路整張 = frame×4 寬 × frame×4 高；進食/睡覺 = frame×4 寬 × frame 高。
//   遊戲會依各動物的 frame 載入並顯示，所以大象天生比企鵝大。
//   精靈圖用 rembg 去背(會連陰影一起去掉)，所以影子由程式繪製（見 render.js）。
export const ANIMALS = {
  lion:     { name: "獅子", body: "#d9a441", accent: "#a87a2a", buy: 200, popularity: 6, speed: 0.7, size: 1.1, frame: 48 },
  elephant: { name: "大象", body: "#9aa0a6", accent: "#787e84", buy: 350, popularity: 8, speed: 0.5, size: 1.4, frame: 72 },
  penguin:  { name: "企鵝", body: "#2b2f36", accent: "#f1f1f1", buy: 150, popularity: 5, speed: 0.9, size: 0.8, frame: 36 },
  monkey:   { name: "猴子", body: "#8a5a3b", accent: "#caa46a", buy: 180, popularity: 5, speed: 1.1, size: 0.8, frame: 42 },
  giraffe:  { name: "長頸鹿", body: "#e8c14a", accent: "#b5894a", buy: 320, popularity: 7, speed: 0.6, size: 1.5, frame: 72 },
};

// ---- 遊客 ----
export const VISITOR = {
  baseSpawnSec: 3.0,   // 基礎生成間隔（魅力越高越快）
  maxInPark: 30,
  speed: 2.4,
  viewSec: [2, 4],     // 看動物的秒數
  buySec: [1, 2],      // 在店消費秒數
  colors: ["#e57373", "#64b5f6", "#81c784", "#ffb74d", "#ba68c8", "#4db6ac", "#f06292", "#a1887f", "#fff176"],
};
