# CLAUDE.md — 專案規則（每次開工自動載入，務必遵守）

迷你動物園（上帝視角經營遊戲）。引擎 Phaser 3（`vendor/phaser.min.js`），純前端 ES Modules。
開發分支 `claude/city-building-game-p15t1i`；每次完成後 commit 並 push 到該分支，再同步到 `main`
（`git push origin claude/city-building-game-p15t1i:main`），GitHub Pages 才會部署。

---

## ★ 動物精靈圖 prompt — 必填清單（最常被漏，生 prompt 前逐項檢查）

每次給使用者動物精靈圖 prompt，**一定要全部包含**，缺一不可：

1. **確切解析度（最常漏！）**：寫死「單格 cell px ＋ 整張 px」。例：
   - 走路 4×4：`each cell EXACTLY {CELL}x{CELL} px, total {SHEET} px`
   - 單排 1×4（吃/睡/待機）：`each cell EXACTLY {CELL}x{CELL} px, total {STRIP} px`
2. **成年體型**：`ADULT ... proportions, NOT a cub/baby, NOT chibi`。
3. **深色陰影畫進圖**：`the SAME DARK grey oval shadow (deep grey ~#555555, opaque, soft edge) under it in EVERY frame`。
4. **大小一致**：`SIZE RULE: the animal is the EXACT SAME size as the walk sheet（走路為基準，body ~80% 格高）；吃/睡/待機不可放大/拉近`。
5. **純白背景**：`solid plain white background, no ground, no text`。
6. **單排動作一律側面朝左**（遊戲會自動翻右）：`side view facing LEFT`。
7. **逐格描述 + 4 DISTINCT frames**（避免四格一樣）。
8. 走路四列順序：`row1 front / row2 LEFT / row3 RIGHT / row4 back`。
9. **同一隻動物一致（重要）**：四張動作圖必須是**同一隻動物在做不同動作**，不只是顏色，
   連**畫風、體型/比例、鬃毛(毛髮)形狀與份量、五官、毛色/膚色**都要完全相同；只有姿勢/動作改變。
   - 每個 prompt 都要加上：
     `SAME-CHARACTER RULE: this is the SAME individual {{animal}} as the reference image — identical art style, body type and proportions, mane/fur shape and volume, facial features and colors (body color, belly, mane/tail shades). ONLY the pose/action changes; do NOT redesign or restyle the character, do NOT change any shade.`
   - 使用者通常是**拿上一張圖叫 AI 續畫**，所以一定要強調「沿用參考圖/上一張」。
   - 非洲獅基準：體色 golden-tan/golden-yellow、腹部淺奶油色、鬃毛與尾端 dark warm-brown、成年公獅滿鬃毛。

### 各動物畫素表（id：lion/elephant/penguin/monkey/giraffe）
| 動物 | cell | 走路(4×4) | 單排(1×4) |
|---|---|---|---|
| lion 非洲獅 | 48 | 192×192 | 192×48 |
| monkey | 42 | 168×168 | 168×42 |
| penguin | 36 | 144×144 | 144×36 |
| elephant | 72 | 288×288 | 288×72 |
| giraffe | 72 | 288×288 | 288×72 |

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
