#!/usr/bin/env python3
"""
normalize_stable.py — 穩定版切圖（防飄移/閃爍）

與 normalize.py 的差別（重點）：
  ‧ normalize.py 逐格「各自置中、各自貼底」→ 每格偵測到的本體稍有不同
    (鬃毛/尾巴/陰影黏不黏) 就會把整隻移到不同位置 → 播放時飄移、頭部閃爍。
  ‧ 本工具改為「**同一列(=同一段動畫)只用一個縮放 + 一個位移**」：
    位移由該列所有格主體的「中位數中心/底部」算一次，整列套同一變換。
    → 格與格的相對位置(呼吸起伏、抬腳)完整保留，位置絕不跳動。

用法：
  python3 tools/normalize_stable.py src.png dst.png --grid 4x6 --cell 48 [--scale 0.19 | --pad 0.10]
  --grid RxC   來源網格(均分切格；來源需為均勻網格、幀間留白)
  --scale      指定整張共用縮放(跨動作對齊大小用)；不給則由主體最大邊自動算
  --pad        自動縮放時主體佔格比例(預設 0.10 → 主體最大邊 ≈ 90% 格)
  --margin     主體底部離格底 px(預設 1)
輸入需先去背(cut_keep_shadow.py)。輸出每列位置穩定、大小一致。
"""
import argparse
import numpy as np
from PIL import Image
from scipy import ndimage


def main_bbox(arr):
    """最大連通塊(本體)bbox；找不到回 None"""
    m = arr[:, :, 3] > 20
    if not m.any():
        return None
    lbl, n = ndimage.label(m)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    ys, xs = np.where(lbl == k)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def clean_edge_debris(cell, N):
    """清掉非本體、碰到上/左/右邊的碎塊(鄰格滲入)；保留 Zzz/食物/影子"""
    m = cell[:, :, 3] > 10
    lbl, n = ndimage.label(m)
    if n <= 1:
        return cell
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    for k in range(1, n + 1):
        if k == main:
            continue
        ys, xs = np.where(lbl == k)
        if ys.min() == 0 or xs.min() == 0 or xs.max() == N - 1:
            cell[lbl == k] = 0
    return cell


def runs(mask):
    out = []; s0 = None
    for i, v in enumerate(mask):
        if v and s0 is None: s0 = i
        elif not v and s0 is not None: out.append((s0, i)); s0 = None
    if s0 is not None: out.append((s0, len(mask)))
    return out


def centroid_x(arr):
    """主體(最大連通塊)的質心x — 受抬腳/伸頭影響小，逐格水平對齊不抖"""
    m = arr[:, :, 3] > 20
    if not m.any(): return None
    lbl, n = ndimage.label(m)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    _, xs = np.where(lbl == k)
    return float(xs.mean())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--grid", required=True)
    ap.add_argument("--cell", type=int, required=True)
    ap.add_argument("--scale", type=float, default=0)
    ap.add_argument("--pad", type=float, default=0.10)
    ap.add_argument("--margin", type=int, default=1)
    ap.add_argument("--nearest", action="store_true", help="像素圖用最近鄰縮放(不糊)；開羅模式一律加這個")
    a = ap.parse_args()
    R, C = (int(v) for v in a.grid.lower().split("x"))
    N = a.cell
    im = Image.open(a.src).convert("RGBA")
    arrall = np.array(im); H, W = arrall.shape[:2]
    alpha = arrall[:, :, 3] > 20

    # 列：內容帶偵測(找空白間隙切，頭不會被均分切掉)；數量不符退回均分
    rb = runs(alpha.any(axis=1))
    if len(rb) != R:
        step = H / R; rb = [(round(i * step), round((i + 1) * step)) for i in range(R)]
    # 欄：一律均分(來源為均勻網格)
    cw = W / C

    # 縮放
    cells_src = []  # [R][C] PIL cell (整帶高)
    for (y0, y1) in rb:
        row = [im.crop((round(c * cw), y0, round((c + 1) * cw), y1)) for c in range(C)]
        cells_src.append(row)
    if a.scale > 0:
        s = a.scale
    else:
        dims = []
        for row in cells_src:
            for cell in row:
                bb = main_bbox(np.array(cell))
                if bb: dims.append(max(bb[2] - bb[0], bb[3] - bb[1]))
        if not dims: raise SystemExit("找不到內容")
        s = N * (1 - a.pad) / float(np.median(dims))

    scaled, boxes, cents = [], [], []
    for row in cells_src:
        rs, rbx, rc = [], [], []
        for cell in row:
            nw, nh = max(1, round(cell.width * s)), max(1, round(cell.height * s))
            arr = np.array(cell.resize((nw, nh), Image.NEAREST if a.nearest else Image.LANCZOS))
            rs.append(arr); rbx.append(main_bbox(arr)); rc.append(centroid_x(arr))
        scaled.append(rs); boxes.append(rbx); cents.append(rc)

    out = Image.new("RGBA", (C * N, R * N), (0, 0, 0, 0))
    for r in range(R):
        bts = [b[3] for b in boxes[r] if b]
        if not bts: continue
        dy = round((N - a.margin) - float(np.median(bts)))          # Y: 同列同位移(腳穩)
        t = min(b[1] for b in boxes[r] if b); bt = max(b[3] for b in boxes[r] if b)
        dy = max(dy, 1 - t); dy = min(dy, (N - 1) - bt)
        for c in range(C):
            arr = scaled[r][c]; b = boxes[r][c]
            if b is None: continue
            cx = cents[r][c] if cents[r][c] is not None else (b[0] + b[2]) / 2
            dx = round(N / 2 - cx)                                  # X: 逐格質心置中(不搖晃)
            dx = max(dx, 1 - b[0]); dx = min(dx, (N - 1) - b[2])    # 留邊保護
            h, w = arr.shape[:2]
            cellout = np.zeros((N, N, 4), np.uint8)
            sx0, sy0 = max(0, -dx), max(0, -dy)
            tx0, ty0 = max(0, dx), max(0, dy)
            wcopy = min(w - sx0, N - tx0); hcopy = min(h - sy0, N - ty0)
            if wcopy > 0 and hcopy > 0:
                cellout[ty0:ty0 + hcopy, tx0:tx0 + wcopy] = arr[sy0:sy0 + hcopy, sx0:sx0 + wcopy]
            cellout = clean_edge_debris(cellout, N)
            out.paste(Image.fromarray(cellout, "RGBA"), (c * N, r * N))
    out.save(a.dst)
    print(f"✓ normalize_stable {a.src} -> {a.dst}  grid {R}x{C} cell {N}  scale={s:.4f} (X質心/Y同列)")

if __name__ == "__main__":
    main()
