#!/usr/bin/env python3
"""
removebg.py — 用開源的 rembg(U^2-Net) 去背，適合「任意背景」的圖
GitHub: https://github.com/danielgatis/rembg

安裝（只需一次）：
  pip install "rembg[cli]" pillow onnxruntime
  # 第一次執行會自動下載 AI 模型(約 170MB)，需要可連網的環境。

用法：
  python3 tools/removebg.py 輸入.png 輸出.png
  # 整個資料夾批次：
  python3 tools/removebg.py 輸入資料夾/ 輸出資料夾/

備註：
  - 純色背景(例如 Gemini 的 #FF00FF)用 chroma_key.py 更快更乾淨、且不用下載模型。
  - rembg 適合背景複雜/有陰影漸層的圖。
"""
import sys, os

try:
    from rembg import remove
    from PIL import Image
except ImportError:
    sys.exit('找不到 rembg/Pillow，請先安裝：\n  pip install "rembg[cli]" pillow onnxruntime')


def one(inp, outp):
    with Image.open(inp) as im:
        out = remove(im)  # 回傳 RGBA、背景透明
        out.save(outp)
    print(f"✓ {inp} -> {outp}")


def main():
    if len(sys.argv) < 3:
        sys.exit("用法：python3 tools/removebg.py 輸入 輸出")
    src, dst = sys.argv[1], sys.argv[2]
    if os.path.isdir(src):
        os.makedirs(dst, exist_ok=True)
        for f in os.listdir(src):
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                one(os.path.join(src, f), os.path.join(dst, os.path.splitext(f)[0] + ".png"))
    else:
        one(src, dst)


if __name__ == "__main__":
    main()
