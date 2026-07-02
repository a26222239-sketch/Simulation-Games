# CLAUDE.md — 專案規則（每次開工自動載入，務必遵守）

迷你動物園（上帝視角經營遊戲）。引擎 Phaser 3（`vendor/phaser.min.js`），純前端 ES Modules。
開發分支 `claude/city-building-game-p15t1i`；每次完成後 commit 並 push 到該分支，再同步到 `main`
（`git push origin claude/city-building-game-p15t1i:main`），GitHub Pages 才會部署。

---

## ★ 開羅模式（Kairosoft 式）— 全遊戲唯一美術制度

參考開羅遊戲：**小像素角色＋極少格數，動態交給程式**。舊「精緻模式」(多表6格)已全面廢除。

### 動物：每隻一張 1×9 條 `assets/animal_<id>.png`
格序（左→右）：`前走1 前走2 | 側走1 側走2(朝左) | 背走1 背走2 | 坐 | 睡(閉眼躺) | 吃(低頭)`

| 動物 | cell | 整張(cell×9 寬 × cell 高) |
|---|---|---|
| lion 非洲獅 | 48 | 432×48 |
| monkey 猴子 | 42 | 378×42 |
| penguin 企鵝 | 36 | 324×36 |
| elephant 大象 | 72 | 648×72 |
| giraffe 長頸鹿 | 72 | 648×72 |

### 遊客：一張 1×6 條 `assets/visitor.png`（單格 24×32，總 144×32）
格序：`前走1 前走2 | 側走1 側走2(朝左) | 背走1 背走2`

### 圖裡「不畫」的東西（程式處理，render.js）
- Zzz（程式 z/zz/zzz 飄浮字）、食物（程式肉塊→骨頭）
- 右向（程式翻轉側面）、走路彈跳 bob（程式）
- `config.js` 動物設 `kairo: true`（現在全部都是）
### 陰影：畫進圖裡（每格同大小同位置的深灰橢圓，動物站在上面）
- 程式陰影只給「佔位圖」用；正式像素圖一律自帶陰影。

### 生圖規則（pixel art）
1. **像素風、無抗鋸齒**：`crisp pixel art, NO anti-aliasing`；遊戲已開 pixelArt 銳利取樣。
2. **純白背景、無陰影、無文字**（特效程式加，圖越乾淨越好）。
3. **PNG 不要 JPEG**（prompt 寫 `lossless PNG, NOT JPG`）。
4. **確切畫素**：整張與單格 px 都寫死（見上表）。
5. **格間留白要大**：每格之間要有「明顯的空白間隔」，動物+陰影完整在格內、絕不碰格線。
6. **9 格同一隻 + 頭部固定基準（最重要）**：以「頭」當固定尺寸錨——
   9 格的頭必須是**同一個像素大小**，身體比例一致；動作只改姿勢，
   絕不因坐/睡/吃就把整隻畫大或畫小（忽大忽小）。
   prompt 必加：`HEAD-SIZE RULE: the head is the fixed size reference — it must be the SAME pixel size in every cell; poses change ONLY the body position, never the scale.`
7. 成年體型。單向姿勢一律**朝左**。

### 去背/接圖流程（像素圖超簡單）
1. `python3 tools/cutout.py 原圖.png out.png --bg FFFFFF`（flood-fill 對像素圖完美，不需 rembg）
2. `python3 tools/normalize_stable.py out.png assets/animal_<id>.png --grid 1x9 --cell N --margin 2 --nearest`（像素圖必加 --nearest，用最近鄰縮放才不糊）
3. **換圖必把 `js/render.js` 的 `ASSET_VER` +1**（破壞快取）。

---

## 開羅式玩法系統（zoo.js）

- **月結算**：每 45 秒一個月，扣維護費(動物5/商店12/樹1)並彈出月報(收入/支出/淨利/遊客/人氣)。
- **滿意度→人氣/研究點**：遊客看動物+消費各+1滿意度，離場時 人氣+=滿意度、研究點+=滿意度/2。
- **解鎖**：動物需「人氣達標+花研究點」解鎖(獅0/猴30/企鵝70/長頸鹿150/象250)。
- **商店升級**：點咖啡/紀念品開升級窗(Lv1-5，每級收入+40%)。
- **鄰接組合**：獸欄旁的樹=環境加成(每棵+2魅力,上限6)；咖啡×紀念品相鄰=商圈組合(售價×1.25)。
- **動物養成**：被觀看得XP，12XP升1級(上限5)，每級+2魅力。
- 存檔 v2(含人氣/研究點/解鎖/商店Lv/動物XP)，相容 v1 舊檔。

## 其他慣例

- 動物活動權重 `js/zoo.js` `pickActivity()`：idle 50% > walk 25% > eat 15% > sleep 10%。
- 進食時長 10.2 秒；最後 2 秒程式把肉換成骨頭。
- 給使用者 prompt 一律**完整可直接貼上**，不要叫他自己替換字串。
- 我沒有跨對話記憶；規則以本檔為準，動手前先讀。
- 舊精緻模式規則封存於 `docs/ART_PROMPTS.md`（僅供參考，勿再使用）。
