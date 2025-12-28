from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # 背景色 (Dark Blue)
    img = Image.new('RGB', (size, size), color='#0f172a')
    d = ImageDraw.Draw(img)
    
    # 中央にロボットの顔のような図形を描画
    center = size // 2
    radius = size // 3
    
    # 顔の輪郭
    d.rectangle(
        [center - radius, center - radius, center + radius, center + radius],
        outline='#3b82f6', width=size//20
    )
    
    # 目
    eye_radius = size // 10
    d.ellipse(
        [center - radius//2 - eye_radius, center - eye_radius, center - radius//2 + eye_radius, center + eye_radius],
        fill='#60a5fa'
    )
    d.ellipse(
        [center + radius//2 - eye_radius, center - eye_radius, center + radius//2 + eye_radius, center + eye_radius],
        fill='#60a5fa'
    )
    
    # バーコード風の口
    bar_width = size // 20
    start_x = center - radius + bar_width
    y_top = center + radius // 2
    y_bottom = center + radius - bar_width
    
    for i in range(5):
        x = start_x + (i * bar_width * 2)
        d.rectangle([x, y_top, x + bar_width, y_bottom], fill='#3b82f6')

    # 保存
    img.save(filename)
    print(f"Created {filename}")

# 出力ディレクトリ
output_dir = "/home/ubuntu/barcode-genesis/client/public"
os.makedirs(output_dir, exist_ok=True)

# アイコン生成
create_icon(192, os.path.join(output_dir, "icon-192.png"))
create_icon(512, os.path.join(output_dir, "icon-512.png"))
