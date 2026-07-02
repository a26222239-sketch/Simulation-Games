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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--grid", required=True)
    ap.add_argument("--cell", type=int, required=True)
    ap.add_argument("--scale", type=float, default=0)
    ap.add_argument("--pad", type=float, default=0.10)
    ap.add_argument("--margin", type=int, default=1)
    a = ap.parse_args()
    R, C = (int(v) for v in a.grid.lower().split("x"))
    N = a.cell
    im = Image.open(a.src).convert("RGBA")
    W, H = im.size
    cw, ch = W / C, H / R

    # 1) 均分切格 + 整格縮放（保留格內相對位置）
    scaled = []   # [R][C] -> np arr (縮放後整格)
    boxes = []    # [R][C] -> 主體 bbox(縮放後座標) or None
    # 先決定 scale
    if a.scale > 0:
        s = a.scale
    else:
        dims = []
        for r in range(R):
            for c in range(C):
                cell = np.array(im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))))
                bb = main_bbox(cell)
                if bb: dims.append(max(bb[2] - bb[0], bb[3] - bb[1]))
        if not dims:
            raise SystemExit("找不到內容")
        s = N * (1 - a.pad) / float(np.median(dims))
    for r in range(R):
        rowS, rowB = [], []
        for c in range(C):
            cell = im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
            nw, nh = max(1, round(cell.width * s)), max(1, round(cell.height * s))
            cs = cell.resize((nw, nh), Image.LANCZOS)
            arr = np.array(cs)
            rowS.append(arr); rowB.append(main_bbox(arr))
        scaled.append(rowS); boxes.append(rowB)

    # 2) 每列一個位移：主體中心x/底部y 取中位數 → 對齊格中心/格底
    out = Image.new("RGBA", (C * N, R * N), (0, 0, 0, 0))
    for r in range(R):
        cxs = [ (b[0] + b[2]) / 2 for b in boxes[r] if b ]
        bts = [ b[3] for b in boxes[r] if b ]
        if not cxs: continue
        dx = round(N / 2 - float(np.median(cxs)))
        dy = round((N - a.margin) - float(np.median(bts)))
        # 整列微移保護：讓該列「所有格的主體」都留 ≥1px 邊(仍同列同位移，不會抖)
        l = min(b[0] for b in boxes[r] if b); rt = max(b[2] for b in boxes[r] if b)
        t = min(b[1] for b in boxes[r] if b); bt = max(b[3] for b in boxes[r] if b)
        dx = max(dx, 1 - l); dx = min(dx, (N - 1) - rt)
        dy = max(dy, 1 - t); dy = min(dy, (N - 1) - bt)
        for c in range(C):
            arr = scaled[r][c]
            h, w = arr.shape[:2]
            # 貼進 N×N 目標格（同列同位移）
            cellout = np.zeros((N, N, 4), np.uint8)
            sx0, sy0 = max(0, -dx), max(0, -dy)
            tx0, ty0 = max(0, dx), max(0, dy)
            wcopy = min(w - sx0, N - tx0); hcopy = min(h - sy0, N - ty0)
            if wcopy > 0 and hcopy > 0:
                cellout[ty0:ty0 + hcopy, tx0:tx0 + wcopy] = arr[sy0:sy0 + hcopy, sx0:sx0 + wcopy]
            cellout = clean_edge_debris(cellout, N)
            out.paste(Image.fromarray(cellout, "RGBA"), (c * N, r * N))
    out.save(a.dst)
    print(f"✓ normalize_stable {a.src} -> {a.dst}  grid {R}x{C} cell {N}  scale={s:.4f} (每列同一變換)")


if __name__ == "__main__":
    main()
