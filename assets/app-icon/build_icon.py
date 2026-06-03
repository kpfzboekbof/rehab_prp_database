#!/usr/bin/env python3
"""Build the PRP (Platelet-Rich Plasma / 富血小板血漿) iPhone app icon.

Concept: a blood droplet that depicts the centrifuge separation used to make
PRP — pale plasma on top, a glowing gold "platelet-rich" band through the
middle, deep red blood cells below, with platelet cells suspended in the
plasma. Produces an App-Store-ready 1024x1024 master, an iOS rounded preview,
and the standard iOS icon sizes, in both a textless and a "PRP" wordmark
variant.

Run:  python3 build_icon.py
Deps: cairosvg, pillow  (pip install cairosvg pillow)
"""

from __future__ import annotations

import os

import cairosvg
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
PNG_DIR = os.path.join(HERE, "png")

FONT_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

# Teardrop / droplet outline (tip at top, round bulb at bottom), 1024 canvas.
DROPLET = ("M512 214 C590 286 738 420 738 568 "
           "A226 226 0 0 1 286 568 "
           "C286 420 434 286 512 214 Z")

WORDMARK = (
    '<text x="513" y="912" text-anchor="middle" '
    'font-family="Liberation Sans, DejaVu Sans, Arial, sans-serif" '
    'font-size="88" font-weight="700" letter-spacing="9" '
    'fill="#2A3442">PRP</text>'
)


