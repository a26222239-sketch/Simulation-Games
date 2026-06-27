# 去背工具（把生成的立繪/精靈圖去背成透明 PNG）

放生圖後處理用的小工具。兩種方式，依背景選用：

| 背景情況 | 用哪個 | 需要下載模型？ |
|---|---|---|
| **白底/單色底（推薦）** | `cutout.py`（從邊緣去背，保留主體內白色） | 否（快、乾淨） |
| 純色底（洋紅/綠）整片去 | `chroma_key.py` | 否 |
| **任意/複雜背景**（陰影、漸層、實景） | `removebg.py`（開源 rembg） | 是（首次約 170MB） |

> `cutout.py` 最適合「叫 AI 畫純白背景」的情況——它只移除跟邊緣相連的背景，
> 所以動物的白肚子、白眼睛不會被誤刪，還能順手 `--resize`。
> 例：`python3 tools/cutout.py in.png assets/animal_lion_eat.png --bg FFFFFF --resize 256x64`

> 這些是「在你電腦上跑」的前處理工具，跟網頁遊戲本身無關。處理完的透明 PNG 放進 `assets/` 即可。

---

## 1. chroma_key.py（純色去背，已測試可用）

只需 Pillow：
```bash
pip install pillow
```
用法：
```bash
# 單張
python3 tools/chroma_key.py in.png out.png --color FF00FF --fuzz 0.12
# 整個資料夾批次
python3 tools/chroma_key.py 生圖資料夾/ assets/ --color FF00FF
```
- `--color`：背景色（不含 #）。Gemini 建議 `FF00FF`（洋紅）或 `00FF00`（綠）。
- `--fuzz`：容許誤差 0~1，邊緣有殘色就調大（如 `0.2`）。

## 2. removebg.py（開源 rembg，任意背景）

GitHub: https://github.com/danielgatis/rembg （U²-Net）
```bash
pip install "rembg[cli]" pillow onnxruntime
# 首次執行會自動下載模型(約170MB)，需要可連網的環境。
```
用法：
```bash
python3 tools/removebg.py in.png out.png          # 單張
python3 tools/removebg.py 生圖資料夾/ assets/       # 批次
```
也可直接用 rembg 內建 CLI：`rembg i in.png out.png`。

---

## 建議流程（搭配 docs/ART_PROMPTS.md）

1. 用 **Gemini** 生角色各方向走路格（畫在洋紅 `#FF00FF` 底）。
2. `chroma_key.py` 去背成透明。
3. 若是分開生的單格/單排，拼成 4×4 的精靈圖（Piskel / Aseprite）。
4. 命名 `animal_<id>.png` / `visitor.png` / `cafe.png` …放進 `assets/`，遊戲自動採用並播放走路動畫。
