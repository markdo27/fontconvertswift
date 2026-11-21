#!/usr/bin/env python3
"""
tools/clean_metadata.py
Deep metadata cleaner & credit manager for OpenType / TrueType / WOFF / WOFF2 fonts.

Part of TypeForge (https://github.com/markdo27/fontconvertswift).

Capabilities:
- Inspect OpenType metadata across name, OS/2, head, and CFF/CFF2 tables.
- Deep clean and rewrite:
  * name table (Unicode Windows BMP 3,1,0x409 + legacy Mac 1,0,0) with full
    Vietnamese diacritics and Unicode safety.
  * OS/2 table (achVendID, usWeightClass).
  * head table (fontRevision, macStyle).
  * CFF / CFF2 tables (Top DICT: FamilyName, FullName, Copyright, Notice, version, fontNames).
- Clear attribution/vendor metadata with 1 click/flag (--clear-credit).
- Apply Vinafont preset (--preset vinafont).
- Drop junk/tracking tables (--drop-tables FFTM,prop).
- Batch process entire directories recursively.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any

try:
    from fontTools.ttLib import TTFont
except ImportError:
    print("Error: fontTools is required. Install with: pip install fonttools [brotli]", file=sys.stderr)
    sys.exit(1)


# Preset configurations
PRESETS: dict[str, dict[str, str]] = {
    "vinafont": {
        "designer": "Mark Do",
        "designer_url": "https://vinafont.com",
        "foundry": "Vinafont",
        "vendor_url": "https://vinafont.com",
        "vendor_id": "VNFN",
        "version": "Version 1.000",
        "copyright": "Copyright 2026 Mark Do (Vinafont). All rights reserved.",
        "trademark": "",
        "license": "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
        "license_url": "https://openfontlicense.org",
        "description": "Vinafont TypeForge Edition",
    }
}

# Standard OpenType name IDs
NAME_IDS = {
    "copyright": 0,
    "fontFamily": 1,
    "fontSubfamily": 2,
    "uniqueID": 3,
    "fullName": 4,
    "version": 5,
    "postScriptName": 6,
    "trademark": 7,
    "manufacturer": 8,
    "designer": 9,
    "description": 10,
    "vendorURL": 11,
    "designerURL": 12,
    "license": 13,
    "licenseURL": 14,
    "preferredFamily": 16,
    "preferredSubfamily": 17,
    "compatibleFull": 18,
    "sampleText": 19,
    "wwsFamily": 21,
    "wwsSubfamily": 22,
}

SUPPORTED_EXTENSIONS = {".otf", ".ttf", ".woff", ".woff2"}


def sanitize_postscript_name(name: str) -> str:
    """PostScript names: max 63 chars, printable ASCII without [](){}<>/% or space."""
    cleaned = "".join(c for c in name if 33 <= ord(c) <= 126 and c not in "[](){}<>/%")
    return cleaned[:63] or "Font-Regular"


def inspect_font(font_path: Path | str) -> dict[str, Any]:
    """Reads and returns deep metadata from a font file."""
    path = Path(font_path)
    font = TTFont(str(path))

    data: dict[str, Any] = {
        "file": path.name,
        "path": str(path),
        "flavor": font.flavor,
        "sfntVersion": font.sfntVersion,
        "tables": sorted(list(font.keys())),
        "names": {},
        "os2": {},
        "cff": {},
    }

    # Inspect name table
    if "name" in font:
        name_table = font["name"]
        for record in name_table.names:
            try:
                val = record.toUnicode()
            except Exception:
                val = repr(record.string)
            key = f"ID_{record.nameID}"
            if key not in data["names"]:
                data["names"][key] = []
            data["names"][key].append({
                "nameID": record.nameID,
                "platformID": record.platformID,
                "platEncID": record.platEncID,
                "langID": hex(record.langID),
                "value": val,
            })

    # Inspect OS/2 table
    if "OS/2" in font:
        os2 = font["OS/2"]
        data["os2"]["usWeightClass"] = getattr(os2, "usWeightClass", None)
        data["os2"]["fsSelection"] = getattr(os2, "fsSelection", None)
        vend = getattr(os2, "achVendID", "")
        data["os2"]["achVendID"] = vend.strip() if isinstance(vend, str) else str(vend)

    # Inspect CFF table
    for tag in ("CFF ", "CFF2"):
        if tag in font:
            cff_table = font[tag].cff
            top_dict = cff_table.topDictIndex[0]
            cff_info: dict[str, Any] = {
                "tag": tag,
                "fontNames": list(getattr(cff_table, "fontNames", [])),
                "FamilyName": getattr(top_dict, "FamilyName", None),
                "FullName": getattr(top_dict, "FullName", None),
                "Weight": getattr(top_dict, "Weight", None),
                "version": getattr(top_dict, "version", None),
                "Notice": getattr(top_dict, "Notice", None),
                "Copyright": getattr(top_dict, "Copyright", None),
            }
            data["cff"] = cff_info
            break

    font.close()
    return data


def print_inspection(data: dict[str, Any]) -> None:
    """Pretty prints font metadata inspection report."""
    print("=" * 72)
    print(f"FONT: {data['file']}")
    print(f"PATH: {data['path']}")
    print(f"SFNT VERSION: {data['sfntVersion']} (Flavor: {data['flavor'] or 'desktop'})")
    print(f"TABLES ({len(data['tables'])}): {', '.join(data['tables'])}")
    print("-" * 72)

    # Key Identity fields
    print("IDENTITY & NAMES:")
    id_labels = {
        1: "Family (ID 1)",
        2: "Subfamily (ID 2)",
        4: "Full Name (ID 4)",
        6: "PostScriptName (ID 6)",
        3: "Unique ID (ID 3)",
        5: "Version (ID 5)",
        8: "Manufacturer (ID 8)",
        9: "Designer (ID 9)",
        0: "Copyright (ID 0)",
        7: "Trademark (ID 7)",
        11: "Vendor URL (ID 11)",
        12: "Designer URL (ID 12)",
        13: "License (ID 13)",
        14: "License URL (ID 14)",
        16: "Typographic Family (ID 16)",
        17: "Typographic Subfamily (ID 17)",
    }
    for nid, label in id_labels.items():
        key = f"ID_{nid}"
        if key in data["names"]:
            recs = data["names"][key]
            val = recs[0]["value"]
            print(f"  {label:<30}: {val}")

    # OS/2
    if data["os2"]:
        print("\nOS/2 TABLE:")
        print(f"  Weight Class                  : {data['os2'].get('usWeightClass')}")
        print(f"  Vendor ID (achVendID)         : '{data['os2'].get('achVendID')}'")
        fs_sel = data['os2'].get('fsSelection')
        flags = []
        if fs_sel is not None:
            if fs_sel & 1: flags.append("ITALIC")
            if fs_sel & 32: flags.append("BOLD")
            if fs_sel & 64: flags.append("REGULAR")
        print(f"  fsSelection                   : {fs_sel} ({', '.join(flags) or 'None'})")

    # CFF
    if data["cff"]:
        print(f"\n{data['cff']['tag']} TOP DICT (PostScript Outlines):")
        print(f"  FontNames                     : {data['cff'].get('fontNames')}")
        print(f"  FamilyName                    : {data['cff'].get('FamilyName')}")
        print(f"  FullName                      : {data['cff'].get('FullName')}")
        print(f"  Weight                        : {data['cff'].get('Weight')}")
        print(f"  Version                       : {data['cff'].get('version')}")
        print(f"  Notice                        : {data['cff'].get('Notice')}")
        print(f"  Copyright                     : {data['cff'].get('Copyright')}")

    print("=" * 72)


def clean_font(
    font_path: Path | str,
    out_path: Path | str | None = None,
    options: dict[str, Any] | None = None,
) -> bool:
    """
    Cleans and rewrites metadata deeply for a single font file.
    Supports .otf, .ttf, .woff, .woff2.
    """
    path = Path(font_path)
    save_path = Path(out_path) if out_path else path
    opts = options or {}

    try:
        font = TTFont(str(path))
    except Exception as err:
        print(f"Error opening {path.name}: {err}", file=sys.stderr)
        return False

    # 1. Preset resolution
    preset_name = opts.get("preset")
    config: dict[str, Any] = {}
    if preset_name and preset_name.lower() in PRESETS:
        config.update(PRESETS[preset_name.lower()])

    # Overlay explicit options
    for k in (
        "family",
        "subfamily",
        "weight",
        "designer",
        "designer_url",
        "foundry",
        "vendor_url",
        "vendor_id",
        "copyright",
        "trademark",
        "license",
        "license_url",
        "version",
        "description",
    ):
        if opts.get(k) is not None:
            config[k] = opts[k]

    clear_credit = opts.get("clear_credit", False)
    if clear_credit:
        config["designer"] = ""
        config["designer_url"] = ""
        config["foundry"] = ""
        config["vendor_url"] = ""
        config["copyright"] = ""
        config["trademark"] = ""
        config["license"] = ""
        config["license_url"] = ""
        config["description"] = ""

    # Current or new family / subfamily
    name_table = font["name"] if "name" in font else None

    def get_name(nid: int) -> str:
        if not name_table:
            return ""
        for rec in name_table.names:
            if rec.nameID == nid:
                try:
                    return rec.toUnicode()
                except Exception:
                    pass
        return ""

    family = config.get("family") or get_name(1) or path.stem.split("-")[0]
    subfamily = config.get("subfamily") or get_name(2) or "Regular"
    postscript_name = sanitize_postscript_name(f"{family.replace(' ', '')}-{subfamily.replace(' ', '')}")
    full_name = f"{family} {subfamily}".strip()
    version = config.get("version") or get_name(5) or "Version 1.000"

    vendor_id = config.get("vendor_id")
    if vendor_id is None and config.get("foundry"):
        vendor_id = config["foundry"][:4].upper()

    # 2. Update name table
    if name_table is not None:
        def set_name_record(nid: int, val: str | None) -> None:
            if val is None:
                return
            val_clean = val.strip()
            # Remove old records for this nameID
            name_table.names = [r for r in name_table.names if r.nameID != nid]
            if not val_clean:
                return  # Cleared

            # 1) Windows Unicode BMP (Platform 3, Encoding 1, English 0x0409)
            name_table.setName(val_clean, nid, 3, 1, 0x0409)

            # 2) Macintosh Roman (Platform 1, Encoding 0, Lang 0) if ASCII-compatible
            try:
                val_clean.encode("mac_roman")
                name_table.setName(val_clean, nid, 1, 0, 0)
            except UnicodeEncodeError:
                pass  # Non-MacRoman characters (Vietnamese, etc.) safely omitted from Mac record

        if "family" in config:
            set_name_record(NAME_IDS["fontFamily"], family)
            set_name_record(NAME_IDS["preferredFamily"], family)
            set_name_record(NAME_IDS["wwsFamily"], family)

        if "subfamily" in config:
            set_name_record(NAME_IDS["fontSubfamily"], subfamily)
            set_name_record(NAME_IDS["preferredSubfamily"], subfamily)
            set_name_record(NAME_IDS["wwsSubfamily"], subfamily)

        if "family" in config or "subfamily" in config:
            set_name_record(NAME_IDS["fullName"], full_name)
            set_name_record(NAME_IDS["postScriptName"], postscript_name)

        if "version" in config:
            set_name_record(NAME_IDS["version"], version)

        # Unique ID (ID 3)
        if opts.get("auto_unique_id") or "unique_id" in config:
            vend_tag = (vendor_id or "NONE")[:4].upper()
            uid = config.get("unique_id") or f"{version};{vend_tag};{postscript_name}"
            set_name_record(NAME_IDS["uniqueID"], uid)

        # Attribution / credit
        if "copyright" in config or clear_credit:
            set_name_record(NAME_IDS["copyright"], config.get("copyright", ""))
        if "trademark" in config or clear_credit:
            set_name_record(NAME_IDS["trademark"], config.get("trademark", ""))
        if "manufacturer" in config or "foundry" in config or clear_credit:
            set_name_record(NAME_IDS["manufacturer"], config.get("foundry") or config.get("manufacturer", ""))
        if "designer" in config or clear_credit:
            set_name_record(NAME_IDS["designer"], config.get("designer", ""))
        if "description" in config or clear_credit:
            set_name_record(NAME_IDS["description"], config.get("description", ""))
        if "vendor_url" in config or clear_credit:
            set_name_record(NAME_IDS["vendorURL"], config.get("vendor_url", ""))
        if "designer_url" in config or clear_credit:
            set_name_record(NAME_IDS["designerURL"], config.get("designer_url", ""))
        if "license" in config or clear_credit:
            set_name_record(NAME_IDS["license"], config.get("license", ""))
        if "license_url" in config or clear_credit:
            set_name_record(NAME_IDS["licenseURL"], config.get("license_url", ""))

    # 3. Update OS/2 table
    if "OS/2" in font:
        os2 = font["OS/2"]
        if vendor_id:
            os2.achVendID = (vendor_id.strip() + "    ")[:4]
        if config.get("weight") is not None:
            os2.usWeightClass = int(config["weight"])

    # 4. Deep Clean CFF / CFF2 table (PostScript Outlines)
    for tag in ("CFF ", "CFF2"):
        if tag in font:
            cff = font[tag].cff
            top_dict = cff.topDictIndex[0]

            if hasattr(cff, "fontNames") and cff.fontNames:
                cff.fontNames[0] = postscript_name
            if "family" in config:
                top_dict.FamilyName = family
            if "family" in config or "subfamily" in config:
                top_dict.FullName = full_name
            if "version" in config:
                top_dict.version = version

            def set_cff_field(field_name: str, val: str | None) -> None:
                if val and val.strip():
                    setattr(top_dict, field_name, val.strip())
                else:
                    if hasattr(top_dict, "rawDict") and field_name in top_dict.rawDict:
                        del top_dict.rawDict[field_name]
                    if hasattr(top_dict, field_name):
                        try:
                            delattr(top_dict, field_name)
                        except AttributeError:
                            pass

            if hasattr(cff, "fontNames") and cff.fontNames:
                cff.fontNames[0] = postscript_name
            if "family" in config:
                top_dict.FamilyName = family
            if "family" in config or "subfamily" in config:
                top_dict.FullName = full_name
            if "version" in config:
                top_dict.version = version

            c_text = config.get("copyright")
            if clear_credit:
                set_cff_field("Copyright", None)
                set_cff_field("Notice", None)
            elif c_text is not None:
                set_cff_field("Copyright", c_text)
                set_cff_field("Notice", c_text)

    # 5. Drop unwanted / tracking tables (e.g., FFTM, prop)
    drop_tables = opts.get("drop_tables") or []
    for tbl in drop_tables:
        if tbl in font:
            del font[tbl]

    # 6. Save cleanly
    save_path.parent.mkdir(parents=True, exist_ok=True)
    font.save(str(save_path))
    font.close()
    return True


def collect_font_files(target: Path, recursive: bool = False) -> list[Path]:
    """Finds all supported font files in path or directory."""
    if target.is_file():
        if target.suffix.lower() in SUPPORTED_EXTENSIONS:
            return [target]
        return []
    pattern = "**/*" if recursive else "*"
    return [p for p in target.glob(pattern) if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="TypeForge Deep Font Metadata & Credit Cleaner (fontTools)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcommand: inspect
    inspect_parser = subparsers.add_parser("inspect", help="Inspect metadata of font file(s)")
    inspect_parser.add_argument("target", help="Path to font file or directory")
    inspect_parser.add_argument("-r", "--recursive", action="store_true", help="Scan directory recursively")

    # Subcommand: clean
    clean_parser = subparsers.add_parser("clean", help="Clean or rewrite metadata of font file(s)")
    clean_parser.add_argument("target", help="Path to font file or directory")
    clean_parser.add_argument("-r", "--recursive", action="store_true", help="Scan directory recursively")
    clean_parser.add_argument("--out-dir", "-o", help="Output directory (default: modify in-place or in directory)")
    clean_parser.add_argument("--in-place", action="store_true", help="Overwrite input fonts in place")

    # Presets & Quick Actions
    clean_parser.add_argument("--preset", choices=["vinafont"], help="Apply standard metadata preset")
    clean_parser.add_argument("--clear-credit", action="store_true", help="Wipe all designer, foundry, copyright, license & URLs")

    # Granular fields
    clean_parser.add_argument("--family", help="Master Family name (e.g. 'Record Laser')")
    clean_parser.add_argument("--subfamily", help="Style / Subfamily (e.g. 'Bold Italic')")
    clean_parser.add_argument("--weight", type=int, help="OS/2 weight class (100..950)")
    clean_parser.add_argument("--designer", help="Designer / Author name (name ID 9)")
    clean_parser.add_argument("--designer-url", help="Designer URL (name ID 12)")
    clean_parser.add_argument("--foundry", help="Manufacturer / Foundry name (name ID 8)")
    clean_parser.add_argument("--vendor-url", help="Vendor URL (name ID 11)")
    clean_parser.add_argument("--vendor-id", help="OS/2 4-character vendor tag (e.g. 'VNFN')")
    clean_parser.add_argument("--version", help="Version string (name ID 5)")
    clean_parser.add_argument("--copyright", help="Copyright notice (name ID 0 & CFF)")
    clean_parser.add_argument("--trademark", help="Trademark notice (name ID 7)")
    clean_parser.add_argument("--license", help="License description (name ID 13)")
    clean_parser.add_argument("--license-url", help="License URL (name ID 14)")
    clean_parser.add_argument("--description", help="Font description (name ID 10)")
    clean_parser.add_argument("--auto-unique-id", action="store_true", help="Generate uniqueID {version};{vendor};{psname}")
    clean_parser.add_argument("--drop-tables", help="Comma-separated list of tables to drop (e.g. 'FFTM,prop')")

    args = parser.parse_args()
    target_path = Path(args.target)

    if not target_path.exists():
        print(f"Error: Target path does not exist: {target_path}", file=sys.stderr)
        sys.exit(1)

    files = collect_font_files(target_path, recursive=getattr(args, "recursive", False))
    if not files:
        print(f"No font files (.otf, .ttf, .woff, .woff2) found in {target_path}")
        return

    if args.command == "inspect":
        for font_file in files:
            data = inspect_font(font_file)
            print_inspection(data)
        return

    if args.command == "clean":
        options: dict[str, Any] = {
            "preset": args.preset,
            "clear_credit": args.clear_credit,
            "family": args.family,
            "subfamily": args.subfamily,
            "weight": args.weight,
            "designer": args.designer,
            "designer_url": args.designer_url,
            "foundry": args.foundry,
            "vendor_url": args.vendor_url,
            "vendor_id": args.vendor_id,
            "version": args.version,
            "copyright": args.copyright,
            "trademark": args.trademark,
            "license": args.license,
            "license_url": args.license_url,
            "description": args.description,
            "auto_unique_id": args.auto_unique_id,
        }
        if args.drop_tables:
            options["drop_tables"] = [t.strip() for t in args.drop_tables.split(",") if t.strip()]

        out_dir = Path(args.out_dir) if args.out_dir else None
        if not args.in_place and not out_dir:
            out_dir = (target_path if target_path.is_dir() else target_path.parent) / "cleaned"

        print(f"Processing {len(files)} font file(s)...")
        success_count = 0
        for f in files:
            dest = f if args.in_place else (out_dir / f.name)
            ok = clean_font(f, dest, options)
            if ok:
                success_count += 1
                print(f"  [OK] {f.name} -> {dest}")
            else:
                print(f"  [FAIL] {f.name}")

        print(f"\nDone. Successfully cleaned {success_count}/{len(files)} font(s).")


if __name__ == "__main__":
    main()
