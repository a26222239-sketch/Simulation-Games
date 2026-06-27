#!/usr/bin/env python3
"""
cutout.py — 從「邊緣」往內把背景去掉（最適合白底/單色底）
比單純色鍵更聰明：只移除「跟邊緣相連」的背景，所以動物身上的白肚子、白色眼睛
不會被誤刪。並可順手縮放成精靈圖尺寸。

用法：
  python3 tools/cutout.py 輸入.png 輸出.png [--bg FFFFFF] [--fuzz 0.10] [--resize 256x256]
  python3 tools/cutout.py 輸入夾/ 輸出夾/ [--bg FFFFFF] [--resize 256x64]

參數：
  --bg     背景色（十六進位不含#），預設 FFFFFF（白）。也可 FF00FF / 00FF00。
  --fuzz   容許誤差 0~1，預設 0.10；邊緣殘色就調大(如 0.18)。
  --resize 輸出尺寸，如 256x256(走路) 或 256x64(進食/睡覺單排)；不給則不縮放。
"""
import sys, os, argparse
from collections import deque
from PIL import Image


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def cut(inp, outp, bg, fuzz, resize):
    im = Image.open(inp).convert("RGBA"); W, H = im.size; px = im.load()
    tol = fuzz * 255
    def isbg(x, y):
        r, g, b, a = px[x, y]
        return abs(r-bg[0]) <= tol and abs(g-bg[1]) <= tol and abs(b-bg[2]) <= tol
    vis = bytearray(W*H); dq = deque()
    def seed(x, y):
        i = y*W+x
        if not vis[i] and isbg(x, y): vis[i] = 1; dq.append((x, y))
    for x in range(W): seed(x, 0); seed(x, H-1)
    for y in range(H): seed(0, y); seed(W-1, y)
    while dq:
        x, y = dq.popleft()
        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0 <= nx < W and 0 <= ny < H:
                i = ny*W+nx
                if not vis[i] and isbg(nx, ny): vis[i] = 1; dq.append((nx, ny))
    for y in range(H):
        for x in range(W):
            if vis[y*W+x]:
                r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 0)
    if resize:
        im = im.resize(resize, Image.LANCZOS)
    im.save(outp); print(f"✓ {inp} -> {outp}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--bg", default="FFFFFF"); ap.add_argument("--fuzz", type=float, default=0.10)
    ap.add_argument("--resize", default=None)
    a = ap.parse_args()
    bg = hexrgb(a.bg)
    resize = tuple(int(v) for v in a.resize.lower().split("x")) if a.resize else None
    if os.path.isdir(a.src):
        os.makedirs(a.dst, exist_ok=True)
        for f in os.listdir(a.src):
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                cut(os.path.join(a.src, f), os.path.join(a.dst, os.path.splitext(f)[0]+".png"), bg, a.fuzz, resize)
    else:
        cut(a.src, a.dst, bg, a.fuzz, resize)


if __name__ == "__main__":
    main()
