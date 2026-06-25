from __future__ import annotations

import datetime as dt
import pathlib
import re
import struct
import zipfile
from dataclasses import dataclass, field
from xml.sax.saxutils import escape


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "phase-delivery" / "de"
ASSET_DIR = ROOT / "docs" / "phase-delivery" / "assets"


def x(value: object) -> str:
    return escape(str(value), {'"': "&quot;"})


def png_size(path: pathlib.Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not a PNG file: {path}")
    return struct.unpack(">II", data[16:24])


@dataclass
class ImageItem:
    file: str
    title: str
    caption: str

    @property
    def source(self) -> pathlib.Path:
        return ASSET_DIR / self.file


@dataclass
class PhaseDoc:
    phase: str
    title: str
    filename: str
    owner: str
    status: str
    summary: str
    business_value: str
    user_story: str
    workflow: list[list[str]]
    mindmap: list[list[str]]
    metrics: list[list[str]]
    features: list[list[str]]
    edge_cases: list[list[str]]
    qa: list[list[str]]
    production_gaps: list[list[str]]
    images: list[ImageItem]
    next_steps: list[list[str]]


class Docx:
    def __init__(self, phase: PhaseDoc):
        self.phase = phase
        self.images = phase.images

    def run(self, text: str, bold: bool = False, color: str | None = None, size: int | None = None) -> str:
        props = []
        if bold:
            props.append("<w:b/>")
        if color:
            props.append(f'<w:color w:val="{color}"/>')
        if size:
            props.append(f'<w:sz w:val="{size}"/>')
        rpr = f"<w:rPr>{''.join(props)}</w:rPr>" if props else ""
        return f"<w:r>{rpr}<w:t>{x(text)}</w:t></w:r>"

    def para(
        self,
        text: str = "",
        style: str | None = None,
        bold: bool = False,
        color: str | None = None,
        size: int | None = None,
        align: str | None = None,
        shade: str | None = None,
    ) -> str:
        ppr = []
        if style:
            ppr.append(f'<w:pStyle w:val="{style}"/>')
        if align:
            ppr.append(f'<w:jc w:val="{align}"/>')
        if shade:
            ppr.append(f'<w:shd w:fill="{shade}"/>')
        ppr_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>" if ppr else ""
        return f"<w:p>{ppr_xml}{self.run(text, bold=bold, color=color, size=size)}</w:p>"

    def list_para(self, text: str) -> str:
        return (
            "<w:p>"
            '<w:pPr><w:pStyle w:val="BodyText"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>'
            f"{self.run(text)}"
            "</w:p>"
        )

    def cell(self, content: str, width: int, fill: str | None = None, valign: str = "center") -> str:
        shd = f'<w:shd w:fill="{fill}"/>' if fill else ""
        return (
            "<w:tc>"
            f'<w:tcPr><w:tcW w:w="{width}" w:type="dxa"/><w:vAlign w:val="{valign}"/>{shd}'
            '<w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/>'
            '<w:start w:w="140" w:type="dxa"/><w:end w:w="140" w:type="dxa"/></w:tcMar></w:tcPr>'
            f"{content}"
            "</w:tc>"
        )

    def table(self, rows: list[list[str]], widths: list[int], header: bool = True) -> str:
        grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
        body = []
        for idx, row in enumerate(rows):
            fill = "F2F4F7" if header and idx == 0 else None
            cells = []
            for col, value in enumerate(row):
                cells.append(self.cell(self.para(value, bold=(header and idx == 0)), widths[col], fill=fill))
            body.append("<w:tr>" + "".join(cells) + "</w:tr>")
        return (
            "<w:tbl>"
            '<w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/>'
            '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="DADCE0"/>'
            '<w:left w:val="single" w:sz="4" w:color="DADCE0"/><w:bottom w:val="single" w:sz="4" w:color="DADCE0"/>'
            '<w:right w:val="single" w:sz="4" w:color="DADCE0"/><w:insideH w:val="single" w:sz="4" w:color="DADCE0"/>'
            '<w:insideV w:val="single" w:sz="4" w:color="DADCE0"/></w:tblBorders></w:tblPr>'
            f"<w:tblGrid>{grid}</w:tblGrid>{''.join(body)}</w:tbl>"
        )

    def mindmap_table(self) -> str:
        rows = []
        fills = [["E0F2FE", "ECFDF3", "E0F2FE"], ["F2F4F7", "DBEAFE", "F2F4F7"], ["FFF7E6", "ECFDF3", "FFF1F3"]]
        for r, row in enumerate(self.phase.mindmap):
            cells = []
            for c, value in enumerate(row):
                cells.append(self.cell(self.para(value, bold=(r == 1 and c == 1), align="center"), 3120, fill=fills[r][c]))
            rows.append("<w:tr>" + "".join(cells) + "</w:tr>")
        return (
            "<w:tbl><w:tblPr><w:tblW w:w=\"9360\" w:type=\"dxa\"/><w:tblInd w:w=\"120\" w:type=\"dxa\"/>"
            '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="DADCE0"/><w:left w:val="single" w:sz="4" w:color="DADCE0"/>'
            '<w:bottom w:val="single" w:sz="4" w:color="DADCE0"/><w:right w:val="single" w:sz="4" w:color="DADCE0"/>'
            '<w:insideH w:val="single" w:sz="4" w:color="DADCE0"/><w:insideV w:val="single" w:sz="4" w:color="DADCE0"/></w:tblBorders></w:tblPr>'
            "<w:tblGrid><w:gridCol w:w=\"3120\"/><w:gridCol w:w=\"3120\"/><w:gridCol w:w=\"3120\"/></w:tblGrid>"
            + "".join(rows)
            + "</w:tbl>"
        )

    def graph_table(self) -> str:
        rows = [["Kennzahl", "Wert", "Visualisierung", "Interpretation"]]
        for label, value, percent, note in self.phase.metrics:
            pct = max(0, min(100, int(percent)))
            filled = round(pct / 10)
            bar = "■" * filled + "□" * (10 - filled) + f" {pct}%"
            rows.append([label, value, bar, note])
        return self.table(rows, [2200, 1600, 2500, 3060])

    def image_xml(self, image: ImageItem, index: int, max_width_in: float = 6.15, max_height_in: float = 3.85) -> str:
        width_px, height_px = png_size(image.source)
        scale = min(max_width_in / width_px, max_height_in / height_px)
        width_emu = int(width_px * scale * 914400)
        height_emu = int(height_px * scale * 914400)
        rel_id = f"rIdImg{index}"
        return f"""
<w:p>
  <w:pPr><w:jc w:val="center"/></w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="{width_emu}" cy="{height_emu}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="{index}" name="{x(image.title)}" descr="{x(image.caption)}"/>
        <wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr><pic:cNvPr id="{index}" name="{x(image.file)}" descr="{x(image.caption)}"/><pic:cNvPicPr/></pic:nvPicPr>
              <pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="{rel_id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
              <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{width_emu}" cy="{height_emu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>
"""

    def page_break(self) -> str:
        return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

    def doc_xml(self) -> str:
        p = self.phase
        parts = [
            self.para(f"{p.phase}: {p.title}", style="Title"),
            self.para("Deutschsprachige Stakeholder-Dokumentation | Stand: 25. Juni 2026", color="667085"),
            self.table(
                [
                    ["Empfänger", "Management, Projektleitung, Fachabteilungen"],
                    ["Status", p.status],
                    ["Verantwortung", p.owner],
                    ["Ziel", p.summary],
                ],
                [1800, 7560],
                header=False,
            ),
            self.para("Kurzüberblick für Nicht-Techniker", style="Heading1"),
            self.para(p.business_value, style="BodyText"),
            self.para(p.user_story, style="BodyText", bold=True, color="047857", shade="ECFDF3"),
            self.para("Workflow: so läuft der Prozess", style="Heading1"),
            self.table([["Schritt", "Was passiert?", "Kontrolle", "Fehlerfall / Sonderfall"]] + p.workflow, [900, 3300, 2600, 2560]),
            self.para("Mindmap: wie die Phase zusammenhängt", style="Heading1"),
            self.mindmap_table(),
            self.para("Kennzahlen und Graphen", style="Heading1"),
            self.graph_table(),
            self.para("Umgesetzte Funktionen", style="Heading1"),
            self.table([["Funktion", "Nutzen für den Betrieb", "Status"]] + p.features, [2400, 5560, 1400]),
            self.page_break(),
            self.para("Screenshots aus der Anwendung", style="Heading1"),
        ]
        for idx, img in enumerate(p.images, start=1):
            parts.append(self.para(img.title, style="Heading2"))
            parts.append(self.image_xml(img, idx))
            parts.append(self.para(img.caption, style="Caption", align="center"))
        parts.extend(
            [
                self.para("Edge Cases und Fehlerbehandlung", style="Heading1"),
                self.table([["Situation", "Aktuelle Behandlung", "Warum wichtig?"]] + p.edge_cases, [2600, 3960, 2800]),
                self.para("QA, Abnahme und technische Prüfpunkte", style="Heading1"),
                self.table([["Prüfung", "Ergebnis", "Bedeutung"]] + p.qa, [2200, 1800, 5360]),
                self.para("Was ist für Produktion noch zu härten?", style="Heading1"),
                self.table([["Offener Punkt", "Empfehlung", "Priorität"]] + p.production_gaps, [3000, 4960, 1400]),
                self.para("Best-Practice-Abgleich aus Webrecherche", style="Heading1"),
                self.table(
                    [
                        ["Quelle", "Relevanz für diese Phase"],
                        ["Next.js App Router, Server/Client Components", "Servernahe Daten, weniger JavaScript im Browser, sichere Behandlung von Tokens und bessere First Contentful Paint."],
                        ["web.dev Core Web Vitals", "LCP bis 2,5 Sekunden, INP bis 200 ms, CLS bis 0,1 als Zielwerte für schnelle und stabile Bedienung."],
                        ["Supabase Row Level Security", "RLS muss für exponierte Tabellen aktiv sein; Rechte sollen pro Rolle und Datensatz begrenzt werden."],
                        ["OWASP ASVS", "Sicherheitsprüfung für Auth, Zugriff, Logging, Fehlerverhalten und Schutz sensibler Daten."],
                        ["WCAG 2.2", "Oberflächen müssen wahrnehmbar, bedienbar, verständlich und robust sein."],
                    ],
                    [3300, 6060],
                ),
                self.para("Nächste sinnvolle Schritte", style="Heading1"),
                self.table([["Nächster Schritt", "Ziel", "Abhängigkeit"]] + p.next_steps, [3000, 4560, 1800]),
            ]
        )

        sect = (
            '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
            '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>'
            "</w:sectPr>"
        )
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f"<w:body>{''.join(parts)}{sect}</w:body></w:document>"
        )

    def write(self) -> pathlib.Path:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        out = OUT_DIR / self.phase.filename
        for img in self.images:
            if not img.source.exists():
                raise FileNotFoundError(img.source)
        files = {
            "[Content_Types].xml": content_types(self.images),
            "_rels/.rels": package_rels(),
            "word/document.xml": self.doc_xml(),
            "word/_rels/document.xml.rels": document_rels(self.images),
            "word/styles.xml": styles_xml(),
            "word/settings.xml": settings_xml(),
            "word/numbering.xml": numbering_xml(),
            "docProps/core.xml": core_props(self.phase),
            "docProps/app.xml": app_props(),
        }
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as docx:
            for name, content in files.items():
                docx.writestr(name, content)
            for img in self.images:
                docx.write(img.source, f"word/media/{img.file}")
        return out


