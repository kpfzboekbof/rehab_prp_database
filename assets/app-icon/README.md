# PRP App Icon — 富血小板血漿

iPhone app icon built around the **PRP (Platelet-Rich Plasma)** concept.

## Concept

A blood droplet that depicts the **centrifuge separation** used to prepare PRP:

- **Pale plasma** on top, with suspended **platelet** cells
- A glowing **gold "platelet-rich" band** through the middle — the whole point of PRP
- **Deep red blood cells** settled in the lower bulb

Clean, premium, clinical look on a light background with a warm glow, matching
the app's neutral theme.

## Files

| File | Purpose |
| --- | --- |
| `prp-app-icon.svg` | Editable vector source (textless, **primary**) |
| `prp-app-icon-wordmark.svg` | Variant with a "PRP" wordmark |
| `build_icon.py` | Regenerates every PNG below from the SVG |
| `preview-compare.png` | Side-by-side of both variants |
| `png/AppStore-1024.png` | **App Store master** — 1024², opaque, no rounded corners (iOS applies the mask) |
| `png/preview-rounded-1024.png` | iOS rounded-corner preview (home-screen look) |
| `png/icon-{40…180}.png` | Standard iOS app-icon sizes |

`-wordmark` files are the same set for variant B.

## Regenerate

```bash
pip install cairosvg pillow
python3 build_icon.py
```

Edit `prp-app-icon.svg` (or the template in `build_icon.py`) and re-run to
rebuild all sizes.

## Use in the Next.js app (optional)

To wire it up as the favicon / Apple touch icon, copy into the app route:

```bash
cp png/icon-180.png  ../../src/app/apple-icon.png
cp png/AppStore-1024.png ../../src/app/icon.png   # Next downscales for favicon
```

Next.js auto-serves `src/app/icon.png` and `src/app/apple-icon.png` — no
`<link>` tags needed.
