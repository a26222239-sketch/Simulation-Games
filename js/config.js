// ============================================================
// config.js — 遊戲的「規則設定」全部集中在這裡
// 想調整地圖大小、建築價格、收入，改這個檔案就好。
// ============================================================

// 地圖大小（格子數，正方形）
export const GRID_SIZE = 30;

// 一格菱形在螢幕上的基準寬高（2:1 是標準等距比例）
export const TILE_W = 64;
export const TILE_H = 32;

// 開局資金
export const START_MONEY = 3000;

// 模擬一次「結算」的間隔（毫秒）。每次結算 = 遊戲裡過一個月。
export const TICK_MS = 2500;

// ---- 建築種類定義 ----
// key 會存進地圖資料；color 是還沒換成立繪前的暫時方塊顏色。
// cost: 建造花費；refund: 拆除退款；
// height: 在畫面上往上長多高（格數比例，道路/公園很矮，住宅商店較高）；
// needsRoad: 是否需要鄰接道路才會「運作」（產生人口或收入）。
export const BUILDINGS = {
  grass: {
    name: "空地", color: "#3e7d3e", side: "#336533",
    cost: 0, refund: 0, height: 0, needsRoad: false, buildable: false,
  },
  road: {
    name: "道路", color: "#5a5f66", side: "#44484e",
    cost: 10, refund: 5, height: 0.06, needsRoad: false, buildable: true,
  },
  house: {
    name: "住宅", color: "#d9a441", side: "#b07f2c",
    cost: 100, refund: 40, height: 0.55, needsRoad: true, buildable: true,
    maxResidents: 8,   // 蓋好且接到路後，會慢慢住滿的人口
    taxPerResident: 2, // 每位居民每月貢獻的稅收
  },
  shop: {
    name: "商店", color: "#4f8edc", side: "#3a6aa6",
    cost: 200, refund: 80, height: 0.7, needsRoad: true, buildable: true,
    incomePerMonth: 18, // 接到路後每月固定營收
    upkeep: 3,          // 每月維護費
  },
  park: {
    name: "公園", color: "#2fa45a", side: "#237d43",
    cost: 150, refund: 60, height: 0.18, needsRoad: false, buildable: true,
    upkeep: 2,
  },
};

// localStorage 的存檔鍵名
export const SAVE_KEY = "mini-city-save-v1";
