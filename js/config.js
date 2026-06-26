// ============================================================
// config.js — 店內經營版的規則設定（全部集中在這裡）
// 想調整店面大小、價格、顧客速度、外型建議，改這裡就好。
//
// 【架構備註：未來的城市經營】
//  本作採「場景(scene)」概念：目前只有「商店」一個場景(js/store.js)。
//  未來要加回城市經營時，只要再寫一個城市場景並在 main.js 切換即可，
//  不需要打掉重做。先前的城市建造版本完整保留在 git 歷史中。
// ============================================================

// 店面格子大小（cx: 0..W-1, cy: 0..H-1）
export const STORE_W = 14;
export const STORE_H = 12;

// 一格菱形在螢幕上的基準寬高（2:1 等距）
export const TILE_W = 64;
export const TILE_H = 32;

export const START_MONEY = 1500;

// localStorage 存檔鍵（改版，故用 v3）
export const SAVE_KEY = "mini-store-save-v3";

// ============================================================
//  地磚 / 設施種類
//   walkable  顧客能不能走過去（false = 障礙物，顧客只能站旁邊）
//   height    立體量體高度（格寬比例；地板/門為 0）
//   color/side 尚未換立繪前的暫時顏色（頂面/側面）
//   editable  是否能用工具放置
//   sprite    立繪檔名前綴 → assets/<sprite>.png（存在就自動改用圖片）
//   art       ★ 立繪外型建議（給你用 GPT 生圖的指引）
// ============================================================
export const TILES = {
  floor: {
    name: "地板", walkable: true, height: 0,
    color: "#c9b79c", side: "#a4906f", editable: true, sprite: "floor",
    art: "地板：俯視等距方磚，淺米色/木紋。1x1 可無縫拼接。",
  },
  wall: {
    name: "牆", walkable: false, height: 0.55,
    color: "#d8d2c4", side: "#b3ab99", editable: true, sprite: "wall",
    art: "牆：淺色內牆，可有踢腳線/掛畫。高度約半格。",
  },
  shelf: {
    name: "貨架", walkable: false, height: 0.42,
    color: "#7e57c2", side: "#5e3aa0", editable: true, sprite: "shelf",
    art: "貨架：商品陳列架，多層、擺滿彩色商品盒/罐。顧客會走到旁邊『逛』。",
  },
  counter: {
    name: "櫃台", walkable: false, height: 0.34,
    color: "#26a69a", side: "#1c7d73", editable: true, sprite: "counter",
    art: "櫃台：收銀台，含收銀機。顧客逛完會來這裡『結帳』付錢。",
  },
  door: {
    name: "門", walkable: true, height: 0,
    color: "#ffcc66", side: "#d9a441", editable: true, sprite: "door",
    art: "門：店面入口/出口地墊。顧客從這裡進場、結完帳從這裡離開。",
  },
};

// ============================================================
//  顧客設定
// ============================================================
export const CUSTOMER = {
  spawnEverySec: 2.2,   // 每隔幾秒嘗試生一位顧客（店裡太多就暫停生）
  maxInStore: 12,       // 店內同時最多人數
  speed: 2.6,           // 移動速度（格/秒）
  shopSec: [1.5, 3.5],  // 在貨架前「逛」的秒數範圍
  paySec: [1.0, 2.0],   // 在櫃台「結帳」的秒數範圍
  salePrice: [25, 70],  // 每筆結帳金額範圍（隨機）
  // ★ 走路動畫立繪建議（精靈圖 sprite sheet）：
  //   檔名 assets/customer.png，建議 4 列(方向: 下/左/右/上) × 4 行(走路分解動作)。
  //   單格建議 48×64px、透明背景；同一角色只改腿部姿勢以保持一致。
  //   程式會自動裁切對應方向與動作格；沒有圖時用內建的小人代替。
  art: "顧客：可愛 Q 版路人。精靈圖 4方向×4走路格，48x64透明背景。可生多種髮色/衣服當不同顧客。",
};
