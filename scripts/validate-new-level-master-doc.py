from __future__ import annotations

import pathlib
import re
import zipfile
import xml.etree.ElementTree as ET


path = pathlib.Path("docs/client-new-level-premium/New-Level-Premium-CRM-Business-Blueprint-DE.docx")

with zipfile.ZipFile(path) as z:
    names = set(z.namelist())
    required = {
        "[Content_Types].xml",
        "_rels/.rels",
        "docProps/core.xml",
        "docProps/app.xml",
        "word/document.xml",
        "word/_rels/document.xml.rels",
        "word/styles.xml",
        "word/settings.xml",
        "word/numbering.xml",
    }
    missing = sorted(required - names)
    xml = z.read("word/document.xml").decode("utf-8")
    ET.fromstring(xml)
    text = " ".join(re.findall(r"<w:t>(.*?)</w:t>", xml))
    media = [name for name in names if name.startswith("word/media/")]
    page_count = xml.count('w:type="page"') + 1
    checks = {
        "missing": missing,
        "bytes": path.stat().st_size,
        "planned_pages": page_count,
        "embedded_images": len(media),
        "has_new_level": "New Level Premium" in text,
        "has_ataberk": "Ataberk Estate" in text,
        "has_avsallar": "Avsallar" in text,
        "has_private_beach": "Privatstrand" in text,
        "has_owner_service": "Eigentümer" in text,
        "has_rental": "Vermietung" in text,
        "has_installments": "Ratenplan" in text,
        "has_phase_15": "Phase 15" in text,
        "has_no_bad_old_heading": "Technisches Zielbild ohne Fachjargon" not in text,
    }

print(path)
print(checks)

if missing or page_count < 100 or len(media) < 3:
    raise SystemExit(1)

for key, value in checks.items():
    if key in {"missing", "bytes", "planned_pages", "embedded_images"}:
        continue
    if not value:
        raise SystemExit(1)
