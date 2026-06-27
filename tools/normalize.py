#!/usr/bin/env python3
"""
normalize.py — 智慧切圖：用「透明間隙」自動偵測每隻動物真正的邊界，
再等比例縮到塞進格子、水平置中、貼齊底部。比固定均分更穩，
不會因為原圖排版不均或動物超出格線而把頭/鬃毛切掉。

用法：
  python3 tools/normalize.py walk.png assets/animal_lion.png --grid 4x4 --cell 48
  python3 tools/normalize.py eat.png  assets/animal_lion_eat.png --grid 1x4 --cell 48

參數：
  --grid  RxC（列×欄）
  --cell  輸出單格像素(獅子48；其他見規格表)
  --pad   每格四周留白比例，預設 0.06
  --margin 內容底部離格底保留 px，預設 1
輸入需先去背(透明)。
"""
import argparse
import numpy as np
from PIL import Image


def runs(mask):
    """回傳 mask 中連續 True 的區段 [(start,end), ...]"""
    out = []; start = None
    for i, v in enumerate(mask):
        if v and start is None: start = i
        elif not v and start is not None: out.append((start, i)); start = None
    if start is not None: out.append((start, len(mask)))
    return out


def even(n, k):
    step = n / k
    return [(round(i * step), round((i + 1) * step)) for i in range(k)]


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
    im = Image.open(a.src).convert("RGBA")
    arr = np.array(im); H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 20

    # 偵測「列」：有內容的橫向區段；數量不符就退回均分
    rb = runs(alpha.any(axis=1))
    if len(rb) != R:
        print(f"  (列偵測得 {len(rb)} 段，與 {R} 不符，改用均分)")
        rb = even(H, R)

    cells = []  # 每格的緊緻裁切(PIL Image)
    for (y0, y1) in rb:
        band = alpha[y0:y1]
        cb = runs(band.any(axis=0))
        if len(cb) != C:
            cb = even(W, C)
        for (x0, x1) in cb:
            sub = im.crop((x0, y0, x1, y1))
            bb = sub.getbbox()
            cells.append(sub.crop(bb) if bb else None)

    valid = [c for c in cells if c]
    if not valid:
        raise SystemExit("找不到內容")
    maxw = max(c.width for c in valid); maxh = max(c.height for c in valid)
    scale = min(N * (1 - a.pad) / maxw, N * (1 - a.pad) / maxh)

    out = Image.new("RGBA", (C * N, R * N), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        if not c: continue
        r, col = divmod(i, C)
        nw, nh = max(1, round(c.width * scale)), max(1, round(c.height * scale))
        cc = c.resize((nw, nh), Image.LANCZOS)
        x = col * N + (N - nw) // 2
        y = r * N + (N - a.margin - nh)
        out.paste(cc, (x, y), cc)
    out.save(a.dst)
    print(f"✓ normalize {a.src} -> {a.dst}  grid {R}x{C} cell {N}  scale={scale:.3f}")


if __name__ == "__main__":
    main()
