# TypeForge

**Font converter, OpenType metadata editor and batch renamer. Runs entirely in your browser.**

[![Live](https://img.shields.io/badge/live-markdo27.github.io%2Ffontconvertswift-0a0a0a.svg)](https://markdo27.github.io/fontconvertswift/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

One of the [MRKD tools](https://markdo27.github.io/).

👉 **[Open the app](https://markdo27.github.io/fontconvertswift/)**

---

## What it does

### Convert between font containers, losslessly

`WOFF2` ⇄ `WOFF` ⇄ `TTF` ⇄ `OTF`, powered by Google's Brotli/WOFF2 encoder compiled to
WebAssembly.

Conversion is a **repackaging** step, not a rebuild. The sfnt is unwrapped from its container
and rewrapped in the new one, so `glyf`/`loca` or `CFF ` outlines, hinting (`cvt `, `fpgm`,
`prep`), layout (`GSUB`, `GPOS`, `GDEF`), `kern`, `MATH`, colour tables and everything else
arrive byte-for-byte.

The app shows whether a font carries **TrueType** or **PostScript (CFF)** outlines and flags
the case where the extension you picked would misrepresent what is inside.

> TypeForge does not convert outlines between cubic (CFF) and quadratic (TrueType) curves.
> `.ttf` and `.otf` here are container choices around the outlines the font already has.

### Edit OpenType metadata without damaging the font

Metadata edits rewrite only the `name`, `OS/2` and `head` tables. Every other table in the
file is copied across untouched.

Exposed name-table entries:

| ID | Field | ID | Field |
| :-- | :-- | :-- | :-- |
| 0 | Copyright | 9 | **Designer / Author** |
| 1 / 16 / 21 | Family | 10 | Description |
| 2 / 17 / 22 | Subfamily / Style | 11 | Vendor URL |
| 3 | Unique ID | 12 | Designer URL |
| 4 | Full name | 13 | Licence description |
| 5 | Version | 14 | Licence URL |
| 6 | PostScript name | 7 | Trademark |
| 8 | Manufacturer / Foundry | | |

Weight and style flags are written to `OS/2.usWeightClass`, `OS/2.fsSelection` and
`head.macStyle`. Only the italic, bold and regular bits of `fsSelection` are touched —
`USE_TYPO_METRICS`, `WWS` and the rest keep whatever the font shipped with, so renaming a
family cannot silently change how it line-spaces.

Entries you do not edit are preserved, including localised names for other languages. Every
font keeps its as-loaded bytes, so **Revert** restores the original metadata at any time.

### Batch rename and metadata editing

- Group many files under one family name so Windows, macOS, Figma and Adobe apps show them
  as a single family with selectable weights.
- Auto-detect weight and italic from filenames (`Thin` → 100 … `Ultra` → 950) and write the
  matching `usWeightClass` and `macStyle`.
- **Batch edit attribution and credit**: set Designer / Author, Manufacturer / Foundry,
  URLs, Copyright, Trademark, Licence, Description and OS/2 Vendor ID (`achVendID`) across
  all selected fonts in one go.
- **Quick presets**:
  * **Preset Vinafont**: 1-click apply Mark Do / Vinafont branding and SIL OFL 1.1 licence.
  * **Clear All Credit**: 1-click strip all attribution, notices and vendor metadata.
- **Auto-generate Unique ID** (`name ID 3`): generates `{version};{vendor};{postScriptName}`.
- **Unicode & Vietnamese diacritics safe**: always writes clean Windows UTF-16BE (3,1,0x409)
  and legacy MacRoman (1,0,0) without dropping Vietnamese diacritics.
- Find and replace across family and style names, with optional regex.
- Filename templates — `{family}`, `{style}`, `{weight}`, `{psname}` — with `kebab-case`,
  `snake_case`, `camelCase`, `PascalCase`, `Title Case`, `lowercase` and `UPPERCASE`.
- Per-row overrides: edit any row and it pins, so the bulk controls stop overwriting it.
- Colliding output names are detected up front and de-duplicated on export.

### CLI Metadata Tool (`tools/clean_metadata.py`)

For deep offline font processing using `fontTools`:

```bash
# Inspect all tables, name records, OS/2 and CFF Top DICT
python tools/clean_metadata.py inspect path/to/font.otf

# Deep clean metadata with Vinafont preset across a folder
python tools/clean_metadata.py clean path/to/fonts/ --preset vinafont --auto-unique-id

# Strip all old credit/author/licence from CFF Top DICT and name table
python tools/clean_metadata.py clean path/to/fonts/ --clear-credit --in-place
```

### Inspect

- **Character map** — every glyph, filtered by Unicode block, searchable by character, glyph
  name or code point, with an outline inspector showing advance width, side bearing, bounding
  box and copyable SVG path data.
- **Type specimen** — live text at any size, line height, tracking, alignment and case, on
  paper or ink, plus an 11-step waterfall.

### Export

- Single file, or a ZIP of everything with a generated `fonts.css` and a `README.txt`
  manifest.
- `@font-face` CSS generator with a configurable font directory and a choice between one
  family name per weight group or one per style.

---

## Privacy

Every byte is processed in your browser by WebAssembly and JavaScript. No font is ever
uploaded, there is no server, no account and no analytics.

---

## Licence and your fonts

TypeForge itself is MIT licensed. **Renaming a typeface does not relicense it** — check the
licence of any font before redistributing what you export.

---

## Weight reference

| Value | Keyword | Typical subfamily |
| :-- | :-- | :-- |
| 100 | Thin | Thin / Hairline |
| 200 | ExtraLight | Extra Light / Ultra Light |
| 300 | Light | Light |
| 400 | Regular | Regular / Normal / Book |
| 500 | Medium | Medium |
| 600 | SemiBold | Semi Bold / Demi Bold |
| 700 | Bold | Bold |
| 800 | ExtraBold | Extra Bold / Ultra Bold |
| 900 | Black | Black / Heavy |
| 950 | Ultra | Extra Black / Ultra |

---

## Built with

[React 19](https://react.dev/) · [TypeScript](https://www.typescriptlang.org/) ·
[Vite 6](https://vitejs.dev/) · [opentype.js](https://opentype.js.org/) (glyph inspection
only) · [wawoff2](https://github.com/fontello/wawoff2) (WOFF2) ·
[fflate](https://github.com/101arrowz/fflate) (WOFF 1.0) ·
[JSZip](https://stuk.github.io/jszip/) · Doto + IBM Plex Mono

The sfnt reader and writer in `src/lib/sfnt.ts` is written for this project: it parses the
table directory, rebuilds the `name` table, patches `OS/2` and `head` in place, and
recomputes table checksums and `head.checkSumAdjustment`.

---

## Run it locally

```bash
git clone https://github.com/markdo27/fontconvertswift.git
cd fontconvertswift
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # typecheck + production build to dist/
npm run typecheck  # types only
npm run preview    # serve the production build
```

---

## Author

Designed, built and maintained by **Mark Do** — [dtcmark@gmail.com](mailto:dtcmark@gmail.com)

Personal use is free. Commercial use needs written permission.

© 2026 Mark Do. [MIT](LICENSE).
