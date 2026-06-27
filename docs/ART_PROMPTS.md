# 迷你動物園 — 立繪 / 精靈圖製作指南（給 GPT 生圖用）

把這份規格照著做，生出來的圖丟進 `assets/`，遊戲就能直接套用。

---

## 0. 共同規則（所有圖都適用，放進每個 prompt）

- **風格**：可愛 Q 版（chibi）、扁平上色 + 柔和 cel-shading、細的深色描邊、光源左上、色彩明亮乾淨。
- **背景（規則）**：**一律用「純白背景」(solid plain white background)**。
  不要透明、不要棋盤格、不要漸層、不要地板/陰影/邊框/文字（遊戲會自己畫影子）。
  生完用 `tools/cutout.py --bg FFFFFF` 從邊緣去背（會保留動物身上的白色部位）。
  ＊每個 prompt 結尾都已含「solid plain white background」這句，照用即可。
- **視角**：2.5D 等距風的「直立看板(billboard)」角色——角色站直、略為俯視 3/4 視角（約離地平線 30°）。
- **構圖**：角色**水平置中**，**腳底貼齊畫面底部**（留約 6px 邊距）；同一張圖裡每一格的**大小、比例、顏色完全一致**。
- **解析度**：先用 1024×1024 生成，再縮小到下面指定的目標尺寸（縮圖較銳利）。

> 提示：若模型一次排不好整張網格，就「一個方向(一橫排4格)分開生」或「一格一格生」，最後再拼。

---

## 1. 動物（會走動的動圖）★最重要

**遊戲需要的規格**
- 檔名：`assets/animal_<id>.png`（id：`lion` / `elephant` / `penguin` / `monkey` / `giraffe`）
- 一張**精靈圖 sprite sheet**：**4 列 × 4 欄**
  - 列（上到下）＝面向：**第1列 面向鏡頭(前)、第2列 面向左、第3列 面向右、第4列 背對(後)**
  - 欄（左到右）＝走路 4 連續動作（走路循環）
- 單格 **64×64 px**，整張 **256×256 px**，透明背景。

### 通用 prompt 模板（把 {{ }} 換掉）
```
A cute chibi {{ANIMAL}} character sprite sheet for a 2.5D isometric zoo game.
Layout: a 4x4 grid, each cell 64x64 px, total image 256x256 px, solid plain white background.
Rows top-to-bottom = facing direction: row1 facing the camera (front), row2 facing left,
row3 facing right, row4 facing away (back).
Columns left-to-right = a 4-frame walk cycle (legs alternating), looping smoothly.
Style: flat colors with soft cel shading, thin dark outline, top-left light, bright and clean.
The character is centered in each cell, feet aligned to the bottom of the cell, consistent size and
colors across all 16 frames. No background, no ground, no drop shadow, no text, no frame borders.
{{APPEARANCE}}
```

### 各動物的 {{APPEARANCE}}（替換用）
- **lion 獅子**：`Golden-yellow lion with a fluffy brown mane around the head, small round ears, friendly face.`
- **elephant 大象**：`Light grey elephant with big floppy ears, a short curled trunk, small tusks, chunky legs.`
- **penguin 企鵝**：`Small black-and-white penguin, white belly, orange beak and feet, waddling pose.`
- **monkey 猴子**：`Brown monkey with a lighter face and belly, long curly tail, big rounded ears.`
- **giraffe 長頸鹿**：`Yellow giraffe with brown patches, a long neck, two small horns (ossicones), tall thin legs.`

> 大象/長頸鹿體型較大：可生成 64×64 但角色佔滿格高（仍腳貼底、頭可頂到上緣）。

### 若 4×4 網格生不好 → 改用「單排方向」prompt（生 4 次，每次一個方向）
```
A cute chibi {{ANIMAL}} ({{APPEARANCE}}), facing {{DIRECTION: front/left/right/back}},
a horizontal strip of 4 walk-cycle frames, each 64x64 px (strip 256x64), solid plain white background,
flat colors + soft cel shading, thin outline, centered, feet at bottom, consistent across frames,
no background, no shadow, no text.
```

### 動作狀態（走路 / 進食 / 睡覺）— 多張檔案

遊戲會依動物狀態自動切換動畫。每種動物**最多 3 個檔**（缺的會自動退回走路/待機）：

