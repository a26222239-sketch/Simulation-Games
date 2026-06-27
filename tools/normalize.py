#!/usr/bin/env python3
"""
normalize.py — 把精靈圖「每一格」的內容貼齊格子底部（讓腳永遠在同一基準線）
解決動物在不同動作/方向間切換時忽高忽低（看起來懸空或陷入地板）的問題。

用法：
  python3 tools/normalize.py 圖.png 輸出.png --grid 4x4 [--margin 1]   # 走路(4列×4欄)
  python3 tools/normalize.py eat.png eat.png --grid 1x4               # 進食/睡覺(1列×4欄)

參數：
  --grid   RxC，列數×欄數（走路 4x4；進食/睡覺 1x4）。
  --margin 內容底部離格子底部保留幾 px，預設 1。
輸入需已是透明背景(先用 cutout.py 去背)。
"""
import argparse
from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--grid", required=True); ap.add_argument("--margin", type=int, default=1)
    a = ap.parse_args()
    rows, cols = (int(v) for v in a.grid.lower().split("x"))
    im = Image.open(a.src).convert("RGBA"); W, H = im.size
    cw, ch = W // cols, H // rows
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((c*cw, r*ch, c*cw+cw, r*ch+ch))
            bb = cell.getbbox()
            if not bb:
                continue
            content = cell.crop(bb)
            # 水平置中、底部對齊（保留 margin）
            nx = (cw - content.width) // 2
            ny = ch - margin_bottom(content.height, ch, a.margin)
            out.paste(content, (c*cw + nx, r*ch + ny), content)
    out.save(a.dst)
    print(f"✓ normalized {a.src} -> {a.dst} (grid {rows}x{cols})")


def margin_bottom(content_h, ch, margin):
    # 內容底部要落在 ch-1-margin，所以貼上的 y = ch - margin - content_h
    return content_h + margin


if __name__ == "__main__":
    main()
