// ============================================================
// config.js — 遊戲的「規則設定」全部集中在這裡
// 想調整地圖大小、建築價格、收入、佔地、等級，改這個檔案就好。
// ============================================================

// 地圖大小（格子數，正方形）
export const GRID_SIZE = 32;

// 一格菱形在螢幕上的基準寬高（2:1 是標準等距比例）
export const TILE_W = 64;
export const TILE_H = 32;

// 開局資金
export const START_MONEY = 5000;

// 模擬一次「結算」的間隔（毫秒）。每次結算 = 遊戲裡過一個月。
export const TICK_MS = 2500;

// 每個建築最高等級
export const LEVEL_MAX = 10;

// ============================================================
//  建築定義 + 立繪外型建議
// ------------------------------------------------------------
//  共同欄位：
//   name        顯示名稱
//   footprint   佔地（格數）{ w, h }，例如 {w:2,h:2} 就是 2x2
//   cost        建造費用（1 級時）
//   refund      拆除退款（會再乘以目前等級）
//   needsRoad   是否需要鄰接道路才會「運作」
//   color/side  尚未換成立繪前，暫時方塊的頂面 / 側面顏色
//   baseHeight  立體量體高度（1 級時，數值是「格寬的比例」）
//   sprite      立繪檔名前綴；之後放圖到 assets/<sprite>_<等級>.png
//   art         ★ 立繪外型建議（給你用 GPT 生圖時的指引）
//   ...其餘是各建築專屬的經濟參數
//
//  ── 等級如何影響數值（實作在 game.js）──
//   ‧ 量體高度、顏色亮度會隨等級提升
//   ‧ 住宅可住人口 = maxResidentsL1 × 等級
//   ‧ 商店每月營收 = incomeL1 × 等級
//   ‧ 升級費用 = cost × 0.6 × 目前等級
//
//  ── 立繪規格建議（重要）──
//   每個建築請畫「10 張圖」：<sprite>_1.png ~ <sprite>_10.png，
//   對應 1~10 級的外觀（由樸素 → 豪華）。
//   建議透明背景 PNG。圖的「底部寬度」應約等於佔地的菱形寬度：
//     底寬(px) ≈ (footprint.w + footprint.h) × 32 × 2(高解析)
//   例：2x2 → 底寬約 256px；2x3 → 底寬約 320px。
//   圖中建築要「畫在格子上、底部對齊菱形中心」，高度可自由往上長。
// ============================================================
export const BUILDINGS = {
  grass: {
    name: "空地", color: "#3e7d3e", side: "#336533",
    footprint: { w: 1, h: 1 },
    cost: 0, refund: 0, baseHeight: 0, needsRoad: false, buildable: false,
  },

  road: {
    name: "道路",
    footprint: { w: 1, h: 1 },
    color: "#5a5f66", side: "#44484e",
    cost: 10, refund: 5, baseHeight: 0.06, needsRoad: false, buildable: true,
    sprite: "road",
    // 外型建議：俯視等距的路面。
    // Lv1：泥土小徑（褐色、車轍）。Lv3：碎石路。Lv5：柏油路加白色標線。
    // Lv7：雙線道含人行道。Lv10：寬敞大道、路燈、行道樹、斑馬線。
    // 立繪需可「四向接續」，建議畫成單格無方向性的路面紋理。
    art: "道路：Lv1 泥土路→Lv5 柏油標線→Lv10 林蔭大道(路燈/斑馬線)。1x1，需可四向銜接。",
  },

  house: {
    name: "住宅",
    footprint: { w: 2, h: 2 },
    color: "#d9a441", side: "#b07f2c",
    cost: 100, refund: 40, baseHeight: 0.5, needsRoad: true, buildable: true,
    maxResidentsL1: 4,   // 1 級可住人口（每升一級 +4）
    taxPerResident: 2,   // 每位居民每月稅收
    sprite: "house",
    // 外型建議：暖色調住宅，屋頂用紅/橘做亮點。
    // Lv1：單層木造小屋＋三角斜屋頂、煙囪、小庭院。
    // Lv2-3：兩層磚房、加陽台與圍籬。
    // Lv4-6：三~四層公寓、規律窗戶、屋頂水塔。
    // Lv7-9：中高層住宅大樓、玻璃陽台、空調外機。
    // Lv10：豪華高層住宅，頂樓花園、夜間窗戶透出暖光。
    art: "住宅：2x2。Lv1 木造小屋(斜屋頂/煙囪)→Lv5 多層公寓→Lv10 豪華住宅大樓(頂樓花園)。暖色調紅屋頂。",
  },

  shop: {
    name: "商店",
    footprint: { w: 2, h: 3 },
    color: "#4f8edc", side: "#3a6aa6",
    cost: 220, refund: 90, baseHeight: 0.65, needsRoad: true, buildable: true,
    incomeL1: 14,        // 1 級每月營收（每升一級 +14）
    upkeep: 3,           // 每月維護費（隨等級微增）
    sprite: "shop",
    // 外型建議：藍色系商業建築，正面要有招牌與遮雨棚。
    // Lv1：路邊小雜貨店、單一招牌、攤位遮陽棚。
    // Lv2-3：便利商店、玻璃櫥窗、霓虹招牌。
    // Lv4-6：兩層店面＋餐廳，戶外座位。
    // Lv7-9：小型百貨/商場，多面玻璃帷幕、廣告看板。
    // Lv10：購物中心，巨型 LED 廣告牆、夜間燈光秀。
    art: "商店：2x3。Lv1 路邊雜貨店(遮陽棚/招牌)→Lv5 兩層店面→Lv10 購物中心(LED廣告牆)。藍色系玻璃帷幕。",
  },

  park: {
    name: "公園",
    footprint: { w: 3, h: 2 },
    color: "#2fa45a", side: "#237d43",
    cost: 160, refund: 70, baseHeight: 0.14, needsRoad: false, buildable: true,
    upkeep: 2,           // 每月維護費（公園目前不產生收入，是門面/未來幸福度用）
    sprite: "park",
    // 外型建議：綠地為主，幾乎不長高，重點在地面細節。
    // Lv1：草地＋一兩棵小樹、長椅。
    // Lv2-3：步道、花圃、更多樹。
    // Lv4-6：水池/噴泉、涼亭。
    // Lv7-9：湖泊、橋、雕像、夜燈。
    // Lv10：大型主題公園，摩天輪/音樂噴泉、繽紛花海。
    art: "公園：3x2。Lv1 草地小樹/長椅→Lv5 噴泉涼亭→Lv10 主題公園(摩天輪/花海)。低矮，重地面細節。",
  },
};

// localStorage 的存檔鍵名（資料結構大改版，所以升到 v2，避免讀到舊格式）
export const SAVE_KEY = "mini-city-save-v2";