def content_types(images: list[ImageItem]) -> str:
    image_overrides = "".join(
        f'<Override PartName="/word/media/{x(img.file)}" ContentType="image/png"/>' for img in images
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  {image_overrides}
</Types>
"""


def package_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""


def document_rels(images: list[ImageItem]) -> str:
    rels = [
        '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
        '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
        '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    ]
    for idx, img in enumerate(images, start=1):
        rels.append(
            f'<Relationship Id="rIdImg{idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{x(img.file)}"/>'
        )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  {''.join(rels)}
</Relationships>
"""


def styles_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/><w:qFormat/>
    <w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="1F2937"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="BodyText">
    <w:name w:val="Body Text"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:sz w:val="22"/><w:color w:val="344054"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/><w:qFormat/>
    <w:pPr><w:spacing w:after="160"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="0B2545"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="320" w:after="160"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="2E74B5"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="2E74B5"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Caption">
    <w:name w:val="caption"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="80" w:after="120"/></w:pPr>
    <w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="667085"/></w:rPr>
  </w:style>
</w:styles>
"""


def numbering_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="singleLevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>
"""


def settings_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/>
</w:settings>
"""


def core_props(phase: PhaseDoc) -> str:
    now = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>{x(phase.phase)}: {x(phase.title)}</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>
"""


def app_props() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex OOXML Builder</Application><Company>Wamocon</Company>
</Properties>
"""


def phases() -> list[PhaseDoc]:
    shared_qa = [
        ["E2E-Test", "30/30 bestanden", "Desktop, Mobile, Login, Pitch, Dashboard und API wurden geprüft."],
        ["Browser-Audit", "26/26 Routen bestanden", "Keine erkannten Konsolenfehler, Seitenfehler oder horizontalen Überläufe."],
        ["Manuelle Browser-QA", "5/5 bestanden", "Die wichtigsten Phase-2-bis-5-Abläufe wurden im Browser geprüft."],
    ]
    return [
        PhaseDoc(
            phase="Phase 2",
            title="UX/UI und rollenbasierte Navigation",
            filename="phase-02-ux-ui-rollennavigation.docx",
            owner="Produkt, UX, Management",
            status="Umgesetzt und QA-geprüft",
            summary="Ein modernes, ruhiges und schnelles Bedienzentrum für die tägliche Verwaltung.",
            business_value="Diese Phase macht das System für normale Anwender verständlich. Management, Buchhaltung, Technik und Support sehen nicht mehr eine technische Datenbank, sondern eine klare Arbeitsoberfläche mit Aufgaben, Risiken, Kennzahlen und Navigation.",
            user_story="Als Manager möchte ich nach dem Login sofort sehen, wo Risiken, offene Aufgaben und wichtige Zahlen liegen, damit ich ohne technische Erklärung handeln kann.",
            workflow=[
                ["1", "Benutzer öffnet das Dashboard.", "Rollenstatus und Hauptkennzahlen werden angezeigt.", "Wenn keine echte Anmeldung aktiv ist, wird der Demo-Modus klar markiert."],
                ["2", "Benutzer wählt ein Modul links im Menü.", "Nur relevante Module werden sichtbar.", "Bei kleiner Bildschirmbreite wird die Navigation mobil nutzbar dargestellt."],
                ["3", "Karten, Diagramme und Simulation zeigen Prioritäten.", "AI-Hinweise bleiben erklärend und nicht automatisch ausführend.", "Lange Inhalte werden gestapelt statt überlappt."],
                ["4", "Benutzer nutzt Suche und Tabellen für Detailarbeit.", "Suchfelder und Tabellen sind direkt sichtbar.", "Keine externen Font-Abhängigkeiten im statischen Pitch-Test."],
            ],
            mindmap=[
                ["Zielgruppe: Management, Buchhaltung, Technik", "Nutzen: schnelle Übersicht", "Geräte: Desktop und Mobile"],
                ["Navigation", "Phase 2\nUX/UI + Rollen", "AI-Hinweise"],
                ["Fehlerfälle: Demo-Modus, kleine Screens", "Qualität: keine Überläufe", "Nächster Schritt: echte Nutzerprofile"],
            ],
            metrics=[
                ["Abgedeckte Phasen im Dashboard", "4/4", "100", "Alle neuen Phasen sind sichtbar."],
                ["Browser-Audit Routen", "26/26", "100", "Alle Kernseiten sind ohne erkannte UI-Fehler geprüft."],
                ["Mobile Nutzbarkeit", "bestanden", "90", "Dashboard stapelt sauber auf 390px Breite."],
            ],
            features=[
                ["Phase-2-bis-5-Lieferzentrum", "Management sieht sofort, welche Teile fertig sind.", "Fertig"],
                ["3D-Site-Simulation", "Risiken werden visuell statt nur tabellarisch gezeigt.", "Fertig"],
                ["AI-Operations-Assistent", "Prioritäten werden einfach formuliert.", "Fertig"],
                ["Rollenbasierte Navigation", "Teams sehen nur passende Module.", "Fertig"],
            ],
            edge_cases=[
                ["Kleiner Bildschirm", "Karten und Tabellen stapeln vertikal.", "Türkische Nutzer arbeiten oft auch über Laptop/Tablet."],
                ["Demo statt echter Auth", "Hinweisbox erklärt den Demo-Modus.", "Stakeholder verwechseln Demo nicht mit Produktion."],
                ["Viele Warnungen gleichzeitig", "Warnkarten trennen Risikoarten.", "Management erkennt schnell die wichtigste Baustelle."],
                ["Langsame Geräte", "Server-first Ansatz und reduzierte Browser-Last sind vorgesehen.", "Bessere gefühlte Geschwindigkeit."],
            ],
            qa=shared_qa + [["Screenshot-Prüfung", "bestanden", "Desktop- und Mobile-Screenshots wurden erstellt."]],
            production_gaps=[
                ["Echte Web-Vitals-Felddaten", "Nach Deployment LCP, INP und CLS mit Real-User-Monitoring messen.", "Hoch"],
                ["Finale Design-System-Tokens", "Farben, Abstände und Komponenten als feste UI-Regeln dokumentieren.", "Mittel"],
                ["Produktionsrollen", "Demo-Rollen durch echte Benutzerprofile ersetzen.", "Hoch"],
            ],
            images=[
                ImageItem("phase-hub-desktop.png", "Dashboard auf Desktop", "Das Management sieht Phase-Karten, Warnungen, Kennzahlen, Simulation und AI-Hinweise."),
                ImageItem("phase-hub-mobile.png", "Dashboard auf Mobile", "Die gleiche Arbeitslogik bleibt auf kleiner Breite lesbar und bedienbar."),
            ],
            next_steps=[
                ["Echte Nutzerrollen anschließen", "Manager, Buchhaltung, Technik und Support sauber trennen.", "Phase 3/5"],
                ["Performance-Monitoring ergänzen", "Core Web Vitals live messen.", "Deployment"],
                ["UAT mit Management", "Sprache, Prioritäten und Navigation final bestätigen.", "Client-Termin"],
            ],
        ),
        PhaseDoc(
            phase="Phase 3",
            title="Plattform, Auth, RBAC und Audit",
            filename="phase-03-plattform-auth-rbac-audit.docx",
            owner="Security, Backend, Operations",
            status="Umgesetzt als Plattform-Grundlage; Produktionshärtung geplant",
            summary="Sichtbare Sicherheits- und Kontrollbasis für Login, Rollen, Rechte, Audit und AI-Governance.",
            business_value="Diese Phase schafft Vertrauen. Sie zeigt, wer welche Rechte hat, welche sensiblen Aktionen protokolliert werden und welche Kontrollen für Authentifizierung, Datenzugriff und AI-Entscheidungen vorgesehen sind.",
            user_story="Als Geschäftsführer möchte ich sehen, dass Finanz-, Zugriff- und AI-Entscheidungen nicht unkontrolliert passieren, sondern nachvollziehbar und rollenbasiert gesteuert werden.",
            workflow=[
                ["1", "Benutzer meldet sich oder wählt Demo-Rolle.", "Navigation wird nach Rolle gefiltert.", "Unpassende Module bleiben verborgen."],
                ["2", "Ayarlar / Plattform-Audit wird geöffnet.", "Kontrollen zeigen Status: aktiv oder in Prüfung.", "Offene Produktionshärtung bleibt sichtbar."],
                ["3", "RBAC-Matrix wird geprüft.", "Finanz, Zugriff, Nutzerverwaltung und Export sind getrennt.", "Rollen ohne Recht sehen kein grünes Freigabe-Signal."],
                ["4", "Audit-Ereignisse werden geprüft.", "Aktion, Akteur, Modul, Risiko und Entscheidung werden gezeigt.", "High-Risk-Ereignisse sind markiert."],
            ],
            mindmap=[
                ["Auth: Demo und später Supabase", "Rechte: RBAC-Matrix", "Audit: Ereignisse und Risiko"],
                ["Sicherheit", "Phase 3\nPlattform + RBAC + Audit", "AI-Governance"],
                ["Edge: falsche Rolle", "Daten: RLS-Vorbereitung", "Nächster Schritt: echte Policies"],
            ],
            metrics=[
                ["Plattformkontrollen", "5", "100", "Auth, RBAC, Audit, Data und AI sind modelliert."],
                ["Aktive Kontrollen", "3/5", "60", "MVP-Kontrollen sind aktiv, zwei bleiben als Review markiert."],
                ["Audit-Ereignisse", "5", "100", "Beispielereignisse decken Auth, Finance, Access, AI und Import ab."],
            ],
            features=[
                ["Platform & Audit Center", "Zentrale Ansicht für Sicherheits- und Kontrollthemen.", "Fertig"],
                ["RBAC-Matrix", "Zeigt, welche Rolle Finanz, Zugriff, Nutzer und Export darf.", "Fertig"],
                ["Audit-Tabelle", "Macht sensible Vorgänge nachvollziehbar.", "Fertig"],
                ["AI-Mensch-Freigabe", "AI gibt Empfehlungen, führt sensible Aktionen aber nicht blind aus.", "Geplant/Modelliert"],
            ],
            edge_cases=[
                ["Falsche Rolle", "Navigation und Rechte werden eingeschränkt.", "Verhindert versehentliche Einsicht in sensible Bereiche."],
                ["Finanzexport", "Audit-Ereignis hält Entscheidung fest.", "Export ist compliance-relevant."],
                ["Zugriffskontrolle", "Security-Ereignisse werden sichtbar.", "Sperrungen müssen nachvollziehbar sein."],
                ["AI-Empfehlung", "AI-Aktion ist als Audit-Ereignis modelliert.", "AI darf keine kritische Entscheidung unsichtbar treffen."],
            ],
            qa=shared_qa + [["API-Status", "HTTP 200", "Phase-Status-API liefert 4 abgeschlossene Phasen, 5 Kontrollen und 5 Audit-Events."]],
            production_gaps=[
                ["Supabase RLS finalisieren", "RLS für alle exponierten Tabellen aktivieren und pro Rolle testen.", "Hoch"],
                ["MFA und Session-Regeln", "Für Management und Finanzrollen strengere Anmeldung planen.", "Hoch"],
                ["Audit-Aufbewahrung", "Aufbewahrungsdauer, Export und Manipulationsschutz festlegen.", "Mittel"],
            ],
            images=[
                ImageItem("phase-3-platform-audit.png", "Platform & Audit Center", "Die Ansicht zeigt Kontrollen, RBAC, Audit-Ereignisse und Betriebseinstellungen."),
            ],
            next_steps=[
                ["RLS-Policies implementieren", "Datenschutz auf Datenbankebene sichern.", "Supabase Schema"],
                ["Echte Auth anschließen", "Demo-Rollen durch echte Nutzer ersetzen.", "Deployment"],
                ["Security-Testplan erweitern", "OWASP-ASVS-relevante Fälle systematisch prüfen.", "QA"],
            ],
        ),
        PhaseDoc(
            phase="Phase 4",
            title="Site-, Block-, Etagen-, Wohnungs- und Importmodell",
            filename="phase-04-site-import-datenmodell.docx",
            owner="Operations, Data, Backend",
            status="Umgesetzt und browsergeprüft",
            summary="Ein kontrolliertes Datenmodell für Anlage, Blöcke, Etagen, Einheiten, Status, Schulden, Zugriff und Importqualität.",
            business_value="Diese Phase macht aus losen Excel-Listen eine überprüfbare Betriebsgrundlage. Bevor Daten in den Alltag übernommen werden, zeigt das System gültige Zeilen, Warnungen und abgelehnte Zeilen.",
            user_story="Als Operations-Team möchte ich Wohnungsdaten importieren und prüfen, bevor sie operative Entscheidungen beeinflussen.",
            workflow=[
                ["1", "Daire Matrisi wird geöffnet.", "Blöcke, Belegung, Wartung, Schulden und Zugriff werden sichtbar.", "Unklare Status sind farblich getrennt."],
                ["2", "Import-Validierung wird geprüft.", "Gültige Zeilen, Warnungen und abgelehnte Zeilen werden gezählt.", "Warnungen brauchen Entscheidung statt Blindimport."],
                ["3", "Einheit wird gesucht.", "Suche nach A-0101 liefert den passenden Datensatz.", "Leere oder falsche Suche zeigt keine falschen Treffer."],
                ["4", "Qualitätstor entscheidet.", "0 abgelehnte Zeilen bedeutet: Import kann vorbereitet werden.", "Warnungen bleiben vor Umsetzung sichtbar."],
            ],
            mindmap=[
                ["Daten: Block, Etage, Einheit", "Status: voll, leer, blockiert", "Finanz: Schuld und Deposit"],
                ["Import", "Phase 4\nSite-Datenmodell", "Zugriff und Service"],
                ["Edge: Duplikate", "Qualitätstor", "Nächster Schritt: echter Dateiimport"],
            ],
            metrics=[
                ["Importzeilen", "2.156", "100", "Alle Beispielzeilen werden gezählt."],
                ["Gültige Zeilen", "2.124", "99", "Sehr hoher Anteil ist direkt nutzbar."],
                ["Abgelehnte Zeilen", "0", "100", "Aktuell kein harter Importblocker."],
                ["Warnungen", "32", "85", "Warnungen müssen fachlich geprüft werden."],
            ],
            features=[
                ["Blockübersicht", "Management sieht Zustand je Block.", "Fertig"],
                ["Visuelle Wohnungsmatrix", "Einheiten werden farblich nach Status dargestellt.", "Fertig"],
                ["Import-Validierung", "Excel/Listendaten werden vor Übernahme geprüft.", "Fertig"],
                ["Datensuche", "Einheiten wie A-0101 sind schnell auffindbar.", "Fertig"],
            ],
            edge_cases=[
                ["Doppelte Einheit", "Als Importwarnung einplanen.", "Sonst entstehen falsche Eigentümer- oder Schuldzuordnungen."],
                ["Fehlende Telefonnummer", "Warnung statt harter Fehler.", "Betrieb kann entscheiden, ob Nachpflege reicht."],
                ["Blockierter Zugriff", "Einheit zeigt Zugriffseinschränkung.", "Sicherheits- und Finanzteams müssen das sehen."],
                ["Null abgelehnte Zeilen", "Import ist technisch bereit, Warnungen bleiben offen.", "Kein Blindimport ohne fachliche Kontrolle."],
            ],
            qa=shared_qa + [["Manuelle Suche", "A-0101 gefunden", "Die Detailtabelle reagiert auf Sucheingaben."]],
            production_gaps=[
                ["Echter Datei-Upload", "CSV/XLSX-Upload mit Vorschau, Mapping und Rollback bauen.", "Hoch"],
                ["Import-Historie", "Jeden Import mit Nutzer, Zeit, Datei und Änderung speichern.", "Hoch"],
                ["Duplikatregeln", "Eindeutige Schlüssel für Block, Etage und Einheit final festlegen.", "Mittel"],
            ],
            images=[
                ImageItem("phase-4-import-validation.png", "Import-Validierung und Einheitensuche", "Die Ansicht zeigt Qualitätsprüfung, Warnungen, 0 abgelehnte Zeilen und Suche nach A-0101."),
            ],
            next_steps=[
                ["Upload-Flow bauen", "Fachbereich kann Dateien selbst prüfen.", "Dateiformat"],
                ["Rollback einplanen", "Fehlerhafte Imports rückgängig machen.", "Audit/DB"],
                ["Datenmigration vorbereiten", "Kundendaten kontrolliert übernehmen.", "Client-Daten"],
            ],
        ),
        PhaseDoc(
            phase="Phase 5",
            title="Benutzer, Eigentümer, Mieter, Gäste, Personal und Rollen",
            filename="phase-05-benutzer-rollen-personal.docx",
            owner="Operations, HR, Support, Security",
            status="Umgesetzt und QA-geprüft",
            summary="Eine klare Personen- und Rollenverwaltung für interne Teams und Bewohner-/Kundendaten.",
            business_value="Diese Phase zeigt, wer im System arbeitet, welche Rolle die Person hat, welche Aufgaben offen sind und welche Rechte jede Rolle besitzt. Dadurch wird die Organisation steuerbar und weniger abhängig von mündlicher Abstimmung.",
            user_story="Als Operations-Leitung möchte ich sehen, wer für Finanzen, Technik, Sicherheit und Support zuständig ist und welche Rechte jede Rolle hat.",
            workflow=[
                ["1", "Kullanıcılar & Roller wird geöffnet.", "Personenzahlen, Aufgaben und Finanzfreigaben werden sichtbar.", "Trainingsstatus wird als eigener Status angezeigt."],
                ["2", "Staff-Karten zeigen Verantwortliche.", "Rolle, Team, Telefon, Aufgaben und Limit werden sichtbar.", "Fehlende oder falsche Daten sind direkt auffällig."],
                ["3", "Benutzer wird gesucht.", "Suche nach Merve zeigt Buchhaltungsrolle.", "Keine falschen Treffer bei enger Suche."],
                ["4", "Rollenmatrix wird geprüft.", "Finanz, Zugriff, Nutzerverwaltung und Export sind getrennt.", "Rollen ohne Recht bleiben auf Nein."],
            ],
            mindmap=[
                ["Personen: Eigentümer, Mieter, Gäste", "Team: Management, Buchhaltung, Technik", "Rechte: Finanz, Zugriff, Export"],
                ["Rollen", "Phase 5\nPersonen + Personal", "Aufgabenlast"],
                ["Edge: Rolle geändert", "Sprache und Kontakt", "Nächster Schritt: Einladung/Provisioning"],
            ],
            metrics=[
                ["Personalprofile", "5", "83", "Kernrollen sind als operative Beispiele vorhanden."],
                ["Sakin-Konten", "119", "80", "Bewohner-/Kundenbasis ist sichtbar modelliert."],
                ["Aktive Aufgaben", "64", "75", "Arbeitslast ist im Management sichtbar."],
                ["Finanzfreigeber", "4", "70", "Finanzverantwortung ist getrennt ausgewiesen."],
            ],
            features=[
                ["Personalkarten", "Schneller Überblick über Team, Aufgaben und Freigabelimit.", "Fertig"],
                ["Rollenmatrix", "Zeigt klar, welche Rolle was darf.", "Fertig"],
                ["Personensuche", "Mitarbeiter und Rollen sind schnell auffindbar.", "Fertig"],
                ["Bewohner-/Risikozahlen", "Eigentümer, Mieter, Gäste und Risiko werden sichtbar.", "Fertig"],
            ],
            edge_cases=[
                ["Rolle ohne Finanzrecht", "Matrix zeigt Nein bei Finanzfreigabe.", "Verhindert falsche Zahlungen oder Exporte."],
                ["Mitarbeiter in Einarbeitung", "Status Training wird getrennt angezeigt.", "Neue Nutzer bekommen nicht automatisch volle Verantwortung."],
                ["Mehrsprachige Bewohner", "Sprach-/Kontaktmodell ist vorgesehen.", "Türkische Teams betreuen häufig internationale Bewohner."],
                ["Exportrecht", "Export ist separat sichtbar.", "Personen- und Finanzdaten sind sensibel."],
            ],
            qa=shared_qa + [["Manuelle Suche", "Merve Muhasebe gefunden", "Die Suche bestätigt, dass Mitarbeiterdaten bedienbar sind."]],
            production_gaps=[
                ["Einladungsprozess", "Echte Nutzer per Einladung, Rollenprüfung und Aktivierung anlegen.", "Hoch"],
                ["Passwort- und MFA-Flows", "Reset, Sperrung und sichere Anmeldung definieren.", "Hoch"],
                ["Änderungshistorie für Rollen", "Jede Rollenänderung auditierbar speichern.", "Mittel"],
            ],
            images=[
                ImageItem("phase-5-users-roles.png", "Benutzer, Personal und Rollen", "Die Ansicht zeigt Personalkarten, Suche nach Merve und die Rollen-/Rechtematrix."),
            ],
            next_steps=[
                ["User-Provisioning bauen", "Echte Mitarbeiter einladen und Rollen vergeben.", "Auth"],
                ["Rollenänderungen auditieren", "Jede Änderung bleibt nachvollziehbar.", "Phase 3"],
                ["Kundendaten verbinden", "Eigentümer, Mieter und Gäste mit Einheiten verknüpfen.", "Phase 4"],
            ],
        ),
    ]


def validate_docx(path: pathlib.Path) -> None:
    with zipfile.ZipFile(path) as z:
        required = {
            "[Content_Types].xml",
            "_rels/.rels",
            "word/document.xml",
            "word/styles.xml",
            "word/settings.xml",
            "word/numbering.xml",
            "word/_rels/document.xml.rels",
        }
        missing = required - set(z.namelist())
        if missing:
            raise RuntimeError(f"{path.name}: missing {sorted(missing)}")
        doc_xml = z.read("word/document.xml").decode("utf-8")
        for expected in ["Workflow", "Mindmap", "Kennzahlen", "Edge Cases", "Best-Practice"]:
            if expected not in re.sub(r"<[^>]+>", " ", doc_xml):
                raise RuntimeError(f"{path.name}: expected text missing: {expected}")
        media = [name for name in z.namelist() if name.startswith("word/media/")]
        if not media:
            raise RuntimeError(f"{path.name}: no embedded media")


def main() -> None:
    outputs = []
    for phase in phases():
        out = Docx(phase).write()
        validate_docx(out)
        outputs.append(out)
    print("\n".join(str(path) for path in outputs))


if __name__ == "__main__":
    main()
