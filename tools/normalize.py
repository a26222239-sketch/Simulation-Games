#!/usr/bin/env python3
"""
normalize.py — 把精靈圖每格「縮到塞進格子 + 水平置中 + 貼齊底部」
同一張圖用「統一縮放」(以最大那格為準)，所以不會變形、不會切到頭，
而且每格的腳/陰影都落在同一基準線。輸入需先去背(透明)。

用法：
  python3 tools/normalize.py walk.png walk.png --grid 4x4 --cell 48   # 走路→192x192
  python3 tools/normalize.py eat.png  eat.png  --grid 1x4 --cell 48   # 進食/睡覺/待機→192x48

參數：
  --grid  RxC（列×欄）
  --cell  輸出單格像素(獅子48；其他動物見規格表)
  --pad   每格四周留白比例，預設 0.06
  --margin 內容底部離格子底保留 px，預設 1
"""
import argparse
from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--grid", required=True)
    ap.add_argument("--cell", type=int, required=True)
    ap.add_argument("--pad", type=float, default=0.06)
    ap.add_argument("--margin", type=int, default=1)
    a = ap.parse_args()
    R, C = (int(v) for v in a.grid.lower().split("x"))
    N = a.cell
    im = Image.open(a.src).convert("RGBA"); W, H = im.size
    scw, sch = W // C, H // R

    # 取出每格內容(去白邊後的 bbox)
    cells = []
    for r in range(R):
        for c in range(C):
            cell = im.crop((c*scw, r*sch, c*scw+scw, r*sch+sch))
            bb = cell.getbbox()
            cells.append(cell.crop(bb) if bb else None)
    valid = [x for x in cells if x]
    if not valid:
        raise SystemExit("找不到內容(圖是空的?)")
    maxw = max(x.width for x in valid)
    maxh = max(x.height for x in valid)
    # 統一縮放：讓最大的內容也能塞進 (N×N) 並留 pad
    scale = min(N * (1 - a.pad) / maxw, N * (1 - a.pad) / maxh)

    out = Image.new("RGBA", (C * N, R * N), (0, 0, 0, 0))
    for i, content in enumerate(cells):
        if not content:
            continue
        r, c = divmod(i, C)
        nw, nh = max(1, round(content.width * scale)), max(1, round(content.height * scale))
        cont = content.resize((nw, nh), Image.LANCZOS)
        x = c * N + (N - nw) // 2
        y = r * N + (N - a.margin - nh)   # 貼齊底部
        out.paste(cont, (x, y), cont)
    out.save(a.dst)
    print(f"✓ normalize {a.src} -> {a.dst}  grid {R}x{C} cell {N}  scale={scale:.3f}")


if __name__ == "__main__":
    main()
