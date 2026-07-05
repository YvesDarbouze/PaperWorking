#!/usr/bin/env python3
"""
PaperWorking — Icon Pipeline Script (re-runnable)

Generates the full favicon and web-app icon set from the canonical brand
source PNGs in /public/brand/.

Sources:
  - public/brand/PaperWorking_Black_Logo_Icon.png  (25×23, RGBA, black on transparent)
  - public/brand/PaperWorking_White_Logo_Icon.png  (25×23, RGBA, white on transparent)

Outputs:
  - public/favicon.ico           (multi-res 16+32, black icon)
  - src/app/favicon.ico           (same)
  - public/icon-16.png            (16×16, black)
  - public/icon-32.png            (32×32, black)
  - public/apple-touch-icon.png   (180×180, black icon composited onto solid #FDFFFC)
  - public/icon-192.png           (192×192, black)
  - public/icon-512.png           (512×512, black)
  - public/brand/PaperWorking_White_Logo_Icon_32.png  (32×32, white — dark-mode favicon)

Upscale caveat: The source icons are 25×23 px. All outputs larger than 32×32
are nearest-neighbor / bilinear upscales via macOS sips. When higher-resolution
sources become available, drop them in as replacements and re-run this script.

Safari pinned-tab mask-icon: SKIPPED — requires an SVG source we do not have.

Dark-mode favicon: Progressive enhancement (Chromium only). Safari ignores
the prefers-color-scheme media query on <link rel="icon">, which is expected.

Re-run: `python3 scripts/generate_favicon.py` from project root.
"""

import os
import subprocess
import struct
import shutil
import zlib


