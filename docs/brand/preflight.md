# Brand Asset Preflight & Discovery Report

This report summarizes the preflight verification of PaperWorking's source brand assets, an audit of the application surfaces where the logo is rendered, and recommendations for source folder management.

---

## Part A: Source Asset Verification

All files were located at `/Users/yvesdarbouze/Documents/PaperWorking/PaperWorking Logo/`.

### 1. `PaperWorking_Black_full_Logo_.png`
* **Size**: 2,470 bytes (Materialized)
* **Dimensions (sips)**: `pixelWidth: 225`, `pixelHeight: 37`
* **Alpha Channel**: `hasAlpha: yes` (Transparent background)
* **True Decoded Color**: Black `RGB: (0, 0, 0)`
* **Status**: **Matches Expected**

### 2. `PaperWorking_White_full_Logo_.png`
* **Size**: 2,335 bytes (Materialized)
* **Dimensions (sips)**: `pixelWidth: 225`, `pixelHeight: 37`
* **Alpha Channel**: `hasAlpha: yes` (Transparent background)
* **True Decoded Color**: White `RGB: (255, 255, 255)`
* **Status**: **Matches Expected**

### 3. `PaperWorking_Black_Logo_Icon.png`
* **Size**: 312 bytes (Materialized)
* **Dimensions (sips)**: `pixelWidth: 25`, `pixelHeight: 23`
* **Alpha Channel**: `hasAlpha: yes` (Transparent background)
* **True Decoded Color**: Black `RGB: (0, 0, 0)`
* **Status**: **DISCREPANCY**
  * **Filename Discrepancy**: The actual source file has a duplicate `.png.png` extension: `PaperWorking_Black_Logo_Icon.png.png`.
  * **Dimension Discrepancy**: The actual dimensions are `25x23` pixels, not the expected `32x32` pixels.

### 4. `PaperWorking_White_Logo_Icon.png`
* **Size**: 315 bytes (Materialized)
* **Dimensions (sips)**: `pixelWidth: 25`, `pixelHeight: 23`
* **Alpha Channel**: `hasAlpha: yes` (Transparent background)
* **True Decoded Color**: White `RGB: (255, 255, 255)`
* **Status**: **DISCREPANCY**
  * **Dimension Discrepancy**: The actual dimensions are `25x23` pixels, not the expected `32x32` pixels.

### 5. `PaperWorking_Logo_Logotype.png`
* **Size**: 2,237 bytes (Materialized)
* **Dimensions (sips)**: `pixelWidth: 199`, `pixelHeight: 37`
* **Alpha Channel**: `hasAlpha: yes` (Transparent background)
* **True Decoded Color**: Black `RGB: (0, 0, 0)`
* **Status**: **Matches Expected**

---

## Part B: Surface Audit

Below is the mapping of background styles, colors, and the corresponding legible logo colors for every surface where the logo is rendered.

| Surface | Background Reference (Class/CSS) | Effective BG | Legible Logo Color |
|---|---|---|---|
| **Marketing nav header** | `var(--color-surface)` / `#FDFFFC` | Light | Black (`PaperWorking_Black_full_Logo_.png` / `PaperWorking_Black_Logo_Icon.png.png`) |
| **Marketing footer** | `#FDFFFC` (standard) / `#121014` (dark variant) | Light or Dark | Themed (Black on light background, White on dark variant) |
| **Marketing hero** | `#FDFFFC` / light background | Light | Black (`PaperWorking_Black_full_Logo_.png`) |
| **App sidebar** | `bg-surface-container/60` (themed) | Responsive/Themed | Auto-theme (White on dark mode, Black on light mode) |
| **App top bar / mobile header**| `bg-surface-container/60` (themed) | Responsive/Themed | Auto-theme (White on dark mode, Black on light mode) |
| **Auth pages** (`/login`, `/register`, `/forgot-password`) | `bg-[#121014]` / dark theme | Dark | White (`PaperWorking_White_full_Logo_.png`) |
| **Empty states** | `bg-surface` / `bg-surface-container` | Themed | Auto-theme |
| **Loading/splash** | `bg-surface` / `bg-surface-container` | Themed | Auto-theme |
| **Email template background** | `#f3f4f6` (outer) / `#ffffff` (inner wrapper) | Light | Black (`PaperWorking_Black_full_Logo_.png`) |
| **PDF export body** | Default PDF document background | Light (White) | Black (`PaperWorking_Black_full_Logo_.png`) |
| **PDF header banner** | `COLOR.black` / `BRAND_DARK` | Dark | White (`PaperWorking_White_full_Logo_.png`) |

---

## Part C: Recommendation for the Source Folder

The original `PaperWorking Logo/` folder contains a space in the directory name, which makes working with it in command lines more error-prone. Since all five canonical brand assets have been successfully ingested into `/public/brand/`, the duplicate directory in the root working tree should not be committed to Git.

### Recommendation
**Gitignore the directory**: Add the following line to the root `.gitignore`:
```
PaperWorking Logo/
```
This keeps the original assets intact on the local developer environment but ensures they are not duplicated or tracked in the Git repository.

---

## Tool Verification Outputs (Part A)

### `sips` Dimensions and Alpha Metadata
```
--- File: Asset 2.png ---
  pixelWidth: 25
  pixelHeight: 23
  hasAlpha: yes
--- File: Asset 3.png ---
  pixelWidth: 225
  pixelHeight: 37
  hasAlpha: yes
--- File: Asset 4.png ---
  pixelWidth: 25
  pixelHeight: 23
  hasAlpha: yes
--- File: Asset 5.png ---
  pixelWidth: 225
  pixelHeight: 37
  hasAlpha: yes
--- File: PaperWorking_Black_Logo_Icon.png.png ---
  pixelWidth: 25
  pixelHeight: 23
  hasAlpha: yes
--- File: PaperWorking_Black_full_Logo_.png ---
  pixelWidth: 225
  pixelHeight: 37
  hasAlpha: yes
--- File: PaperWorking_Logo_Logotype.png ---
  pixelWidth: 199
  pixelHeight: 37
  hasAlpha: yes
--- File: PaperWorking_White_Logo_Icon.png ---
  pixelWidth: 25
  pixelHeight: 23
  hasAlpha: yes
--- File: PaperWorking_White_full_Logo_.png ---
  pixelWidth: 225
  pixelHeight: 37
  hasAlpha: yes
```

### Manual PNG Decoder Pixel Color Analysis
```
Inspecting: PaperWorking_Logo_Logotype.png
  Dimensions: 199x37
  Color type: 6 (RGBA)
  True decoded pixel color: RGB (0, 0, 0) -> Black

Inspecting: PaperWorking_Black_full_Logo_.png
  Dimensions: 225x37
  Color type: 6 (RGBA)
  True decoded pixel color: RGB (0, 0, 0) -> Black

Inspecting: PaperWorking_White_full_Logo_.png
  Dimensions: 225x37
  Color type: 6 (RGBA)
  True decoded pixel color: RGB (255, 255, 255) -> White
```