| 狀態 | 檔名 | 排版 | 尺寸 | 視角 |
|---|---|---|---|---|
| 走路 | `assets/animal_<id>.png` | 4列(前/左/右/後)×4格 | 256×256 | 各方向 |
| 進食 | `assets/animal_<id>_eat.png` | 1排×4格 | 256×64 | 側面即可 |
| 睡覺 | `assets/animal_<id>_sleep.png` | 1排×4格 | 256×64 | 側面躺下 |

**進食 prompt**（白底；{{ }} 換成動物）
```
A cute chibi {{ANIMAL}} ({{APPEARANCE}}), side view, an EATING animation:
a horizontal strip of 4 frames (each 64x64 px, strip 256x64). In front of the animal there is FOOD on
the floor ({{FOOD}}); the animal lowers its head to the food and chews, looping.
Solid plain WHITE background. Flat colors, soft cel shading, thin dark outline, top-left light.
Centered, feet at the bottom, identical size/colors across frames. No drop shadow, no text.
({{FOOD}} examples — lion/monkey: a piece of red meat on a bone; elephant/giraffe: a pile of hay or leaves;
penguin: a few small fish; pick what fits the animal.)
```

**睡覺 prompt**（白底）
```
A cute chibi {{ANIMAL}} ({{APPEARANCE}}), side view, a SLEEPING animation:
a horizontal strip of 4 frames (each 64x64 px, strip 256x64), the animal lies down curled up and
breathes slowly (body gently rises and falls), with small "Zzz" above, looping.
Solid plain WHITE background. Flat colors, soft cel shading, thin dark outline, top-left light.
Centered, lying on the bottom of each frame, identical across frames. No ground, no shadow.
```

> 進食/睡覺用**側面單排 4 格**就好，不必畫四個方向（遊戲不分方向播放）。

---

## 2. 遊客（在步道走動的人）

**規格**：`assets/visitor.png`（也可做多張 `visitor_1.png`…當不同路人）
- 4 列(方向，同上) × 4 欄(走路)，單格 **48×64 px**，整張 **192×256 px**，透明背景。

```
A cute chibi human visitor sprite sheet for a 2.5D isometric zoo game.
Layout: 4x4 grid, each cell 48x64 px, total 192x256 px, solid plain white background.
Rows = facing front/left/right/back; columns = a 4-frame walk cycle.
A casual park visitor (t-shirt and shorts, simple shoes), cheerful, chibi proportions
(big head, small body). Flat colors, soft cel shading, thin outline, top-left light.
Centered, feet at bottom, identical size/colors across all frames.
No background, no ground shadow, no text. Vary only the shirt color between different visitor files.
```

---

## 3. 建築（咖啡廳 / 紀念品店）— 等距單張圖

**規格**：`assets/cafe.png`、`assets/souvenir.png`
- **等距 2:1 透視**的單一建築，佔地 2×2 格。
- 建議畫布 **128×160 px**（底部 128px 寬對齊 2×2 的菱形底面，上方留高度給屋頂）。
- 底部中央對齊地面，透明背景。

```
An isometric 2.5D {{cafe / souvenir shop}} building for a cute zoo game, dimetric 2:1 perspective
(matching 64x32 isometric tiles). The building footprint covers a 2x2 tile area; the base of the
building is 128 px wide and bottom-center aligned. Canvas 128x160 px, solid plain white background.
Cute cartoon style, flat colors, soft cel shading, thin outline, top-left light.
{{cafe: warm brown wooden cafe with a coffee-cup sign and a small awning}}
{{souvenir: blue gift shop with a present/gift sign and a striped awning}}
No ground tile, no shadow, no text other than a tiny icon on the sign.
```

---

## 4. 樹木 / 植物

**規格**：`assets/tree.png`
- 畫布 **64×96 px**，樹幹**底部中央**對齊地面，透明背景。

```
A cute cartoon tree for an isometric zoo game. Canvas 64x96 px, solid plain white background.
Round leafy green canopy with soft cel shading, short brown trunk centered at the bottom.
Flat colors, thin outline, top-left light. No ground, no shadow, no text.
```

---

## 5. 地磚（選配，想換掉純色地面再做）

**規格**：菱形地磚 **64×32 px**，透明背景，可無縫拼接。
- `assets/ground_grass.png`、`assets/ground_path.png`、`assets/ground_plaza.png`

