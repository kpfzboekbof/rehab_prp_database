#!/usr/bin/env python3
"""Build the PRP (Platelet-Rich Plasma / 富血小板血漿) iPhone app icon.

Concept: a blood droplet that depicts the centrifuge separation used to make
PRP — pale plasma on top, a glowing gold "platelet-rich" band through the
middle, deep red blood cells below, with platelet cells suspended in the
plasma. Produces an App-Store-ready 1024x1024 master, an iOS rounded preview,
the standard iOS icon sizes, and a multi-resolution favicon.ico.

Run:  python3 build_icon.py
Deps: cairosvg, pillow  (pip install cairosvg pillow)
"""

from __future__ import annotations

import os

import cairosvg
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
PNG_DIR = os.path.join(HERE, "png")

# Teardrop / droplet outline (tip at top, round bulb at bottom), 1024 canvas.
DROPLET = ("M512 214 C590 286 738 420 738 568 "
           "A226 226 0 0 1 286 568 "
           "C286 420 434 286 512 214 Z")


def svg() -> str:
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
</svg>'''


def write_svg(name: str) -> str:
    path = os.path.join(HERE, name)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(svg())
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


def make_favicon(svg_path: str, out_ico: str) -> str:
    """Multi-resolution favicon.ico rendered crisply from the SVG."""
    tmp = os.path.join(PNG_DIR, "_favicon_src.png")
    render_png(svg_path, tmp, 64)
    Image.open(tmp).convert("RGBA").save(
        out_ico, sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    os.remove(tmp)
    return out_ico


def main() -> None:
    os.makedirs(PNG_DIR, exist_ok=True)
    src = write_svg("prp-app-icon.svg")

    # App-Store-ready square master (opaque, no rounded corners — iOS masks).
    master = render_png(src, os.path.join(PNG_DIR, "AppStore-1024.png"), 1024)

    # iOS rounded preview (what it looks like on the home screen).
    round_corners(master, os.path.join(PNG_DIR, "preview-rounded-1024.png"))

    # Standard iOS app-icon sizes + a couple of web/PWA sizes.
    for px in (512, 256, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40):
        render_png(src, os.path.join(PNG_DIR, f"icon-{px}.png"), px)

    make_favicon(src, os.path.join(PNG_DIR, "favicon.ico"))
    print("done -> assets/app-icon/ (svg + png/ + favicon.ico)")


if __name__ == "__main__":
    main()
