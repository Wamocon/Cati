from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import fitz
import pdfplumber
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "1.NEW LEVEL PREMIUM"
OUT_DIR = ROOT / "quality" / "results" / "new-level-premium-extract"
PREVIEW_DIR = OUT_DIR / "previews"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def render_pdf_previews(path: Path, max_pages: int = 3) -> list[str]:
    relative = path.relative_to(SOURCE_DIR)
    safe_stem = re.sub(r"[^A-Za-z0-9_.-]+", "_", str(relative.with_suffix("")))
    output_paths: list[str] = []
    document = fitz.open(path)
    try:
        for index in range(min(max_pages, document.page_count)):
            page = document.load_page(index)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(1.4, 1.4), alpha=False)
            output_path = PREVIEW_DIR / f"{safe_stem}-page-{index + 1}.png"
            output_path.parent.mkdir(parents=True, exist_ok=True)
            pixmap.save(output_path)
            output_paths.append(str(output_path.relative_to(ROOT)))
    finally:
        document.close()
    return output_paths


def extract_pdf(path: Path) -> dict:
    with pdfplumber.open(path) as pdf:
        pages = []
        tables = []
        full_text_parts = []
        for page_index, page in enumerate(pdf.pages):
            text = normalize_text(page.extract_text(x_tolerance=1, y_tolerance=3) or "")
            if text:
                full_text_parts.append(text)
            page_tables = page.extract_tables() or []
            for table_index, table in enumerate(page_tables):
                cleaned_rows = [
                    [normalize_text(cell or "") for cell in row]
                    for row in table
                    if any(normalize_text(cell or "") for cell in row)
                ]
                if cleaned_rows:
                    tables.append(
                        {
                            "page": page_index + 1,
                            "table": table_index + 1,
                            "rows": cleaned_rows,
                            "row_count": len(cleaned_rows),
                        }
                    )
            pages.append(
                {
                    "page": page_index + 1,
                    "text": text[:4000],
                    "char_count": len(text),
                }
            )

    full_text = normalize_text("\n\n".join(full_text_parts))
    return {
        "page_count": len(pages),
        "text_char_count": len(full_text),
        "text_preview": full_text[:12000],
        "pages": pages,
        "tables": tables,
        "preview_images": render_pdf_previews(path),
    }


def image_metadata(path: Path) -> dict:
    try:
        with Image.open(path) as image:
            return {
                "width": image.width,
                "height": image.height,
                "mode": image.mode,
                "format": image.format,
            }
    except Exception as exc:
        return {"error": str(exc)}


def classify(path: Path) -> str:
    lower = str(path).lower()
    if "price list" in lower:
        return "price_list"
    if "facility map" in lower:
        return "facility_map"
    if "floor plan" in lower or "kat plani" in lower or "kat plani" in lower or "blok" in lower:
        return "floor_plan"
    if "numbering" in lower or "numarataj" in lower:
        return "numbering"
    if "document" in lower or "tapu" in lower or "imar" in lower or "yetki" in lower:
        return "legal_document"
    if "location" in lower:
        return "location"
    if "guaranteed rental" in lower:
        return "rental_income"
    if "photo" in lower or "current status" in lower or "showroom" in lower:
        return "media"
    return "other"


def main() -> None:
    if not SOURCE_DIR.exists():
        raise SystemExit(f"Source folder not found: {SOURCE_DIR}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    records = []
    for path in sorted(SOURCE_DIR.rglob("*")):
        if path.is_dir():
            continue
        relative = path.relative_to(SOURCE_DIR)
        record = {
            "path": str(relative),
            "absolute_path": str(path),
            "extension": path.suffix.lower(),
            "size_bytes": path.stat().st_size,
            "sha256": sha256(path),
            "class": classify(path),
            "last_modified": datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat(),
        }
        if path.suffix.lower() == ".pdf":
            try:
                record["pdf"] = extract_pdf(path)
            except Exception as exc:
                record["pdf_error"] = str(exc)
        elif path.suffix.lower() in {".jpg", ".jpeg", ".png", ".heic"}:
            record["image"] = image_metadata(path)
        records.append(record)

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_dir": str(SOURCE_DIR),
        "file_count": len(records),
        "by_class": {},
        "by_extension": {},
    }
    for record in records:
        summary["by_class"][record["class"]] = summary["by_class"].get(record["class"], 0) + 1
        summary["by_extension"][record["extension"]] = summary["by_extension"].get(record["extension"], 0) + 1

    report = {"summary": summary, "files": records}
    (OUT_DIR / "new-level-premium-extract.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    markdown_lines = [
        "# New Level Premium Extraction Report",
        "",
        f"Generated: {summary['generated_at']}",
        f"Source: `{SOURCE_DIR}`",
        f"Files: {summary['file_count']}",
        "",
        "## Classes",
        "",
    ]
    for key, value in sorted(summary["by_class"].items()):
        markdown_lines.append(f"- `{key}`: {value}")
    markdown_lines.extend(["", "## PDF Text Previews", ""])
    for record in records:
        if "pdf" not in record:
            continue
        markdown_lines.append(f"### {record['path']}")
        markdown_lines.append("")
        markdown_lines.append(f"- Pages: {record['pdf']['page_count']}")
        markdown_lines.append(f"- Extracted characters: {record['pdf']['text_char_count']}")
        if record["pdf"]["preview_images"]:
            markdown_lines.append(f"- Preview: `{record['pdf']['preview_images'][0]}`")
        preview = record["pdf"]["text_preview"][:3000]
        markdown_lines.append("")
        markdown_lines.append("```text")
        markdown_lines.append(preview if preview else "[No extractable text detected]")
        markdown_lines.append("```")
        markdown_lines.append("")

    (OUT_DIR / "new-level-premium-extract.md").write_text(
        "\n".join(markdown_lines),
        encoding="utf-8",
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
