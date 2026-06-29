# 迷你動物園 — 立繪 / 精靈圖製作指南（給 GPT 生圖用）

把這份規格照著做，生出來的圖丟進 `assets/`，遊戲就能直接套用。

---

## 0. 共同規則（所有圖都適用，放進每個 prompt）

- **風格**：可愛 cartoon 畫風（成年體型，非嬰兒比例）、扁平上色 + 柔和 cel-shading、細的深色描邊、光源左上、色彩明亮乾淨。
- **背景（規則）**：**一律用「純白背景」(solid plain white background)**。
  不要透明、不要棋盤格、不要漸層、不要地板/邊框/文字。
- **陰影（規則，重要）**：**每一格底部都要自帶一個橢圓陰影**，動物站/趴在陰影上；
  陰影在每一格的**大小與位置都一致**（不然切換動作會跳）。
  **陰影要畫「深色」(深灰，約 #555555，不透明、邊緣可微羽化)**——越深、和純白背景對比越大，
  去背越乾淨。不要用淺灰或半透明淡影。
  ＊規則：**所有動物的陰影一律畫進圖檔裡**，遊戲端不再用程式畫影子
  （`config.js` 把該動物設 `bakedShadow: true`）。
- **體型（規則）**：所有動物畫**成年**體型（mature/adult proportions），不要幼體/Q嬰兒比例；
  維持同一套可愛 cartoon 畫風。
- **同一隻動物一致（規則，重要）**：走路/進食/睡覺/待機四張必須是**同一隻動物做不同動作**——
  不只是顏色，連**畫風、體型/比例、鬃毛(毛髮)形狀與份量、五官、毛色/膚色**都要完全相同，只有姿勢改變
  （GPT 每次會飄）。**分兩種寫法**：
  - **走路(第一張＝基準)**：不寫「跟前一張一致」（沒有前一張）。改成**具體詳述這隻動物所有特徵**當角色設定，
    讓後面的圖有依循基礎。
  - **進食/睡覺/待機**：使用者會**上傳走路那張當參考圖**再生，務必加：
    `SAME-CHARACTER RULE: this is the SAME individual animal as the reference image (the walk sheet) — identical art style, body type and proportions, mane/fur shape and volume, facial features and colors. ONLY the pose/action changes; do NOT redesign or restyle the character, do NOT change any shade.`
- **畫素 / 大小一致（規則，最重要）**：
  1. **每個 prompt 都要寫明確切畫素**：整張畫布尺寸＋單格(cell)尺寸（見下表），讓 AI 固定畫素輸出；
     後製只負責去背與輕微對齊，**不再每張各自縮放**。
  2. **同一隻動物在「走路/進食/睡覺/待機」四張圖裡必須同一個大小**：
     以**走路側面**為基準，動物的「站立身高(肩高/體高)」在四張圖完全一致。
     ＊**進食/睡覺/待機不要放大或拉近**動物——只換動作，體型大小不變。
  3. 動物本體**佔單格高度約 80%**，腳底（含陰影）貼齊格底、頂端留約 10% 邊距；四張圖佔比一致。
- **幀間距（規則，根治剪到鄰格）**：每格之間留**明顯空白間距**，動物**連同陰影**完整置中於自己格內、四周留白，
  **不可碰到或越過格線、不可與鄰格重疊**。`leave generous empty padding around each pose INCLUDING its shadow;
  keep every frame fully inside its own cell with clear empty gaps between all frames; nothing touches or crosses cell borders.`
- **Zzz（規則）**：睡覺的 z/Zz/Zzz 畫**大且粗體、清楚可讀**，第一格 z 也別太小（太小縮圖會糊/消失）。
- **去背（規則）**：動物精靈圖一律用 `tools/cut_keep_shadow.py`（rembg 取乾淨剪影＋保留原圖非白的陰影/Zzz/食物，
  並去掉腿縫白塊）。**不要**用純 rembg（會連陰影吃掉），也不要只用 flood-fill（腿縫會殘白）。
- **視角**：2.5D 等距風的「直立看板(billboard)」角色——角色站直、略為俯視 3/4 視角（約離地平線 30°）。
- **構圖**：角色**水平置中**，**腳底貼齊畫面底部**（留約 6px 邊距）；同一張圖裡每一格的**大小、比例、顏色完全一致**。
- **解析度**：先用 1024×1024 生成，再縮小到下面指定的目標尺寸（縮圖較銳利）。

> 提示：若模型一次排不好整張網格，就「一個方向(一橫排4格)分開生」或「一格一格生」，最後再拼。

---

## 1. 動物（會走動的動圖）★最重要

**★ 單格像素依「動物體型」調整（以獅子 48×48 為基準）**

不同動物天生大小不同，**單格(frame)像素**要照體型縮放（遊戲會依此載入並顯示）：

| 動物 | 單格 frame | 走路整張(6欄×4列) | 進食/睡覺(1×6：frame×6 寬 × frame 高) |
|---|---|---|---|
| 獅子 lion | 48 | 288×192 | 288×48 |
| 猴子 monkey | 42 | 252×168 | 252×42 |
| 企鵝 penguin | 36 | 216×144 | 216×36 |
| 大象 elephant | 72 | 432×288 | 432×72 |
| 長頸鹿 giraffe | 72 | 432×288 | 432×72 |

> 動物要**畫滿整格、腳＋陰影貼格子底部**；格子大小不同就是體型差異的來源。
> 若 AI 不好控制像素，生大張(1024)再用 `cutout.py --resize` 縮到上表尺寸即可
> （例：大象走路 `--resize 288x288`、企鵝進食 `--resize 144x36`）。

**遊戲需要的規格**
- 檔名：`assets/animal_<id>.png`（id：`lion` / `elephant` / `penguin` / `monkey` / `giraffe`）
- 一張**精靈圖 sprite sheet**：**4 列 × 4 欄**
  - 列（上到下）＝面向：**第1列 面向鏡頭(前)、第2列 面向左、第3列 面向右、第4列 背對(後)**
  - 欄（左到右）＝走路 4 連續動作（走路循環）
- 單格與整張畫素見上表（獅子 cell48/整張192×192；大象 cell72/整張288×288）。**prompt 要寫死這些數字。**

### 通用 prompt 模板（把 {{ }} 換掉；{{CELL}}=單格px、{{SHEET}}=整張px，見上表）
```
A cute cartoon {{ANIMAL}} character sprite sheet for a 2.5D isometric zoo game, ADULT proportions.
Output EXACT pixel size: a 6x4 grid, each cell EXACTLY {{CELL}}x{{CELL}} px, total image EXACTLY {{SHEET}} px, solid plain white background.
Rows top-to-bottom = facing direction: row1 facing the camera (front), row2 facing LEFT,
row3 facing RIGHT, row4 facing away (back).
Columns left-to-right = a 6-frame walk cycle (legs alternating), looping smoothly, each frame DISTINCT.
Style: flat colors with soft cel shading, thin dark outline, top-left light, bright and clean.
SIZE RULE: the animal's standing body fills about 80% of the cell height, centered, feet aligned to the bottom of the cell;
the SAME size in all 16 frames (do not zoom in/out between frames). This is the reference size — eat/sleep/idle sheets MUST use the exact same animal size.
Under the character in EVERY frame, the SAME DARK grey oval shadow (deep grey ~#555555, opaque, soft edge) at the very bottom; it stands on the shadow.
Solid plain white background, no ground texture, no text, no frame borders.
{{APPEARANCE}}
```

### 各動物的 {{APPEARANCE}}（替換用）
- **lion 非洲獅（成年公獅）**：`Adult male AFRICAN lion with a full thick dark-brown mane around the head and chest, golden-tan body, strong mature proportions, a tufted tail tip; clearly an adult lion, NOT a cub.`
- **elephant 大象（成年象）**：`Adult grey elephant with a big sturdy body, long thick legs, a long curled trunk, large ears, visible white tusks; mature proportions (NOT a baby, small head relative to the large body).`
- **penguin 企鵝**：`Small black-and-white penguin, white belly, orange beak and feet, waddling pose.`
- **monkey 猴子**：`Brown monkey with a lighter face and belly, long curly tail, big rounded ears.`
- **giraffe 長頸鹿**：`Yellow giraffe with brown patches, a long neck, two small horns (ossicones), tall thin legs.`

> 大象/長頸鹿體型較大：可生成 64×64 但角色佔滿格高（仍腳貼底、頭可頂到上緣）。

### 若 4×4 網格生不好 → 改用「單排方向」prompt（生 4 次，每次一個方向）
```
A cute cartoon {{ANIMAL}} ({{APPEARANCE}}), facing {{DIRECTION: front/left/right/back}},
a horizontal strip of 6 walk-cycle frames, each 64x64 px (strip 256x64), solid plain white background,
flat colors + soft cel shading, thin outline, centered, feet at bottom, consistent across frames,
with the SAME DARK grey oval shadow (deep grey ~#555555, opaque) under the feet in every frame, no text.
```

### 動作狀態（走路 / 進食 / 睡覺）— 多張檔案

遊戲會依動物狀態自動切換動畫。每種動物**最多 3 個檔**（缺的會自動退回走路/待機）：

（尺寸欄以獅子 48 為例；其他動物見上方體型表。）

| 狀態 | 檔名 | 排版 | 尺寸(獅子) | 視角 |
|---|---|---|---|---|
| 走路 | `assets/animal_<id>.png` | 4列(前/左/右/後)×6格 | 288×192 | 各方向 |
| 待機 | `assets/animal_<id>_idle.png` | 1排×6格 | 288×48 | 側面坐姿 |
| 打哈欠 | `assets/animal_<id>_yawn.png` | 1排×6格 | 288×48 | 側面坐姿 |
| 進食 | `assets/animal_<id>_eat.png` | 1排×6格 | 288×48 | 側面即可 |
| 睡覺 | `assets/animal_<id>_sleep.png` | 1排×6格 | 288×48 | 側面躺下 |

> 待機**可不畫**：沒給待機圖時，遊戲會用走路圖的站立格定格。想更生動再畫。

> ⚠️ 重點：AI 常把「a strip of 6 frames」畫成四張一樣的。**一定要逐格寫清楚每格差異、並強調 6 DISTINCT frames**，動畫才有變化。

**進食 prompt**（白底、自帶陰影、逐格描述；{{ }} 換成動物）
```
A cute cartoon {{ANIMAL}} ({{APPEARANCE}}), ADULT proportions, side view facing LEFT, an EATING animation as ONE horizontal strip of 6 DISTINCT frames (left to right). FOOD on the floor in front: {{FOOD}}.
Output EXACT pixel size: one horizontal strip, each cell EXACTLY {{CELL}}x{{CELL}} px, total {{STRIP}} px, solid plain white background.
SIZE RULE: the animal is the EXACT SAME size as in the walk sheet — do NOT zoom in.
ANIMATION STRUCTURE (important): frames 1-5 are a SEAMLESS LOOPING chew cycle, frame 6 is the finished state.
Frame 1: head lowered to the food, mouth just closing on it (chewing).
Frame 2: jaw opening a little (chewing).
Frame 3: jaw open wide, taking a bite (chewing).
Frame 4: jaw closing again (chewing).
Frame 5: mouth closed, head in the same lowered position — drawn so it flows SEAMLESSLY back into Frame 1 (a perfect loop).
Frame 6: head lifted up; the food is finished — only the bare bone remains.
CONTACT RULE: the lion's open mouth/muzzle is RIGHT ON the meat, actually biting and touching it — the head is lowered ALL THE WAY DOWN to the food; do NOT leave a gap (no biting the air above the meat).
LOOP RULE: in frames 1-5 the head stays DOWN with the mouth on the meat and ONLY the jaw moves (a small chewing cycle); frame 5 must connect smoothly to frame 1 so looping 1→2→3→4→5→1 is continuous (no jump).
FOOD RULE: in frames 1-5 the meat keeps the EXACT SAME shape, size, color and position in every frame — the meat outline must NOT change at all (this is required for a smooth loop). In frame 6 only the bare bone remains, and that bone is the EXACT SAME size as the bone that is part of the meat in frames 1-5.
Everything else not mentioned (appearance, colors, body pose) stays unchanged across all frames.
Under the animal in EVERY frame, the SAME DARK grey oval shadow (deep grey ~#555555, opaque, soft edge) at the very bottom; fully inside the cell.
SPACING RULE: leave generous empty padding around the animal, its shadow and the food; each frame fully inside its own cell with clear gaps; nothing touches or crosses the cell borders.
Style: flat colors, soft cel shading, thin dark outline, top-left light. Solid plain white background, no ground texture, no text.
({{FOOD}} — lion/monkey: red meat on a bone; elephant/giraffe: hay or leaves; penguin: small fish.)
```

**睡覺 prompt**（白底、自帶陰影、逐格描述）
```
A cute cartoon {{ANIMAL}} ({{APPEARANCE}}), ADULT proportions, side view facing LEFT, lying down asleep — a SLEEPING animation as ONE horizontal strip of 6 DISTINCT frames (left to right), each frame clearly different so it animates:
Output EXACT pixel size: one horizontal strip, each cell EXACTLY {{CELL}}x{{CELL}} px, total {{STRIP}} px, solid plain white background.
SIZE RULE: the animal is the EXACT SAME size as in the walk sheet (same body scale) — do NOT zoom in; a lying lion just occupies a lower, longer area but at the same scale.
Frame 1: lying curled on its side, belly fully exhaled (lowest), eyes closed, a tiny "z" above the head.
Frame 2: belly inhaling a little (slightly puffed), a small "Zz" rising higher.
Frame 3: belly fully inhaled (puffed up the most), a larger "Zzz" floating up.
Frame 4: belly exhaling again (settling down), the "Zzz" fading near the top.
Keep the animal in the SAME spot and lying pose; ONLY the belly size (breathing) and the floating "Zzz" change between frames.
Under the animal in EVERY frame, the SAME DARK grey oval shadow (deep grey ~#555555, opaque, soft edge) at the very bottom; it lies on the shadow.
Style: flat colors, soft cel shading, thin dark outline, top-left light. Centered, body and shadow at the bottom, same size/colors/position across frames except breathing and Zzz.
Solid plain white background. No ground texture, no text other than the Zzz.
```

**待機 prompt（打哈欠，白底、自帶陰影、逐格描述）**
```
A cute cartoon {{ANIMAL}} ({{APPEARANCE}}), ADULT proportions, side view facing LEFT, standing still — an IDLE animation as ONE horizontal strip of 6 DISTINCT frames (left to right), each frame clearly different so it animates:
Output EXACT pixel size: one horizontal strip, each cell EXACTLY {{CELL}}x{{CELL}} px, total {{STRIP}} px, solid plain white background.
SIZE RULE: the animal is the EXACT SAME size as in the walk sheet (same standing body height) — do NOT zoom in.
Frame 1: standing relaxed, mouth closed, eyes open, neutral.
Frame 2: starting to yawn — mouth opening a little, head tilting up slightly, eyes beginning to squint.
Frame 3: a big wide yawn — mouth open wide (show a little tongue), eyes squeezed shut.
Frame 4: closing the mouth, looking sleepy/content, eyes half-open.
Keep the animal standing in the SAME spot; only the mouth/head/eyes change between frames.
Under the animal in EVERY frame, the SAME DARK grey oval shadow (deep grey ~#555555, opaque, soft edge) at the very bottom; it stands on the shadow.
Style: flat colors, soft cel shading, thin dark outline, top-left light. Centered, feet and shadow at the bottom, same size/colors/position across frames except the yawn.
Solid plain white background. No ground texture, no text.
```

> 待機/進食/睡覺用**側面單排 4 格**即可（遊戲不分方向播放）。**逐格描述**是讓四格不同的關鍵。

---

## 2. 遊客（在步道走動的人）

**規格**：`assets/visitor.png`（也可做多張 `visitor_1.png`…當不同路人）
- 4 列(方向，同上) × 4 欄(走路)，單格 **48×64 px**，整張 **192×256 px**，透明背景。

```
A cute chibi human visitor sprite sheet for a 2.5D isometric zoo game.
Layout: 4x4 grid, each cell 48x64 px, total 192x256 px, solid plain white background.
Rows = facing front/left/right/back; columns = a 6-frame walk cycle.
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
draw a horizontal strip of 6 walk-cycle frames facing {{DIRECTION}}, evenly spaced,
same flat magenta (#FF00FF) background, same size, no shadow, no text.
```
3. 去背（把洋紅扣掉）→ 縮放 → 拼成 256×256 的 4×4（見下方流程）。

> 純洋紅 `#FF00FF`（或純綠 `#00FF00`）幾乎不會出現在動物身上，去背最乾淨。
> Imagen（Google 另一個生圖模型）畫質高但不擅長「同角色換姿勢」，做精靈圖請用 **Gemini 2.5 Flash Image** 那個會「改圖/對話」的。

---

## 6. 生圖後的處理流程（重點）

1. **去背（動物精靈圖一律用 cut_keep_shadow.py）**：
   - **自帶陰影的動物圖（標準流程）**：
     `python3 tools/cut_keep_shadow.py in.png out.png --grid 4x4`（單排用 `--grid 1x4`）
     → 再 `python3 tools/normalize.py out.png assets/animal_<id>.png --grid 4x4 --cell <N>`。
     會保留陰影/Zzz/食物、去掉腿縫白、眼白不受影響。
   - 其他素材（建築/樹/無陰影圖）才用：`tools/cutout.py --bg FFFFFF`（白底）、
     `tools/chroma_key.py --color FF00FF`（洋紅/綠底）。
   - ⚠️ 不要對「自帶陰影」的動物用純 rembg（`removebg.py`）：會把陰影一起去掉。
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
