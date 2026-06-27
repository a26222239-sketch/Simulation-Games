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

  // 選動物 → 回呼 species；含 2 隻動物的獸欄總價
  openAnimalPick(onPick) {
    this.card.innerHTML = "";
    const h = document.createElement("h2"); h.textContent = "選擇獸欄動物"; this.card.appendChild(h);
    const note = document.createElement("div"); note.className = "sec-label";
    note.textContent = `獸欄 ${STRUCTURES.enclosure.footprint.w}×${STRUCTURES.enclosure.footprint.h}，建造含 2 隻動物`;
    this.card.appendChild(note);
    Object.entries(ANIMALS).forEach(([id, a]) => {
      const total = STRUCTURES.enclosure.cost + a.buy * 2;
      const b = document.createElement("button"); b.className = "list-btn";
      b.innerHTML = `<span>${a.name}　<small>人氣${a.popularity}</small></span><small>$${total}</small>`;
      b.onclick = () => { this.close(); onPick(id); };
      this.card.appendChild(b);
    });
    const c = document.createElement("button"); c.className = "primary-btn"; c.textContent = "取消";
    c.onclick = () => this.close(); this.card.appendChild(c);
    this.show();
  }
}
