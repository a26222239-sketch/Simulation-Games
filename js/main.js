// ============================================================
// main.js — 程式進入點：把各部分組合起來並啟動
//  - 建立遊戲狀態、繪圖器、輸入控制
//  - 跑「畫面更新迴圈」與「每月結算計時器」
//  - 處理工具列、選單、存檔/讀檔/匯出/匯入的 UI
// ============================================================
import { Game } from "./game.js";
import { Renderer } from "./render.js";
import { Input } from "./input.js";
import { BUILDINGS, TICK_MS } from "./config.js";

const canvas = document.getElementById("game");
const game = new Game();

// 開局時若有自動存檔就先讀回來
if (game.hasSave()) game.loadFromStorage();

const renderer = new Renderer(canvas, game);

// 目前選擇的工具，預設「道路」
let currentTool = "road";

// 點擊某格時：依目前工具蓋建築或拆除
const input = new Input(canvas, game, renderer, (gx, gy) => {
  let res;
  if (currentTool === "bulldoze") {
    res = game.bulldoze(gx, gy);
  } else {
    res = game.build(gx, gy, currentTool);
  }
  if (!res.ok) toast(res.msg);
});

// ---------- 畫面更新迴圈 ----------
function loop() {
  renderer.draw();
  updateStats();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- 每月結算 ----------
setInterval(() => {
  game.tick();
}, TICK_MS);

// ---------- 自動存檔（每 10 秒） ----------
setInterval(() => {
  game.saveToStorage();
}, 10000);
// 離開或切到背景時也存一次，避免進度遺失
window.addEventListener("pagehide", () => game.saveToStorage());
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") game.saveToStorage();
});

// ---------- 更新上方資訊列 ----------
const elMoney = document.getElementById("stat-money");
const elPop = document.getElementById("stat-pop");
const elIncome = document.getElementById("stat-income");
const elMonth = document.getElementById("stat-month");
function updateStats() {
  elMoney.textContent = Math.floor(game.money).toLocaleString();
  elPop.textContent = game.population.toLocaleString();
  const inc = game.monthlyIncome();
  elIncome.textContent = (inc >= 0 ? "+" : "") + inc.toLocaleString();
  elIncome.style.color = inc >= 0 ? "#7fe08a" : "#ff8a8a";
  elMonth.textContent = game.month;
}

// ---------- 工具列 ----------
const toolButtons = document.querySelectorAll(".tool");
function selectTool(name) {
  currentTool = name;
  toolButtons.forEach((b) => b.classList.toggle("active", b.dataset.tool === name));
}
toolButtons.forEach((btn) => {
  btn.addEventListener("click", () => selectTool(btn.dataset.tool));
  // 顯示建築價格在按鈕標題
  const def = BUILDINGS[btn.dataset.tool];
  if (def && def.cost) btn.title = `${def.name}（$${def.cost}）`;
});
selectTool("road");

// ---------- 右上選單 ----------
const menuPanel = document.getElementById("menu-panel");
document.getElementById("btn-menu").addEventListener("click", () => {
  menuPanel.classList.toggle("hidden");
});

document.getElementById("btn-save").addEventListener("click", () => {
  toast(game.saveToStorage() ? "已存檔 ✅" : "存檔失敗 ❌");
  menuPanel.classList.add("hidden");
});

document.getElementById("btn-load").addEventListener("click", () => {
  if (!game.hasSave()) return toast("找不到存檔");
  toast(game.loadFromStorage() ? "已讀取存檔 📂" : "讀檔失敗");
  menuPanel.classList.add("hidden");
});

document.getElementById("btn-new").addEventListener("click", () => {
  if (confirm("確定要重新開始嗎？目前的城市會被清除。")) {
    game.reset();
    game.saveToStorage();
    toast("已開始新城市 🆕");
  }
  menuPanel.classList.add("hidden");
});

// 匯出：把存檔下載成 .json 檔案（換裝置 / 備份用）
document.getElementById("btn-export").addEventListener("click", () => {
  const data = JSON.stringify(game.serialize(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mini-city-月${game.month}.json`;
  a.click();
  URL.revokeObjectURL(url);
  menuPanel.classList.add("hidden");
});

// 匯入：讀取使用者選的 .json 存檔
const fileInput = document.getElementById("file-input");
document.getElementById("btn-import").addEventListener("click", () => {
  fileInput.click();
  menuPanel.classList.add("hidden");
});
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (game.load(data)) {
        game.saveToStorage();
        toast("已匯入存檔 ⬆️");
      } else {
        toast("存檔格式不符");
      }
    } catch (err) {
      toast("匯入失敗：檔案讀不懂");
    }
  };
  reader.readAsText(file);
  fileInput.value = ""; // 清空，讓同一個檔案可以再次匯入
});

// ---------- 浮動提示 ----------
let toastTimer = null;
const toastEl = document.getElementById("toast");
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  toastEl.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.style.opacity = "0";
    setTimeout(() => toastEl.classList.add("hidden"), 250);
  }, 1400);
}
