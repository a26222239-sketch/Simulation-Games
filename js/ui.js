// ============================================================
// ui.js — 彈出式介面：捏臉 / 衣櫃換裝 / 服飾店 / 種子店 / 建造與畜牧
// 用 DOM 疊在畫面上；正面立繪用 character.drawPortrait 畫在小 canvas。
// ============================================================
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLES, CLOTHES, CROPS, BUILDINGS, ANIMALS } from "./config.js";
import { drawPortrait } from "./character.js";

export class UI {
  constructor(world, refresh, setBuild) {
    this.world = world; this.refresh = refresh; this.setBuild = setBuild;
    // 遮罩 + 卡片
    this.overlay = document.createElement("div");
    this.overlay.id = "modal"; this.overlay.className = "hidden";
    this.card = document.createElement("div"); this.card.className = "modal-card";
    this.overlay.appendChild(this.card);
    this.overlay.addEventListener("pointerdown", (e) => { if (e.target === this.overlay) this.close(); });
    document.body.appendChild(this.overlay);
    // 預覽用 canvas
    this.pcanvas = document.createElement("canvas"); this.pcanvas.width = 150; this.pcanvas.height = 190;
    this.pctx = this.pcanvas.getContext("2d");
  }

  close() { this.overlay.classList.add("hidden"); this.card.innerHTML = ""; this.refresh(); }
  show() { this.overlay.classList.remove("hidden"); }

  drawPreview() {
    const ctx = this.pctx;
    ctx.clearRect(0, 0, 150, 190);
    ctx.fillStyle = "#eef3f6"; ctx.fillRect(0, 0, 150, 190);
    drawPortrait(ctx, 75, 175, 1, this.world.player.appearance);
  }

  // 一排可點選的色票
  swatches(colors, current, onPick) {
    const row = document.createElement("div"); row.className = "swatch-row";
    colors.forEach((c) => {
      const b = document.createElement("button"); b.className = "swatch"; b.style.background = c;
      if (c === current) b.classList.add("sel");
      b.onclick = () => { onPick(c); };
      row.appendChild(b);
    });
    return row;
  }
  // 一排文字選項
  chips(items, currentKey, onPick) {
    const row = document.createElement("div"); row.className = "chip-row";
    items.forEach(({ key, label }) => {
      const b = document.createElement("button"); b.className = "chip"; b.textContent = label;
      if (key === currentKey) b.classList.add("sel");
      b.onclick = () => onPick(key);
      row.appendChild(b);
    });
    return row;
  }

  title(t) { const h = document.createElement("h2"); h.textContent = t; return h; }
  section(t) { const h = document.createElement("div"); h.className = "sec-label"; h.textContent = t; return h; }

  // ---------- 捏臉 ----------
  openCreator(isFirst) {
    const app = this.world.player.appearance;
    this.card.innerHTML = "";
    this.card.appendChild(this.title(isFirst ? "捏臉 — 創建你的角色" : "外觀 / 捏臉"));

    const wrap = document.createElement("div"); wrap.className = "creator-wrap";
    const left = document.createElement("div"); left.appendChild(this.pcanvas);
    const right = document.createElement("div"); right.className = "creator-opts";
    wrap.appendChild(left); wrap.appendChild(right);
    this.card.appendChild(wrap);

    const rebuild = () => { this.openCreator(isFirst); }; // 重畫整個介面以更新選取狀態
    right.appendChild(this.section("膚色"));
    right.appendChild(this.swatches(SKIN_TONES, app.skin, (c) => { app.skin = c; rebuild(); }));
    right.appendChild(this.section("髮型"));
    right.appendChild(this.chips(HAIR_STYLES.map((k) => ({ key: k, label: { short: "短髮", long: "長髮", bun: "包頭", spiky: "刺蝟" }[k] })), app.hairStyle, (k) => { app.hairStyle = k; rebuild(); }));
    right.appendChild(this.section("髮色"));
    right.appendChild(this.swatches(HAIR_COLORS, app.hairColor, (c) => { app.hairColor = c; rebuild(); }));
    right.appendChild(this.section("服裝"));
    const owned = this.world.ownedClothes.map((id) => ({ key: id, label: CLOTHES[id].name }));
    right.appendChild(this.chips(owned, app.outfit, (id) => { this.world.equip(id); rebuild(); }));

    const done = document.createElement("button"); done.className = "primary-btn"; done.textContent = "完成 ✅";
    done.onclick = () => this.close();
    this.card.appendChild(done);

    this.drawPreview();
    this.show();
  }

