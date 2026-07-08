#!/usr/bin/env python3
"""
RETIRED — superseded by scripts/generate-brand-assets.mjs

This script generated favicons by nearest-neighbor upscaling a 25x23px
source PNG via macOS `sips`. As of the vector logo migration, the canonical
brand sources are public/brand/icon.svg and public/brand/logotype.svg
(real vector, not tiny raster), and every favicon/PWA-icon/apple-touch-icon
size is rendered directly from that vector source via sharp — a real
downscale at every size, not an upscale.

Run instead:
    node scripts/generate-brand-assets.mjs
"""

import sys

sys.exit(
    "generate_favicon.py is retired — its source PNGs no longer exist.\n"
    "Run `node scripts/generate-brand-assets.mjs` instead."
)
