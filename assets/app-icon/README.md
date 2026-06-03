# PRP App Icon — 富血小板血漿

iPhone app icon built around the **PRP (Platelet-Rich Plasma)** concept.

## Concept

A blood droplet that depicts the **centrifuge separation** used to prepare PRP:

- **Pale plasma** on top, with suspended **platelet** cells
- A glowing **gold "platelet-rich" band** through the middle — the whole point of PRP
- **Deep red blood cells** settled in the lower bulb

Clean, premium, clinical look on a light background with a warm glow, matching
the app's neutral theme. (Textless — the layered droplet carries the concept.)

## Files

| File | Purpose |
| --- | --- |
| `prp-app-icon.svg` | Editable vector master |
| `build_icon.py` | Regenerates every PNG below from the SVG |
| `png/AppStore-1024.png` | **App Store master** — 1024², opaque, no rounded corners (iOS applies the mask) |
| `png/preview-rounded-1024.png` | iOS rounded-corner preview (home-screen look) |
| `png/icon-{40…512}.png` | Standard iOS app-icon + web/PWA sizes |
| `png/favicon.ico` | Multi-resolution favicon (16 / 32 / 48 / 64) |

## Wired into the Next.js app

Variant A is live via Next.js file-based metadata (no `<link>` tags needed —
Next auto-detects these and injects them):

- `src/app/icon.svg` — scalable favicon ← `prp-app-icon.svg`
- `src/app/apple-icon.png` — Apple touch / home-screen icon (180²) ← `png/icon-180.png`
- `src/app/favicon.ico` — legacy/browser-tab favicon ← `png/favicon.ico`

To refresh those after editing the design, re-run the build and re-copy:

```bash
python3 build_icon.py
cp prp-app-icon.svg      ../../src/app/icon.svg
cp png/icon-180.png      ../../src/app/apple-icon.png
cp png/favicon.ico       ../../src/app/favicon.ico
```

## Regenerate

```bash
pip install cairosvg pillow
python3 build_icon.py
```

Edit `prp-app-icon.svg` (or the template in `build_icon.py`) and re-run to
rebuild all sizes.
