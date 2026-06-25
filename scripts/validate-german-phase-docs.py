import pathlib
import re
import zipfile
import xml.etree.ElementTree as ET


root = pathlib.Path("docs/phase-delivery/de")
forbidden = ["E2E", "TypeScript", "lint", "HTTP 200", "Browser-Audit", "QA-geprüft"]
for path in sorted(root.glob("*.docx")):
    with zipfile.ZipFile(path) as z:
        names = set(z.namelist())
        required = {
            "[Content_Types].xml",
            "_rels/.rels",
            "word/document.xml",
            "word/_rels/document.xml.rels",
            "word/styles.xml",
            "word/settings.xml",
            "word/numbering.xml",
        }
        missing = sorted(required - names)
        ET.fromstring(z.read("word/document.xml"))
        ET.fromstring(z.read("word/_rels/document.xml.rels"))
        media = [name for name in names if name.startswith("word/media/")]
        text = " ".join(re.findall(r"<w:t>(.*?)</w:t>", z.read("word/document.xml").decode("utf-8")))
        checks = {
            "missing": missing,
            "media": len(media),
            "has_umlaut": any(ch in text for ch in "äöüÄÖÜß"),
            "has_management_summary": "Management Summary" in text,
            "has_feature_overview": "Funktionsübersicht" in text,
            "has_workflow": "Täglicher Arbeitsablauf" in text,
            "has_mindmap": "Mindmap" in text,
            "has_business_rules": "Geschäftsregeln" in text,
            "has_training": "Schulung" in text,
            "has_ataberk_context": "Ataberk Estate" in text,
            "has_new_level_context": "New Level Premium" in text,
            "no_dev_words": not any(word in text for word in forbidden),
        }
        print(path.name, checks)
        if missing or not media or not all(v for k, v in checks.items() if k not in {"missing", "media"}):
            raise SystemExit(1)