def run_cmd(cmd):
    print(f"  ▸ {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"    ERROR: {res.stderr.strip()}")
        raise RuntimeError(res.stderr)
    return res.stdout


def make_ico(png_files_list, output_path):
    """Build a multi-resolution .ico from a list of (width, height, png_bytes)."""
    header = struct.pack('<HHH', 0, 1, len(png_files_list))
    directories = []
    offset = 6 + 16 * len(png_files_list)

    for width, height, data in png_files_list:
        size = len(data)
        entry = struct.pack('<BBBBHHII', width, height, 0, 0, 1, 32, size, offset)
        directories.append(entry)
        offset += size

    with open(output_path, 'wb') as f:
        f.write(header)
        for d in directories:
            f.write(d)
        for _, _, data in png_files_list:
            f.write(data)
    print(f"  ✓ ICO: {output_path}")


def composite_on_solid_bg(src_png, output_path, target_size, bg_rgb=(253, 255, 252)):
    """
    Composites a transparent PNG onto a solid background at target_size × target_size.

    Uses a pure-Python approach:
    1. Resize src to target_size via sips.
    2. Manually decode the RGBA PNG, alpha-composite onto bg_rgb, write a new PNG.

    This avoids needing PIL or ImageMagick.
    """
    # Step 1: resize via sips into a temp file
    tmp_resized = f"tmp_icons/_composite_src_{target_size}.png"
    run_cmd(f"sips -z {target_size} {target_size} '{src_png}' --out '{tmp_resized}'")

    # Step 2: read the resized RGBA PNG
    with open(tmp_resized, 'rb') as f:
        png_data = f.read()

    # Parse PNG chunks
    assert png_data[:8] == b'\x89PNG\r\n\x1a\n', "Not a valid PNG"
    pos = 8
    width = height = 0
    color_type = 0
    bit_depth = 0
    idat_data = b''

    while pos < len(png_data):
        length = struct.unpack('>I', png_data[pos:pos+4])[0]
        chunk_type = png_data[pos+4:pos+8]
        chunk_data = png_data[pos+8:pos+8+length]
        pos += 12 + length  # 4 len + 4 type + data + 4 crc

        if chunk_type == b'IHDR':
            width, height, bit_depth, color_type = struct.unpack('>IIBB', chunk_data[:10])
        elif chunk_type == b'IDAT':
            idat_data += chunk_data
        elif chunk_type == b'IEND':
            break

    # Decompress
    raw = zlib.decompress(idat_data)

    bpp = 4 if color_type == 6 else 3
    stride = width * bpp + 1

    # Paeth predictor
    def paeth(a, b, c):
        p = a + b - c
        pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
        if pa <= pb and pa <= pc: return a
        elif pb <= pc: return b
        else: return c

    # Unfilter scanlines
    recon = bytearray(height * width * bpp)
    for y in range(height):
        off = y * stride
        ft = raw[off]
        scanline = raw[off+1:off+stride]
        for x in range(width):
            for c in range(bpp):
                idx = (y * width + x) * bpp + c
                fv = scanline[x * bpp + c]
                a = recon[idx - bpp] if x > 0 else 0
                b = recon[idx - width * bpp] if y > 0 else 0
                cv = recon[idx - (width + 1) * bpp] if (x > 0 and y > 0) else 0
                if ft == 0: val = fv
                elif ft == 1: val = (fv + a) & 0xFF
                elif ft == 2: val = (fv + b) & 0xFF
                elif ft == 3: val = (fv + (a + b) // 2) & 0xFF
                elif ft == 4: val = (fv + paeth(a, b, cv)) & 0xFF
                else: val = fv
                recon[idx] = val

    # Alpha-composite onto solid bg
    composited = bytearray(height * width * 3)
    for y in range(height):
        for x in range(width):
            src_idx = (y * width + x) * bpp
            dst_idx = (y * width + x) * 3
            if bpp == 4:
                r, g, b, a = recon[src_idx], recon[src_idx+1], recon[src_idx+2], recon[src_idx+3]
                af = a / 255.0
                composited[dst_idx]   = int(r * af + bg_rgb[0] * (1 - af))
                composited[dst_idx+1] = int(g * af + bg_rgb[1] * (1 - af))
                composited[dst_idx+2] = int(b * af + bg_rgb[2] * (1 - af))
            else:
                composited[dst_idx]   = recon[src_idx]
                composited[dst_idx+1] = recon[src_idx+1]
                composited[dst_idx+2] = recon[src_idx+2]

    # Write a new RGB PNG (no alpha)
    def write_png_rgb(w, h, pixels, path):
        def chunk(ctype, data):
            c = ctype + data
            return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

        ihdr_data = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)  # color_type=2 (RGB)
        raw_scanlines = bytearray()
        for row in range(h):
            raw_scanlines.append(0)  # filter: None
            row_start = row * w * 3
            raw_scanlines.extend(pixels[row_start:row_start + w * 3])

        compressed = zlib.compress(bytes(raw_scanlines), 9)

        with open(path, 'wb') as f:
            f.write(b'\x89PNG\r\n\x1a\n')
            f.write(chunk(b'IHDR', ihdr_data))
            f.write(chunk(b'IDAT', compressed))
            f.write(chunk(b'IEND', b''))

    write_png_rgb(width, height, composited, output_path)
    print(f"  ✓ Composited: {output_path} ({width}×{height}, solid bg #{bg_rgb[0]:02x}{bg_rgb[1]:02x}{bg_rgb[2]:02x})")


def main():
    black_src = "public/brand/PaperWorking_Black_Logo_Icon.png"
    white_src = "public/brand/PaperWorking_White_Logo_Icon.png"

    print("═══ PaperWorking Icon Pipeline ═══\n")
    print(f"Sources:\n  Black icon: {black_src}\n  White icon: {white_src}\n")

    # Ensure build temp dir exists
    os.makedirs("tmp_icons", exist_ok=True)

    # ── 1. Generate resized black icons ──────────────────────────
    print("Step 1: Resize black icon to target sizes...")
    sizes = {
        16: "tmp_icons/icon-16.png",
        32: "tmp_icons/icon-32.png",
        192: "tmp_icons/icon-192.png",
        512: "tmp_icons/icon-512.png",
    }

    for size, path in sizes.items():
        run_cmd(f"sips -z {size} {size} '{black_src}' --out '{path}'")

    # ── 2. Apple-touch-icon: composited onto solid #FDFFFC ──────
    print("\nStep 2: Generate apple-touch-icon (180×180, composited on solid #FDFFFC)...")
    composite_on_solid_bg(
        black_src,
        "tmp_icons/apple-touch-icon.png",
        180,
        bg_rgb=(253, 255, 252),  # PaperWorking brand off-white
    )

    # ── 3. Dark-mode favicon (white 32×32) ──────────────────────
    print("\nStep 3: Generate dark-mode favicon (white icon 32×32)...")
    run_cmd(f"sips -z 32 32 '{white_src}' --out tmp_icons/icon-32-dark.png")

    # ── 4. Build multi-resolution favicon.ico ───────────────────
    print("\nStep 4: Build multi-res favicon.ico (16+32)...")
    with open(sizes[16], "rb") as f:
        img_16 = f.read()
    with open(sizes[32], "rb") as f:
        img_32 = f.read()

    os.makedirs("public", exist_ok=True)
    os.makedirs("src/app", exist_ok=True)

    make_ico([(16, 16, img_16), (32, 32, img_32)], "public/favicon.ico")
    make_ico([(16, 16, img_16), (32, 32, img_32)], "src/app/favicon.ico")

    # ── 5. Copy to output locations ─────────────────────────────
    print("\nStep 5: Copy generated icons to public/ and src/app/...")

    copies = [
        ("tmp_icons/icon-16.png",            "public/icon-16.png"),
        ("tmp_icons/icon-16.png",            "src/app/icon-16.png"),
        ("tmp_icons/icon-32.png",            "public/icon-32.png"),
        ("tmp_icons/icon-32.png",            "src/app/icon-32.png"),
        ("tmp_icons/apple-touch-icon.png",   "public/apple-touch-icon.png"),
        ("tmp_icons/apple-touch-icon.png",   "src/app/apple-touch-icon.png"),
        ("tmp_icons/icon-192.png",           "public/icon-192.png"),
        ("tmp_icons/icon-192.png",           "src/app/icon-192.png"),
        ("tmp_icons/icon-512.png",           "public/icon-512.png"),
        ("tmp_icons/icon-512.png",           "src/app/icon-512.png"),
        ("tmp_icons/icon-32-dark.png",       "public/brand/PaperWorking_White_Logo_Icon_32.png"),
    ]

    for src, dst in copies:
        shutil.copy(src, dst)
        print(f"  ✓ {dst}")

    # ── 6. Clean up temp dir ────────────────────────────────────
    shutil.rmtree("tmp_icons")

    print("\n═══ Done ═══")
    print("Caveat: Sources are 25×23 px. Sizes above 32×32 are upscaled.")
    print("         Replace sources with 512×512+ originals and re-run for sharper output.")
    print("Skip:   Safari pinned-tab mask-icon (requires SVG source we don't have).")
    print("Note:   Dark-mode favicon is progressive enhancement (Chromium only).")


if __name__ == "__main__":
    main()
