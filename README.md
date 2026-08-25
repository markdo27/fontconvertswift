# TypeForge (fontconvertswift) 🔤⚡

> **High-Performance Font Converter, Interactive Character Map & Batch Renamer Web Studio**  
> 100% Client-Side • WebAssembly Powered • Zero Server Uploads • Private & Instant

[![Deploy to GitHub Pages](https://github.com/markdo27/fontconvertswift/actions/workflows/deploy.yml/badge.svg)](https://github.com/markdo27/fontconvertswift/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://markdo27.github.io/fontconvertswift/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-WASM-654ff0.svg)](https://webassembly.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌐 Live Demo

Try the live web app directly in your browser:  
👉 **[https://markdo27.github.io/fontconvertswift/](https://markdo27.github.io/fontconvertswift/)**

---

## 🌟 Key Features

### 1. 🔄 Bidirectional Font Conversion
- **Convert between all modern web and desktop formats:**
  - `WOFF2` $\rightarrow$ `TTF`, `OTF`, `WOFF`
  - `WOFF` $\rightarrow$ `TTF`, `OTF`, `WOFF2`
  - `TTF` $\rightarrow$ `WOFF2`, `WOFF`, `OTF`
  - `OTF` $\rightarrow$ `WOFF2`, `WOFF`, `TTF`
- **Google Brotli & WOFF2 WebAssembly Engine (`wawoff2`):** Ultra-fast native C++ Brotli compression & decompression running inside the browser.
- **Fast Table Packing:** Preserves all OpenType layout features, kerning (`GPOS`, `GSUB`), hinting, and outlines.
- **Batch Operations:** Convert individual fonts or click **"Convert All To"** with 1-click batch ZIP download.

---

### 2. 🏷️ Batch Metadata Renamer & Family/Weight Normalizer
- **Unified Family Grouping:** Group multiple font variants (e.g. 10 files of *Record Laser Black*, *Bold*, *Medium*, *Italic*) under a single family name (`name` table ID 1, 4, 16, 21) so desktop operating systems (Windows, macOS), Figma, and Adobe apps group them under one cohesive font family.
- **Smart Weight & Style Auto-Detection:** Automatically scans filenames and styles to detect keywords (`Thin`, `ExtraLight`, `Light`, `Regular`, `Medium`, `SemiBold`, `Bold`, `ExtraBold`, `Black`, `Ultra`, `Italic`) and maps them to standard OpenType `OS/2.usWeightClass` (100–950) and `head.macStyle` flags.
- **Find & Replace / Regex:** Batch replace text across family names, subfamilies, and filenames.
- **Bash / Pattern Filename Renamer:** Format output filenames using templates like `{family}-{style}.{ext}`, `{family}_{weight}.{ext}`, or `{psname}.{ext}` with case formatting (`kebab-case`, `snake_case`, `camelCase`, `PascalCase`, `Title Case`, `lowercase`, `UPPERCASE`).

---

### 3. 🔍 Character & Glyph Map Explorer
- **Complete Glyph Map:** Inspect every character and unmapped glyph in the font.
- **Unicode Category Filtering:**
  - Basic Latin (ASCII)
  - Latin-1 Supplement
  - Latin Extended-A & B
  - Greek & Coptic
  - Cyrillic
  - Digits & Numbers
  - Currency & Letterlike Symbols
  - General Punctuation & Math
- **Search:** Search by character, glyph name, or Unicode hex code (`U+0041`).
- **Interactive Glyph Inspector:** Displays vector bezier curves, bounding box coordinates (`xMin`, `xMax`, `yMin`, `yMax`), `advanceWidth`, `leftSideBearing`, baseline, and copyable SVG path data.

---

### 4. ✍️ Typography Playground & Waterfall
- **Live Text Testing:** Test any loaded font with custom editable text.
- **Dynamic Typography Controls:** Font size (8px–144px), line-height (0.8–2.5), letter-spacing (-4px–20px), text alignment, and text transform.
- **Multilingual Pangram Presets:** English (Fox, Sphinx, Jackdaws), French, German, Spanish, Vietnamese, Cyrillic, Numbers & Currency, Symbols.
- **Multi-size Waterfall:** Side-by-side view at 12px, 14px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 72px, 96px.
- **Color Themes:** Dark, Light, Cyber Neon, and High Contrast modes.

---

### 5. 📦 Export & Developer Tools
- **Single Font Instant Download:** Download converted or renamed font files.
- **Batch ZIP Archive:** Bundle all converted and renamed fonts with `JSZip` in one click.
- **CSS `@font-face` Generator:** Auto-generates clean, production-ready `@font-face` CSS definitions and stylesheets.

---

## 🔒 100% Client-Side Privacy

TypeForge runs entirely in your browser using WebAssembly and client-side JavaScript. **Your font files are never uploaded to any remote server**, ensuring total data privacy, zero bandwidth limitations, and lightning-fast speed.

---

## 📋 OpenType Weight Class Reference

| Weight Value | Keyword | Standard Font Subfamily |
| :--- | :--- | :--- |
| **100** | Thin | Thin / Hairline |
| **200** | ExtraLight | Extra Light / Ultra Light |
| **300** | Light | Light |
| **400** | Regular | Regular / Normal / Book |
| **500** | Medium | Medium |
| **600** | SemiBold | Semi Bold / Demi Bold |
| **700** | Bold | Bold |
| **800** | ExtraBold | Extra Bold / Ultra Bold |
| **900** | Black | Black / Heavy |
| **950** | Ultra | Extra Black / Ultra |

---

## 🛠️ Technology Stack

- **Frontend Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite 6](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Font Parsing & Vector Engine:** [opentype.js](https://opentype.js.org/)
- **WOFF2 Decompression & Compression:** [wawoff2](https://github.com/fontello/wawoff2) (Google Brotli WebAssembly)
- **WOFF 1.0 Decompression & Compression:** [fflate](https://github.com/101arrowz/fflate)
- **ZIP Bundling:** [JSZip](https://stuk.github.io/jszip/) & [file-saver](https://github.com/eligrey/FileSaver.js/)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` (v9 or higher)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/markdo27/fontconvertswift.git
   cd fontconvertswift
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