```
A single isometric ground tile, diamond/rhombus shape exactly 64x32 px, top-down 2:1 dimetric,
seamless tileable, solid plain white background outside the diamond. {{grass: green grass texture}}
{{path: light sandy/dirt path}} {{plaza: light stone pavement}}. Flat colors, subtle texture,
soft top-left light, no objects, no shadow, no text.
```

---

## 5.5 用 Gemini（Gemini 2.5 Flash Image / Nano Banana）vs GPT

兩個 AI 互補，建議分工：

| 需求 | 建議工具 | 原因 |
|---|---|---|
| 同一隻動物的 16 格保持一致 | **Gemini** | 可上傳基準圖、對話式「同角色換方向/動作」，一致性最強 |
| 乾淨透明背景 | **GPT (gpt-image-1)** | 可直接指定 transparent background，去背最省事 |
| 建築 / 樹 / 地磚（單張） | 兩者皆可 | — |

**Gemini 的正確用法 = 上傳參考圖 + 對話迭代**（不要每次從零生）。
因為 Gemini 透明背景較不穩，請它畫在**純洋紅 `#FF00FF` 背景**上，最後再去背。

**步驟**
1. 生基準站姿（面向鏡頭）：
```
Cute chibi {{ANIMAL}} ({{APPEARANCE}}), facing the camera, standing.
2.5D isometric zoo game style: flat colors, soft cel shading, thin dark outline, top-left light.
Solid flat magenta (#FF00FF) background, no shadow, no text. Square image.
```
2. **上傳上一步的圖**，逐方向產生走路 4 格（front / left / right / back 各跑一次）：
```
Using THIS exact character — keep identical colors, shapes and proportions —
draw a horizontal strip of 4 walk-cycle frames facing {{DIRECTION}}, evenly spaced,
same flat magenta (#FF00FF) background, same size, no shadow, no text.
```
3. 去背（把洋紅扣掉）→ 縮放 → 拼成 256×256 的 4×4（見下方流程）。

> 純洋紅 `#FF00FF`（或純綠 `#00FF00`）幾乎不會出現在動物身上，去背最乾淨。
> Imagen（Google 另一個生圖模型）畫質高但不擅長「同角色換姿勢」，做精靈圖請用 **Gemini 2.5 Flash Image** 那個會「改圖/對話」的。

---

## 6. 生圖後的處理流程（重點）

1. **去背（推薦白底 → cutout.py）**：
   - **白底（推薦）**：`python3 tools/cutout.py in.png out.png --bg FFFFFF --resize 256x256`
     （進食/睡覺單排用 `--resize 256x64`）。從邊緣去背，動物身上的白色不會被刪。
   - 純洋紅/綠底：`python3 tools/chroma_key.py in.png out.png --color FF00FF`。
   - 複雜背景：`python3 tools/removebg.py in.png out.png`（開源 rembg）。
2. **縮小到目標尺寸**：1024 生成 → 縮到 256×256（動物）/ 192×256（遊客）等。
3. **對齊/切割**：精靈圖每格必須等分對齊。若是分開生的單格/單排，用免費工具拼成網格：
   - Piskel、Aseprite、TexturePacker，或用簡單腳本（ImageMagick `montage`）。
   - ImageMagick 例：`montage front*.png left*.png right*.png back*.png -tile 4x4 -geometry 64x64+0+0 -background none animal_lion.png`
4. **命名**照上面放進 `assets/`。

---

## 7. 一致性小技巧（讓 16 格像同一隻）

- 先固定一段「角色描述」文字，每次生圖都原封不動帶上。
- 先生「面向鏡頭那一排」當基準，再要求：「**same character, same colors and size, now facing left, 4 walk frames**」。
- 一次只改「方向」或「動作」，不要同時改外觀。
- 生太多細節會跑掉 → 保持 chibi、扁平、簡單。

---

## 8. 接進遊戲（我來做）

你把圖放好後告訴我，我會在 `js/draw.js` 把對應的程式繪製改成 Phaser 圖片/精靈圖：
- 動物/遊客：`this.load.spritesheet(id, "assets/xxx.png", { frameWidth, frameHeight })`
  → `this.anims.create(...)` 依方向與走路格播放，`sprite.setDepth(fx+fy)`。
- 建築/樹/地磚：`this.load.image` → `this.add.image(...)`，底部中央對齊。

> 偷懶版：如果精靈圖太難生，每隻動物只給**一張靜態正面圖**也行，遊戲會用程式做上下彈跳；
> 之後再補走路格即可。
