# CLAUDE.md — 專案規則（每次開工自動載入，務必遵守）

迷你動物園（上帝視角經營遊戲）。引擎 Phaser 3（`vendor/phaser.min.js`），純前端 ES Modules。
開發分支 `claude/city-building-game-p15t1i`；每次完成後 commit 並 push 到該分支，再同步到 `main`
（`git push origin claude/city-building-game-p15t1i:main`），GitHub Pages 才會部署。

---

## ★ 動物精靈圖 prompt — 必填清單（最常被漏，生 prompt 前逐項檢查）

每次給使用者動物精靈圖 prompt，**一定要全部包含**，缺一不可：

0. **每個動作一律 6 格**（走路＝6 欄×4 列＝24 格；吃/睡/待機/哈欠＝單排 6 格）。6 格動作要連貫、**6 格都不一樣**。
0b. **連續循環（通則，重要）**：每個動作都是「**同一個動作循環的 6 個等間隔階段**」，不是 6 個不連貫姿勢；
    逐格描述每一格的差異。
    - 走路/待機/打哈欠/睡覺＝**無縫循環**：第 6 格要能順順接回第 1 格（loop 1→…→6→1 不跳）。
    - 進食＝例外：第 1–5 格是無縫咀嚼循環(頭低只動嘴、第5接回第1)，第 6 格是結束(抬頭剩骨頭)。
1. **確切解析度（最常漏！）**：寫死「單格 cell px ＋ 整張 px」。例：
   - 走路 6×4：`a 6x4 grid, each cell EXACTLY {CELL}x{CELL} px, total {SHEET} px`
   - 單排 1×6（吃/睡/待機/哈欠）：`a horizontal strip of 6 frames, each cell EXACTLY {CELL}x{CELL} px, total {STRIP} px`
2. **成年體型**：`ADULT ... proportions, NOT a cub/baby, NOT chibi`。
3. **深色陰影畫進圖**：`the SAME DARK grey oval shadow (deep grey ~#555555, opaque, soft edge) under it in EVERY frame`。
4. **大小一致**：`SIZE RULE: the animal is the EXACT SAME size as the walk sheet（走路為基準，body ~80% 格高）；吃/睡/待機不可放大/拉近`。
5. **純白背景**：`solid plain white background, no ground, no text`。
5b. **存成 PNG，不要 JPEG（重要）**：下載/匯出一律用 **PNG**。JPEG 壓縮會讓白底出現灰雜訊、
    獅子邊緣有灰邊，去背會髒、留灰邊。收到 JPEG 要請使用者改存 PNG 再傳。
6. **單排動作一律側面朝左**（遊戲會自動翻右）：`side view facing LEFT`。
7. **逐格描述 + 6 DISTINCT frames**（避免六格一樣）。
8. 走路四列順序：`row1 front / row2 LEFT / row3 RIGHT / row4 back`。
8b. **幀間距要大（根治「剪到鄰格」）**：每格之間留明顯空白，動物**連同陰影**完整在自己格子正中、
    四周留白，**不可碰到或越過格線、不可和鄰格重疊**。格與格之間要有清楚的空白間隙
    （這樣去背切圖才能切在空白處，不會把隔壁的腳/陰影切進來）。
    prompt 寫：`leave generous empty padding around each pose INCLUDING its shadow; keep every frame fully inside its own cell with clear empty gaps between all frames; nothing touches or crosses the cell borders.`
8c. **Zzz 要大要粗、不要漸層淡出**：睡覺的 z / zz / zzz 一律**大、粗體、實心深色**，清楚可讀。
    **不可用「漸淡/半透明」的 Zzz**——淡的字對比低會被去背當背景清掉。
    做法：用 **z → zz → zzz 循環**（每個都實心）表現，不要靠變淡；搭配**肚子起伏(呼吸)**增加層次。
9. **同一隻動物一致（重要）**：四張動作圖必須是**同一隻動物在做不同動作**，不只是顏色，
   連**畫風、體型/比例、鬃毛(毛髮)形狀與份量、五官、毛色/膚色**都要完全相同；只有姿勢/動作改變。
   ★ 分兩種寫法：
   - **走路(第一張、基準)**：不要寫「跟前一張一致」（它沒有前一張）。要**具體詳述這隻動物的所有特徵**
     （體色＋腹部色＋鬃毛/毛髮形狀份量與顏色＋五官＋體型比例＋尾巴特徵），當成角色設定，
     讓後面的圖有依循基礎。
   - **進食/睡覺/待機(後續)**：使用者會**上傳走路那張當參考圖**再生，所以一定要加：
     `SAME-CHARACTER RULE: this is the SAME individual animal as the reference image (the walk sheet) — identical art style, body type and proportions, mane/fur shape and volume, facial features and colors. ONLY the pose/action changes; do NOT redesign or restyle the character, do NOT change any shade.`
   - 非洲獅基準：體色 golden-tan/golden-yellow、腹部/口鼻/腳掌淺奶油色、鬃毛與尾端 dark warm-brown、
     成年公獅滿鬃毛、圓潤口鼻、小圓耳、琥珀色眼睛。

### 各動物畫素表（6 格；id：lion/elephant/penguin/monkey/giraffe）
| 動物 | cell | 走路(6欄×4列) | 單排(1×6) |
|---|---|---|---|
| lion 非洲獅 | 48 | 288×192 | 288×48 |
| monkey | 42 | 252×168 | 252×42 |
| penguin | 36 | 216×144 | 216×36 |
| elephant | 72 | 432×288 | 432×72 |
| giraffe | 72 | 432×288 | 432×72 |

> 完整可複製的 prompt 範本見 `docs/ART_PROMPTS.md`（保持兩份同步）。
> 使用者要 prompt 時，給**完整可直接貼上**的版本，不要叫他自己替換字串。

---

## 去背 / 接圖流程（動物精靈圖）

1. 去背：`python3 tools/cut_keep_shadow.py 原圖 out.png --grid 4x4`（單排 `--grid 1x4`）
   ＝ rembg 取乾淨剪影 ＋ 保留原圖非白的陰影/Zzz/食物 ＋ 去掉腿縫白。
   **不要**用純 rembg（吃掉陰影）或純 flood-fill（腿縫殘白）。
2. 切格對齊：`python3 tools/normalize.py out.png assets/animal_<id>.png --grid RxC --cell N`
   - 同一隻動物四張用**相同縮放**對齊（`--scale` 固定值或同 `--pad`），確保大小一致。
3. `config.js` 該動物設 `bakedShadow: true`（陰影已畫進圖 → render.js 不再畫程式影子）。
   沒有自帶陰影的動物維持預設（程式畫影子）以免懸空。
4. **換了 assets 圖一定要把 `js/render.js` 的 `ASSET_VER` +1**（破壞快取，否則玩家看到舊圖）。

---

## 其他慣例

- 動物活動權重在 `js/zoo.js` `pickActivity()`（目前 idle 50% 最高 > walk 25% > eat 15% > sleep 10%）。
- 動物每格像素由 `config.js` 的 `frame` 決定（lion 48 為基準，依體型放大）。
- 我沒有跨對話記憶；規則以本檔與 `docs/ART_PROMPTS.md` 為準，動手前先讀。