  // ---------- 衣櫃換裝 ----------
  openWardrobe() {
    this.card.innerHTML = "";
    this.card.appendChild(this.title("衣櫃 — 換裝"));
    const wrap = document.createElement("div"); wrap.className = "creator-wrap";
    const left = document.createElement("div"); left.appendChild(this.pcanvas);
    const right = document.createElement("div"); right.className = "creator-opts";
    wrap.appendChild(left); wrap.appendChild(right); this.card.appendChild(wrap);
    this.world.ownedClothes.forEach((id) => {
      const b = document.createElement("button"); b.className = "list-btn";
      b.innerHTML = `<span>${CLOTHES[id].name}</span>` + (this.world.player.appearance.outfit === id ? "<small>穿著中</small>" : "<small>換上</small>");
      b.onclick = () => { this.world.equip(id); this.openWardrobe(); };
      right.appendChild(b);
    });
    const close = document.createElement("button"); close.className = "primary-btn"; close.textContent = "關閉";
    close.onclick = () => this.close(); this.card.appendChild(close);
    this.drawPreview(); this.show();
  }

  // ---------- 服飾店 / 種子店 ----------
  openShop(kind) {
    this.card.innerHTML = "";
    if (kind === "clothes") {
      this.card.appendChild(this.title("服飾店"));
      const wrap = document.createElement("div"); wrap.className = "creator-wrap";
      const left = document.createElement("div"); left.appendChild(this.pcanvas);
      const right = document.createElement("div"); right.className = "creator-opts";
      wrap.appendChild(left); wrap.appendChild(right); this.card.appendChild(wrap);
      Object.entries(CLOTHES).forEach(([id, c]) => {
        const owned = this.world.ownedClothes.includes(id);
        const b = document.createElement("button"); b.className = "list-btn";
        b.innerHTML = `<span>${c.name}</span><small>${owned ? (this.world.player.appearance.outfit === id ? "穿著中" : "換上") : "$" + c.price}</small>`;
        b.onclick = () => { const r = this.world.buyClothes(id); this.openShop("clothes"); this.refresh(r.msg); };
        right.appendChild(b);
      });
      this.drawPreview();
    } else {
      this.card.appendChild(this.title("種子店 — 選擇要種的作物"));
      Object.entries(CROPS).forEach(([id, c]) => {
        const b = document.createElement("button"); b.className = "list-btn";
        b.innerHTML = `<span>${c.name}</span><small>種子$${c.seed}・賣$${c.sell}${this.world.seedSel === id ? "・已選" : ""}</small>`;
        if (this.world.seedSel === id) b.classList.add("sel");
        b.onclick = () => { this.world.seedSel = id; this.openShop("seed"); this.refresh("已選 " + c.name); };
        this.card.appendChild(b);
      });
    }
    const close = document.createElement("button"); close.className = "primary-btn"; close.textContent = "關閉";
    close.onclick = () => this.close(); this.card.appendChild(close);
    this.show();
  }

  // ---------- 建造 / 畜牧 ----------
  openBuildMenu() {
    this.card.innerHTML = "";
    this.card.appendChild(this.title("建造 / 畜牧"));
    this.card.appendChild(this.section("蓋建築（選擇後點農場空地放置）"));
    Object.entries(BUILDINGS).forEach(([id, b]) => {
      const btn = document.createElement("button"); btn.className = "list-btn";
      btn.innerHTML = `<span>${b.name} ${b.footprint.w}×${b.footprint.h}</span><small>$${b.cost}</small>`;
      btn.onclick = () => { this.setBuild(id); this.close(); this.refresh(`選好${b.name}，點農場空地放置`); };
      this.card.appendChild(btn);
    });
    this.card.appendChild(this.section("買動物（需先有對應畜舍）"));
    Object.entries(ANIMALS).forEach(([id, a]) => {
      const btn = document.createElement("button"); btn.className = "list-btn";
      btn.innerHTML = `<span>${a.name}（產${a.productName}）</span><small>$${a.buy}</small>`;
      btn.onclick = () => { const r = this.world.buyAnimal(id); this.refresh(r.msg); };
      this.card.appendChild(btn);
    });
    const close = document.createElement("button"); close.className = "primary-btn"; close.textContent = "關閉";
    close.onclick = () => this.close(); this.card.appendChild(close);
    this.show();
  }
}
