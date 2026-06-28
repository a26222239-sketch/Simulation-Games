#!/usr/bin/env python3
"""
cut_keep_shadow.py — 去背但「保留圖檔自帶的陰影」(以及 Zzz、肉等非白元素)，
同時去掉「腿縫之間的白塊」(flood-fill 去不掉、rembg 又會連陰影一起吃掉的痛點)。

做法(逐格)：
  1. 用 rembg 取得「動物本體的乾淨剪影」(腿縫分開、眼白保留、但沒有陰影)。
  2. 從原圖取「非白且不在本體內」的像素 = 陰影 + Zzz + 肉(地上的食物)。
     腿縫是白色 → 不會被收進來，所以不會有白塊。
  3. 疊合：先鋪陰影/附件，再把乾淨本體蓋上去。
結果：本體乾淨(無腿縫白) + 自帶柔和陰影/Zzz/食物，全部來自原圖。

安裝： pip install rembg onnxruntime scipy
用法： python3 tools/cut_keep_shadow.py 原圖.png 輸出.png --grid 4x4 [--pad 10] [--white 238]
之後再： python3 tools/normalize.py 輸出.png assets/animal_<id>.png --grid 4x4 --cell <N>
"""
import argparse
import numpy as np
from PIL import Image
from scipy import ndimage
from rembg import remove, new_session


def runs(mask):
    out = []; s = None
    for i, v in enumerate(mask):
        if v and s is None: s = i
        elif not v and s is not None: out.append((s, i)); s = None
    if s is not None: out.append((s, len(mask)))
    return out


def even(n, k):
    step = n / k
    return [(round(i*step), round((i+1)*step)) for i in range(k)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--grid", required=True)
    ap.add_argument("--pad", type=int, default=10, help="每格外擴裁切的邊距(px)")
    ap.add_argument("--white", type=int, default=238, help="近白門檻(min(r,g,b)>=此值算背景白)")
    a = ap.parse_args()
    R, C = (int(v) for v in a.grid.lower().split("x"))
    im = Image.open(a.src).convert("RGB")
    arr = np.array(im); H, W = arr.shape[:2]
    mn = arr.astype(int).min(2)
    content = mn <= 244  # 非近純白即內容(含淺灰陰影)，用來切格

    rb = runs(content.any(axis=1))
    if len(rb) != R:
        print(f"  (列偵測 {len(rb)}≠{R}，改均分)"); rb = even(H, R)
    session = new_session()
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for (y0, y1) in rb:
        band = content[y0:y1]
        cb = runs(band.any(axis=0))
        if len(cb) != C:
            cb = even(W, C)
        for (x0, x1) in cb:
            cx0, cy0 = max(0, x0-a.pad), max(0, y0-a.pad)
            cx1, cy1 = min(W, x1+a.pad), min(H, y1+a.pad)
            crop = im.crop((cx0, cy0, cx1, cy1))
            crop_rgb = np.array(crop)
            lion = remove(crop, session=session)           # 乾淨本體剪影(無陰影)
            lion_arr = np.array(lion)
            lion_mask = lion_arr[:, :, 3] > 20
            # 本體邊緣外擴 2px，避免抗鋸齒灰邊被當成附件
            lion_dil = ndimage.binary_dilation(lion_mask, iterations=2)
            white = crop_rgb.min(2) >= a.white               # 近白背景(含腿縫白)
            extras = (~lion_dil) & (~white)                  # 陰影 + Zzz + 食物(非白且不在本體)
            cell = np.zeros((crop_rgb.shape[0], crop_rgb.shape[1], 4), np.uint8)
            cell[extras, :3] = crop_rgb[extras]; cell[extras, 3] = 255   # 鋪附件(原色)
            cell[lion_mask] = lion_arr[lion_mask]            # 本體蓋上(優先)
            cellimg = Image.fromarray(cell, "RGBA")
            out.paste(cellimg, (cx0, cy0), cellimg)
    out.save(a.dst)
    print(f"✓ cut_keep_shadow {a.src} -> {a.dst} (grid {R}x{C})")


if __name__ == "__main__":
    main()