def svg(wordmark: bool) -> str:
    """Return the full 1024x1024 SVG source string."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"
     viewBox="0 0 1024 1024">
  <defs>
    <!-- background -->
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="#FFFFFF"/>
      <stop offset="1"   stop-color="#E8EEF5"/>
    </linearGradient>
    <radialGradient id="bgGlow" gradientUnits="userSpaceOnUse"
                    cx="512" cy="536" r="560">
      <stop offset="0"    stop-color="#FFDDAA" stop-opacity="0.55"/>
      <stop offset="0.62" stop-color="#FFDDAA" stop-opacity="0.10"/>
      <stop offset="1"    stop-color="#FFDDAA" stop-opacity="0"/>
    </radialGradient>

    <!-- droplet contents -->
    <linearGradient id="plasma" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF6E0"/>
      <stop offset="1" stop-color="#F7DFA0"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="#FFD566"/>
      <stop offset="0.5" stop-color="#F4AF35"/>
      <stop offset="1"   stop-color="#E0900F"/>
    </linearGradient>
    <linearGradient id="red" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"    stop-color="#E23A52"/>
      <stop offset="0.55" stop-color="#B01D38"/>
      <stop offset="1"    stop-color="#7E1026"/>
    </linearGradient>
    <radialGradient id="platelet">
      <stop offset="0" stop-color="#FFE6A6"/>
      <stop offset="1" stop-color="#DE8E1E"/>
    </radialGradient>

    <!-- volume + light -->
    <radialGradient id="inner" gradientUnits="userSpaceOnUse"
                    cx="512" cy="520" r="320">
      <stop offset="0"    stop-color="#4A0616" stop-opacity="0"/>
      <stop offset="0.62" stop-color="#4A0616" stop-opacity="0"/>
      <stop offset="1"    stop-color="#4A0616" stop-opacity="0.28"/>
    </radialGradient>
    <radialGradient id="gloss">
      <stop offset="0"    stop-color="#FFFFFF" stop-opacity="0.60"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.12"/>
      <stop offset="1"    stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="shadow">
      <stop offset="0"   stop-color="#1C0C12" stop-opacity="0.30"/>
      <stop offset="0.6" stop-color="#1C0C12" stop-opacity="0.08"/>
      <stop offset="1"   stop-color="#1C0C12" stop-opacity="0"/>
    </radialGradient>

    <clipPath id="dropClip"><path d="{DROPLET}"/></clipPath>
  </defs>

  <!-- background -->
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#bgGlow)"/>

  <!-- contact shadow under the droplet -->
  <ellipse cx="512" cy="806" rx="176" ry="44" fill="url(#shadow)"/>

  <!-- droplet body: separated centrifuge layers -->
  <g clip-path="url(#dropClip)">
    <rect x="278" y="190" width="468" height="362" fill="url(#plasma)"/>
    <rect x="278" y="596" width="468" height="232" fill="url(#red)"/>

    <!-- the platelet-rich band (the point of PRP) -->
    <rect x="278" y="552" width="468" height="46" fill="url(#gold)"/>
    <rect x="278" y="552" width="468" height="5"  fill="#FFF1C8" opacity="0.9"/>
    <rect x="278" y="595" width="468" height="3"  fill="#6E0E22" opacity="0.18"/>

    <!-- suspended platelets in the plasma -->
    <g>
      <circle cx="468" cy="500" r="17" fill="url(#platelet)"/>
      <circle cx="462" cy="494" r="5"  fill="#FFFFFF" opacity="0.7"/>
      <circle cx="556" cy="470" r="13" fill="url(#platelet)"/>
      <circle cx="551" cy="465" r="4"  fill="#FFFFFF" opacity="0.7"/>
      <circle cx="516" cy="530" r="10" fill="url(#platelet)"/>
      <circle cx="598" cy="510" r="9"  fill="url(#platelet)"/>
      <circle cx="452" cy="452" r="9"  fill="url(#platelet)"/>
      <circle cx="536" cy="500" r="7"  fill="url(#platelet)"/>
    </g>

    <!-- volume shading + glossy highlight -->
    <rect x="278" y="190" width="468" height="640" fill="url(#inner)"/>
    <ellipse cx="448" cy="452" rx="118" ry="170" fill="url(#gloss)"
             transform="rotate(-18 448 452)"/>
  </g>

  <!-- crisp rim + tip specular -->
  <path d="{DROPLET}" fill="none" stroke="#78081F"
        stroke-opacity="0.16" stroke-width="2.5"/>
  <ellipse cx="494" cy="300" rx="7" ry="15" fill="#FFFFFF" opacity="0.5"
           transform="rotate(-20 494 300)"/>

  {WORDMARK if wordmark else ''}
</svg>'''


def write_svg(name: str, wordmark: bool) -> str:
    path = os.path.join(HERE, name)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(svg(wordmark))
    return path


def render_png(svg_path: str, out_path: str, size: int) -> str:
    cairosvg.svg2png(url=svg_path, write_to=out_path,
                     output_width=size, output_height=size)
    return out_path


def round_corners(src_png: str, out_png: str, radius_ratio: float = 0.2237) -> str:
    """iOS-style rounded (squircle-approx) corners with transparent background."""
    img = Image.open(src_png).convert("RGBA")
    w, h = img.size
    radius = int(round(w * radius_ratio))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1],
                                           radius=radius, fill=255)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    out.save(out_png)
    return out_png


def comparison(rounded_plain: str, rounded_word: str, out_png: str) -> str:
    """Side-by-side preview of both variants for quick choosing."""
    tile = 460
    pad, gap, top = 60, 80, 150
    W = pad * 2 + tile * 2 + gap
    H = top + tile + 150
    canvas = Image.new("RGBA", (W, H), (244, 246, 249, 255))

    title_f = ImageFont.truetype(FONT_BOLD, 56)
    label_f = ImageFont.truetype(FONT_REG, 34)
    d = ImageDraw.Draw(canvas)

    title = "PRP — iPhone App Icon"
    tb = d.textbbox((0, 0), title, font=title_f)
    d.text(((W - (tb[2] - tb[0])) / 2, 46), title, font=title_f, fill=(42, 52, 66))

    for i, (png, label) in enumerate([(rounded_plain, "A · textless"),
                                      (rounded_word, "B · PRP wordmark")]):
        x = pad + i * (tile + gap)
        ico = Image.open(png).convert("RGBA").resize((tile, tile), Image.LANCZOS)
        # soft platform-style drop shadow behind the tile
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle(
            [x + 10, top + 18, x + tile + 10, top + tile + 18],
            radius=int(tile * 0.2237), fill=(20, 24, 30, 70))
        canvas.alpha_composite(sh)
        canvas.alpha_composite(ico, (x, top))
        lb = d.textbbox((0, 0), label, font=label_f)
        d.text((x + (tile - (lb[2] - lb[0])) / 2, top + tile + 28),
               label, font=label_f, fill=(90, 100, 112))

    canvas.convert("RGB").save(out_png)
    return out_png


def main() -> None:
    os.makedirs(PNG_DIR, exist_ok=True)

    plain_svg = write_svg("prp-app-icon.svg", wordmark=False)
    word_svg = write_svg("prp-app-icon-wordmark.svg", wordmark=True)

    # App-Store-ready square masters (opaque, no rounded corners — iOS masks).
    master_plain = render_png(plain_svg, os.path.join(PNG_DIR, "AppStore-1024.png"), 1024)
    master_word = render_png(word_svg, os.path.join(PNG_DIR, "AppStore-1024-wordmark.png"), 1024)

    # iOS rounded previews (what it looks like on the home screen).
    prev_plain = round_corners(master_plain, os.path.join(PNG_DIR, "preview-rounded-1024.png"))
    prev_word = round_corners(master_word, os.path.join(PNG_DIR, "preview-rounded-1024-wordmark.png"))

    # Standard iOS app-icon sizes (from the textless master = primary).
    for px in (180, 167, 152, 120, 87, 80, 76, 60, 58, 40):
        render_png(plain_svg, os.path.join(PNG_DIR, f"icon-{px}.png"), px)

    comparison(prev_plain, prev_word, os.path.join(HERE, "preview-compare.png"))
    print("done -> assets/app-icon/png/ and preview-compare.png")


if __name__ == "__main__":
    main()
