#!/usr/bin/env python3
"""
chroma_key.py — 把「純色背景」變透明（最適合 Gemini 生在 #FF00FF 洋紅底的圖）
不需要下載任何模型，速度快、邊緣乾淨。

用法：
  python3 tools/chroma_key.py 輸入.png 輸出.png [--color FF00FF] [--fuzz 0.12]
  # 整個資料夾批次：
  python3 tools/chroma_key.py 輸入資料夾/ 輸出資料夾/ [--color FF00FF] [--fuzz 0.12]

參數：
  --color  背景色（十六進位，不含 #），預設 FF00FF（洋紅）。Gemini 也可用 00FF00。
  --fuzz   容許誤差 0~1，預設 0.12；邊緣有殘色就調大一點（如 0.2）。
"""
import sys, os, argparse
from PIL import Image
# (chroma_key 不處理被包住的白塊；那個用 cutout.py)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def key_one(inp, outp, target, fuzz):
    img = Image.open(inp).convert("RGBA")
    px = img.load()
    w, hgt = img.size
    tr, tg, tb = target
    # 距離門檻（0~1 對應 0~441 的 RGB 歐氏距離）
    thresh = fuzz * 441.0
    band = thresh * 0.5  # 邊緣羽化帶
    for y in range(hgt):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = ((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2) ** 0.5
            if d <= thresh - band:
                px[x, y] = (r, g, b, 0)            # 全透明
            elif d < thresh + band:
                # 邊緣：依距離給部分透明，減少鋸齒
                t = (d - (thresh - band)) / (2 * band)
                px[x, y] = (r, g, b, int(a * t))
    img.save(outp)
    print(f"✓ {inp} -> {outp}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--color", default="FF00FF"); ap.add_argument("--fuzz", type=float, default=0.12)
    a = ap.parse_args()
    target = hex_rgb(a.color)
    if os.path.isdir(a.src):
        os.makedirs(a.dst, exist_ok=True)
        for f in os.listdir(a.src):
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                key_one(os.path.join(a.src, f), os.path.join(a.dst, os.path.splitext(f)[0] + ".png"), target, a.fuzz)
    else:
        key_one(a.src, a.dst, target, a.fuzz)


if __name__ == "__main__":
    main()
