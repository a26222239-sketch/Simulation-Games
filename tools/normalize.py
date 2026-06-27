#!/usr/bin/env python3
"""
normalize.py — 智慧切圖：用「透明間隙」自動偵測每隻動物真正的邊界，
再等比例縮到塞進格子、水平置中、貼齊底部。

重點：縮放與對齊只看「主體（最大連通塊＝動物本體）」，
不把 Zzz、肉、骨頭等小附件算進去，這樣動物在走路/睡覺/待機/進食
四張圖裡都維持一致大小，不會因為附件出現就忽大忽小。

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
from scipy import ndimage


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


def main_bbox(sub):
    """找出主體(最大連通塊)的 bbox (l, t, r, b)；找不到則回 None。"""
    arr = np.array(sub)
    mask = arr[:, :, 3] > 20
    if not mask.any():
        return None
    lbl, n = ndimage.label(mask)
    if n == 0:
        return None
    # 各連通塊面積（索引 0 是背景）
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    ys, xs = np.where(lbl == main)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--grid", required=True)
    ap.add_argument("--cell", type=int, required=True)
    ap.add_argument("--pad", type=float, default=0.06)
    ap.add_argument("--margin", type=int, default=1)
    ap.add_argument("--scale", type=float, default=0,
                    help="指定固定縮放倍率(>0)；多張圖共用同一值可讓動物大小完全一致")
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

    # 每格：保留整格內容(含附件)的緊緻裁切 + 主體在裁切內的 bbox
    cells = []  # (full_crop_image | None, lion_bbox_in_crop | None)
    for (y0, y1) in rb:
        band = alpha[y0:y1]
        cb = runs(band.any(axis=0))
        if len(cb) != C:
            cb = even(W, C)
        for (x0, x1) in cb:
            sub = im.crop((x0, y0, x1, y1))
            bb = sub.getbbox()
            if not bb:
                cells.append((None, None)); continue
            crop = sub.crop(bb)
            lb = main_bbox(crop)        # 主體 bbox（相對 crop）
            cells.append((crop, lb))

    lions = [lb for (_, lb) in cells if lb]
    if not lions:
        raise SystemExit("找不到內容")
    # 只用主體(動物本體)的尺寸決定縮放，附件不參與
    maxw = max(lb[2] - lb[0] for lb in lions)
    maxh = max(lb[3] - lb[1] for lb in lions)
    if a.scale > 0:
        scale = a.scale
    else:
        scale = min(N * (1 - a.pad) / maxw, N * (1 - a.pad) / maxh)

    out = Image.new("RGBA", (C * N, R * N), (0, 0, 0, 0))
    for i, (crop, lb) in enumerate(cells):
        if not crop or not lb: continue
        r, col = divmod(i, C)
        nw, nh = max(1, round(crop.width * scale)), max(1, round(crop.height * scale))
        cc = crop.resize((nw, nh), Image.LANCZOS)
        # 主體在縮放後的座標
        lx0, ly0, lx1, ly1 = (v * scale for v in lb)
        lion_cx = (lx0 + lx1) / 2.0      # 主體水平中心
        lion_bottom = ly1                # 主體底部
        # 對齊：主體中心 → 格中心；主體底部 → 距格底 margin
        x = col * N + round(N / 2.0 - lion_cx)
        y = r * N + round((N - a.margin) - lion_bottom)
        out.paste(cc, (x, y), cc)
    out.save(a.dst)
    print(f"✓ normalize {a.src} -> {a.dst}  grid {R}x{C} cell {N}  lion {maxw}x{maxh} scale={scale:.3f}")


if __name__ == "__main__":
    main()
