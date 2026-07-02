// ============================================================
// ui.js — 動物園彈出介面（選擇動物種類）
// ============================================================
import { ANIMALS, STRUCTURES } from "./config.js";

export class UI {
  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.id = "modal"; this.overlay.className = "hidden";
    this.card = document.createElement("div"); this.card.className = "modal-card";
    this.overlay.appendChild(this.card);
    this.overlay.addEventListener("pointerdown", (e) => { if (e.target === this.overlay) this.close(); });
    document.body.appendChild(this.overlay);
  }
  close() { this.overlay.classList.add("hidden"); this.card.innerHTML = ""; }
  show() { this.overlay.classList.remove("hidden"); }

  // 選動物（開羅式：未解鎖顯示條件，可用研究點解鎖）
  openAnimalPick(zoo, onPick, onToast) {
    this.card.innerHTML = "";
    const h = document.createElement("h2"); h.textContent = "選擇獸欄動物"; this.card.appendChild(h);
    const note = document.createElement("div"); note.className = "sec-label";
    note.textContent = `獸欄含2隻動物｜人氣 ${zoo.pop}｜研究點 ${zoo.rp}`;
    this.card.appendChild(note);
    Object.entries(ANIMALS).forEach(([id, a]) => {
      const total = STRUCTURES.enclosure.cost + a.buy * 2;
      const u = a.unlock || { pop: 0, rp: 0 };
      const b = document.createElement("button"); b.className = "list-btn";
      if (zoo.unlocked[id]) {
        b.innerHTML = `<span>${a.name}　<small>魅力${a.popularity}</small></span><small>$${total}</small>`;
        b.onclick = () => { this.close(); onPick(id); };
      } else {
        b.style.opacity = "0.75";
        const can = zoo.pop >= u.pop && zoo.rp >= u.rp;
        b.innerHTML = `<span>🔒 ${a.name}　<small>需人氣${u.pop}</small></span><small>${can ? "研究🔬" : ""}${u.rp}點</small>`;
        b.onclick = () => {
          const r = zoo.unlockAnimal(id);
          if (onToast) onToast(r.msg);
          if (r.ok) this.openAnimalPick(zoo, onPick, onToast); // 重畫清單
        };
      }
      this.card.appendChild(b);
    });
    const c = document.createElement("button"); c.className = "primary-btn"; c.textContent = "取消";
    c.onclick = () => this.close(); this.card.appendChild(c);
    this.show();
  }

  // 月結報表（開羅式）
  showReport(r, onClose) {
    this.card.innerHTML = "";
    const h = document.createElement("h2"); h.textContent = `📊 第 ${r.month} 月 結算`; this.card.appendChild(h);
    const mk = (label, val) => { const d = document.createElement("div"); d.className = "list-btn";
      d.innerHTML = `<span>${label}</span><small>${val}</small>`; this.card.appendChild(d); };
    mk("💰 收入", `$${r.income}`);
    mk("🧾 維護費", `-$${r.expense}`);
    mk("📈 淨利", `${r.net >= 0 ? "+" : ""}$${r.net}`);
    mk("🧑‍🤝‍🧑 來園遊客", `${r.visitors} 人`);
    mk("✨ 人氣", `${r.pop}｜🔬 研究點 ${r.rp}`);
    const c = document.createElement("button"); c.className = "primary-btn"; c.textContent = "繼續經營";
    c.onclick = () => { this.close(); if (onClose) onClose(); }; this.card.appendChild(c);
    this.show();
  }

  // 商店升級視窗
  showUpgrade(s, zoo, onDone) {
    const def = STRUCTURES[s.kind], lv = s.lv || 1;
    this.card.innerHTML = "";
    const h = document.createElement("h2"); h.textContent = `${def.name} Lv${lv}`; this.card.appendChild(h);
    const note = document.createElement("div"); note.className = "sec-label";
    const sale = Math.round(def.sale * (1 + 0.4 * (lv - 1)));
    const combo = zoo.shopCombo(s);
    note.innerHTML = `目前單筆收入 $${sale}${combo ? "（🏪 商圈組合 ×1.25！）" : ""}`;
    this.card.appendChild(note);
    if (lv < def.maxLv) {
      const cost = def.upCost * lv;
      const b = document.createElement("button"); b.className = "primary-btn";
      b.textContent = `⬆️ 升級到 Lv${lv + 1}（$${cost}）`;
      b.onclick = () => { const r = zoo.upgradeShop(s.id); this.close(); if (onDone) onDone(r.msg); };
      this.card.appendChild(b);
    } else {
      const d = document.createElement("div"); d.className = "sec-label"; d.textContent = "已達最高等級 ⭐"; this.card.appendChild(d);
    }
    const c = document.createElement("button"); c.className = "list-btn"; c.textContent = "關閉";
    c.onclick = () => this.close(); this.card.appendChild(c);
    this.show();
  }
}
