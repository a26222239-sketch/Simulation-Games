#!/usr/bin/env python3
"""
rembg_cut.py — 用開源 rembg(U^2-Net) 逐格去背（最乾淨，連腿間白都去掉）
做法：先用「透明間隙」偵測每隻動物的邊界，再「一隻一隻」丟進 rembg，
避免整張一起跑時把某隻弄成殘影；輸出與原圖同尺寸的透明 PNG。

注意：rembg 會把畫在圖裡的「陰影」也當背景去掉，所以搭配它時請用「程式影子」。

安裝： pip install rembg onnxruntime
用法： python3 tools/rembg_cut.py 原圖.png 輸出.png --grid 4x4 [--pad 10]
之後再： python3 tools/normalize.py 輸出.png assets/animal_lion.png --grid 4x4 --cell 48
"""
import argparse
import numpy as np
from PIL import Image
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
    a = ap.parse_args()
    R, C = (int(v) for v in a.grid.lower().split("x"))
    im = Image.open(a.src).convert("RGB")
    arr = np.array(im); H, W = arr.shape[:2]
    # 內容遮罩：非「近純白」即為內容(含淺灰陰影也算內容，用來找邊界)
    mn = arr.astype(int).min(2)
    content = mn <= 244

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
            cut = remove(crop, session=session)  # 單隻去背，乾淨無殘影
            out.paste(cut, (cx0, cy0), cut)
    out.save(a.dst)
    print(f"✓ rembg_cut {a.src} -> {a.dst} (grid {R}x{C})")


if __name__ == "__main__":
    main()
