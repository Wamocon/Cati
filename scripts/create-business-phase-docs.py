from __future__ import annotations

import datetime as dt
import pathlib
import re
import struct
import zipfile
from dataclasses import dataclass
from xml.sax.saxutils import escape


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "phase-delivery" / "de"
ASSET_DIR = ROOT / "docs" / "phase-delivery" / "business-assets"

CLIENT_CONTEXT_ROWS = [
    ["Kunde", "Ataberk Estate"],
    ["Pilotprojekt", "New Level Premium, Avsallar / Alanya"],
    ["Projektangebot", "Wohnungen zum Verkauf aus einem 5-Sterne-Projekt"],
    ["Aktuelle Ausrichtung", "Die erste CRM-Version wird bewusst für Ataberk Estate und dieses Premium-Projekt geschärft."],
    ["Spätere Ausbaustufe", "Die Logik soll danach als allgemeines CRM für weitere Projekte, Standorte und Unternehmen nutzbar bleiben."],
]

CLIENT_CONTEXT_BULLETS = [
    "Ataberk Estate arbeitet öffentlich mit Kauf, Miete, Neubau-/Bauträgerangeboten und Services rund um Immobilien in der Türkei.",
    "Für die erste Version ist New Level Premium in Avsallar der fachliche Anker: ein Premium-Projekt, bei dem Verkauf, Beratung, Dokumente, Zahlung, Online-Besichtigung und After-Sales eng zusammenhängen.",
    "Die öffentliche Ataberk-Präsenz zeigt WhatsApp, Telegram, Rückruf und Anfrageformulare als wichtige Kontaktkanäle. Das CRM muss diese Kanäle deshalb als Lead- und Servicefluss berücksichtigen.",
    "Die Website stellt Alanya und Avsallar als wichtige Standortkontexte dar. Die CRM-Oberfläche soll Standort, Projekt, verfügbare Einheiten und Kundeninteresse schnell verständlich machen.",
    "Services wie Online-Besichtigung, Möbelkauf, Verkaufshilfe, Mietthemen, TAPU-/Kaufprozess, Ratenzahlung und Investmentargumente müssen in der fachlichen Planung sichtbar bleiben.",
]

CLIENT_SOURCE_ROWS = [
    ["Ataberk Website", "https://www.ataberkestate.com/"],
    ["New Level Premium Artikel", "https://www.ataberkestate.com/articles/proekt-new-level-premium-investiruy-zarabatyvay-i-otdykhay"],
    ["Avsallar Kontext", "https://www.ataberkestate.com/turkey/complex-in-avsallar"],
]


def esc(value: object) -> str:
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
    explanation: str

    @property
    def source(self) -> pathlib.Path:
        return ASSET_DIR / self.file


@dataclass
class PhaseDoc:
    phase: str
    title: str
    filename: str
    audience: str
    business_goal: str
    management_summary: str
    why_it_matters: list[str]
    feature_table: list[list[str]]
    workflow: list[list[str]]
    mindmap: list[list[str]]
    kpis: list[list[str]]
    business_rules: list[list[str]]
    screenshots: list[ImageItem]
    training_points: list[str]
    business_decisions: list[list[str]]
    next_phase_links: list[list[str]]


class BusinessDocx:
    def __init__(self, phase: PhaseDoc):
        self.phase = phase

    def run(self, text: str, bold: bool = False, color: str | None = None, size: int | None = None) -> str:
        props = []
        if bold:
            props.append("<w:b/>")
        if color:
            props.append(f'<w:color w:val="{color}"/>')
        if size:
            props.append(f'<w:sz w:val="{size}"/>')
        rpr = f"<w:rPr>{''.join(props)}</w:rPr>" if props else ""
        return f"<w:r>{rpr}<w:t>{esc(text)}</w:t></w:r>"

    def para(
        self,
        text: str = "",
        style: str | None = None,
        bold: bool = False,
        color: str | None = None,
        size: int | None = None,
        align: str | None = None,
        fill: str | None = None,
    ) -> str:
        ppr = []
        if style:
            ppr.append(f'<w:pStyle w:val="{style}"/>')
        if align:
            ppr.append(f'<w:jc w:val="{align}"/>')
        if fill:
            ppr.append(f'<w:shd w:fill="{fill}"/>')
        ppr_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>" if ppr else ""
        return f"<w:p>{ppr_xml}{self.run(text, bold=bold, color=color, size=size)}</w:p>"

    def bullet(self, text: str) -> str:
        return (
            "<w:p>"
            '<w:pPr><w:pStyle w:val="BodyText"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>'
            f"{self.run(text)}"
            "</w:p>"
        )

    def cell(self, content: str, width: int, fill: str | None = None) -> str:
        shd = f'<w:shd w:fill="{fill}"/>' if fill else ""
        return (
            "<w:tc>"
            f'<w:tcPr><w:tcW w:w="{width}" w:type="dxa"/><w:vAlign w:val="center"/>{shd}'
            '<w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>'
            '<w:start w:w="150" w:type="dxa"/><w:end w:w="150" w:type="dxa"/></w:tcMar></w:tcPr>'
            f"{content}</w:tc>"
        )

    def table(self, rows: list[list[str]], widths: list[int], header: bool = True) -> str:
        grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
        trs = []
        for r, row in enumerate(rows):
            fill = "F2F4F7" if header and r == 0 else None
            cells = [self.cell(self.para(value, bold=(header and r == 0)), widths[i], fill=fill) for i, value in enumerate(row)]
            trs.append("<w:tr>" + "".join(cells) + "</w:tr>")
        return (
            '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/>'
            '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="DADCE0"/><w:left w:val="single" w:sz="4" w:color="DADCE0"/>'
            '<w:bottom w:val="single" w:sz="4" w:color="DADCE0"/><w:right w:val="single" w:sz="4" w:color="DADCE0"/>'
            '<w:insideH w:val="single" w:sz="4" w:color="DADCE0"/><w:insideV w:val="single" w:sz="4" w:color="DADCE0"/></w:tblBorders></w:tblPr>'
            f"<w:tblGrid>{grid}</w:tblGrid>{''.join(trs)}</w:tbl>"
        )

    def mindmap(self) -> str:
        fills = [["ECFDF3", "EFF6FF", "ECFDF3"], ["F2F4F7", "DBEAFE", "F2F4F7"], ["FFF7E6", "F2FCE2", "FFF7E6"]]
        rows = []
        for r, row in enumerate(self.phase.mindmap):
            cells = []
            for c, value in enumerate(row):
                cells.append(self.cell(self.para(value, bold=(r == 1 and c == 1), align="center"), 3120, fills[r][c]))
            rows.append("<w:tr>" + "".join(cells) + "</w:tr>")
        return (
            '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/>'
            '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="DADCE0"/><w:left w:val="single" w:sz="4" w:color="DADCE0"/>'
            '<w:bottom w:val="single" w:sz="4" w:color="DADCE0"/><w:right w:val="single" w:sz="4" w:color="DADCE0"/>'
            '<w:insideH w:val="single" w:sz="4" w:color="DADCE0"/><w:insideV w:val="single" w:sz="4" w:color="DADCE0"/></w:tblBorders></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="3120"/><w:gridCol w:w="3120"/><w:gridCol w:w="3120"/></w:tblGrid>'
            + "".join(rows)
            + "</w:tbl>"
        )

    def kpi_graph(self) -> str:
        rows = [["Kennzahl", "Bedeutung", "Geschäftliche Lesart"]]
        for label, value, note in self.phase.kpis:
            rows.append([label, value, note])
        return self.table(rows, [2500, 2200, 4660])

    def image(self, image: ImageItem, idx: int, max_width_in: float = 6.2, max_height_in: float = 3.9) -> str:
        width_px, height_px = png_size(image.source)
        scale = min(max_width_in / width_px, max_height_in / height_px)
        width_emu = int(width_px * scale * 914400)
        height_emu = int(height_px * scale * 914400)
        rel_id = f"rIdImg{idx}"
        return f"""
<w:p>
  <w:pPr><w:jc w:val="center"/></w:pPr>
  <w:r><w:drawing>
    <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="{width_emu}" cy="{height_emu}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>
      <wp:docPr id="{idx}" name="{esc(image.title)}" descr="{esc(image.explanation)}"/>
      <wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:nvPicPr><pic:cNvPr id="{idx}" name="{esc(image.file)}" descr="{esc(image.explanation)}"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="{rel_id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{width_emu}" cy="{height_emu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing></w:r>
</w:p>
"""

    def page_break(self) -> str:
        return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

    def body(self) -> str:
        p = self.phase
        parts = [
            self.para(f"{p.phase}: {p.title}", style="Title"),
            self.para("Ataberk Estate / New Level Premium Avsallar | Business-Dokumentation für Management und Fachbereiche | Stand: 25. Juni 2026", color="667085"),
            self.table(
                [
                    ["Zielgruppe", p.audience],
                    ["Business-Ziel", p.business_goal],
                    ["Kundenfokus", "Ataberk Estate, New Level Premium, Avsallar / Alanya"],
                    ["Dokumenttyp", "Fachliche Erklärung, Know-how, Bedienlogik und Management-Entscheidungen"],
                ],
                [1900, 7460],
                header=False,
            ),
            self.para("Management Summary", style="Heading1"),
            self.para(p.management_summary, style="BodyText", bold=True, color="0B2545", fill="EFF6FF"),
            self.para("Kunden- und Projektkontext: Ataberk Estate", style="Heading1"),
            self.para(
                "Diese Dokumentation wurde nachträglich auf den tatsächlichen Kundenkontext geschärft. Der fachliche Fokus liegt jetzt nicht auf einem anonymen CRM, sondern auf Ataberk Estate und dem Projekt New Level Premium in Avsallar. Das ist wichtig, weil Vertrieb, Beratung, Exposé, Zahlungslogik, Dokumente, After-Sales und Vermietungsargumente für diesen Kunden besonders eng zusammenarbeiten müssen.",
                style="BodyText",
            ),
            self.table(CLIENT_CONTEXT_ROWS, [2100, 7260], header=False),
            self.para("Was daraus für die Phase folgt", style="Heading2"),
        ]
        for item in CLIENT_CONTEXT_BULLETS:
            parts.append(self.bullet(item))

        parts.extend(
            [
                self.para("Öffentliche Referenzpunkte", style="Heading2"),
                self.table(CLIENT_SOURCE_ROWS, [2800, 6560], header=False),
            ]
        )
        parts.extend([
            self.para("Warum diese Phase wichtig ist", style="Heading1"),
        ])
        for item in p.why_it_matters:
            parts.append(self.bullet(item))

        parts.extend(
            [
                self.para("Funktionsübersicht und Know-how", style="Heading1"),
                self.para(
                    "Die folgende Tabelle erklärt jede Funktion aus Geschäftssicht. Sie beschreibt nicht, wie der Code gebaut ist, sondern welchen Arbeitsnutzen die Funktion liefert und welche Regeln der Fachbereich kennen muss.",
                    style="BodyText",
                ),
                self.table([["Funktion", "Was ist enthalten?", "Business-Nutzen", "Know-how für Anwender"]] + p.feature_table, [1800, 2800, 2500, 2260]),
                self.para("Täglicher Arbeitsablauf", style="Heading1"),
                self.table([["Schritt", "Aktion im Alltag", "Entscheidung / Ergebnis"]] + p.workflow, [900, 4300, 4160]),
                self.para("Mindmap der Phase", style="Heading1"),
                self.mindmap(),
                self.para("Geschäftliche Kennzahlen", style="Heading1"),
                self.kpi_graph(),
                self.page_break(),
                self.para("Screenshots mit fachlicher Erklärung", style="Heading1"),
            ]
        )

        for idx, shot in enumerate(p.screenshots, start=1):
            parts.append(self.para(shot.title, style="Heading2"))
            parts.append(self.image(shot, idx))
            parts.append(self.para(shot.explanation, style="Caption", align="center"))

        parts.extend(
            [
                self.para("Geschäftsregeln, Sonderfälle und Fehlerverhalten", style="Heading1"),
                self.para(
                    "Diese Punkte sind für den Fachbereich wichtig, weil echte Arbeit nicht immer dem Idealfall folgt. Die Anwendung muss deshalb verständlich reagieren, wenn Daten fehlen, Rollen nicht passen oder Entscheidungen offen sind.",
                    style="BodyText",
                ),
                self.table([["Situation", "Business-Regel", "Was der Anwender tun soll"]] + p.business_rules, [2600, 3660, 3100]),
                self.para("Schulung: was Anwender wissen müssen", style="Heading1"),
            ]
        )
        for item in p.training_points:
            parts.append(self.bullet(item))

        parts.extend(
            [
                self.para("Offene fachliche Entscheidungen", style="Heading1"),
                self.table([["Thema", "Entscheidung durch Management/Fachbereich", "Warum relevant?"]] + p.business_decisions, [2500, 4100, 2760]),
                self.para("Verbindung zu den nächsten Phasen", style="Heading1"),
                self.table([["Nächste Phase", "Warum diese Phase davon abhängt", "Empfehlung"]] + p.next_phase_links, [2200, 4200, 2960]),
                self.para("Jira-Hinweis", style="Heading1"),
                self.para(
                    "Dieses Dokument ist als fachliche Anlage für das jeweilige Jira-Phasen-Ticket gedacht. Im Ticket sollte es als aktuelle Business-Dokumentation referenziert werden, damit Management, Umsetzung und Abnahme dieselbe fachliche Grundlage verwenden.",
                    style="BodyText",
                ),
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
        for image in self.phase.screenshots:
            if not image.source.exists():
                raise FileNotFoundError(image.source)
        path = OUT_DIR / self.phase.filename
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as docx:
            files = {
                "[Content_Types].xml": content_types(self.phase.screenshots),
                "_rels/.rels": package_rels(),
                "word/document.xml": self.body(),
                "word/_rels/document.xml.rels": document_rels(self.phase.screenshots),
                "word/styles.xml": styles_xml(),
                "word/settings.xml": settings_xml(),
                "word/numbering.xml": numbering_xml(),
                "docProps/core.xml": core_props(self.phase),
                "docProps/app.xml": app_props(),
            }
            for name, content in files.items():
                docx.writestr(name, content)
            for image in self.phase.screenshots:
                docx.write(image.source, f"word/media/{image.file}")
        return path


def content_types(images: list[ImageItem]) -> str:
    image_overrides = "".join(f'<Override PartName="/word/media/{esc(i.file)}" ContentType="image/png"/>' for i in images)
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
    for idx, image in enumerate(images, start=1):
        rels.append(f'<Relationship Id="rIdImg{idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{esc(image.file)}"/>')
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{''.join(rels)}</Relationships>
"""


def styles_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="1F2937"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="Body Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/><w:color w:val="344054"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:qFormat/><w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="0B2545"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="2E74B5"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="2E74B5"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="80" w:after="120"/></w:pPr><w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="667085"/></w:rPr></w:style>
</w:styles>
"""


def numbering_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>
"""


def settings_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/></w:settings>"""


def core_props(phase: PhaseDoc) -> str:
    now = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>{esc(phase.phase)}: {esc(phase.title)}</dc:title><dc:creator>Codex</dc:creator><cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>
"""


def app_props() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Codex OOXML Builder</Application><Company>Wamocon</Company></Properties>"""


def phases() -> list[PhaseDoc]:
    return [
        PhaseDoc(
            phase="Phase 2",
            title="UX/UI und rollenbasierte Navigation",
            filename="phase-02-ux-ui-rollennavigation.docx",
            audience="Geschäftsführung, Objektmanagement, Buchhaltung, Technik, Support",
            business_goal="Alle Rollen sollen die wichtigsten Informationen ohne Schulung in einer ruhigen, schnellen Oberfläche finden.",
            management_summary="Phase 2 übersetzt die Plattform in eine verständliche Arbeitsoberfläche. Das Dashboard zeigt Risiken, Aufgaben, Kennzahlen, Phasenstatus, visuelle Objektlage und AI-Hinweise in einer Sprache, die operative Teams verstehen. Dadurch entsteht ein gemeinsamer Startpunkt für tägliche Entscheidungen.",
            why_it_matters=[
                "Management muss nicht in Tabellen suchen, sondern sieht Risiken und Prioritäten auf einen Blick.",
                "Buchhaltung, Technik und Support arbeiten aus demselben System, sehen aber nur für ihre Rolle relevante Bereiche.",
                "Die mobile Ansicht erlaubt schnelle Kontrolle unterwegs, ohne eine separate Mobile-App einzuführen.",
                "Statusfarben, Karten und kurze Texte reduzieren Rückfragen und machen den Betrieb leichter erklärbar.",
            ],
            feature_table=[
                ["Command Center", "Startseite mit Warnungen, Zahlen, Aufgaben, Phasenstatus und AI-Hinweisen.", "Ein gemeinsamer Überblick für Management und Teamleiter.", "Jeden Morgen zuerst Dashboard öffnen und kritische Karten prüfen."],
                ["Rollenmenü", "Linke Navigation mit Modulen wie Daire Matrisi, Sakinler, Servis, Finanzen und Rollen.", "Teams verlieren weniger Zeit, weil sie nicht durch irrelevante Bereiche navigieren.", "Rollen müssen fachlich sauber vergeben werden; falsche Rolle bedeutet falsche Sicht."],
                ["Status- und Warnkarten", "Rote, orange und neutrale Hinweise für Risiko, Zugriff, SLA und Tagesarbeit.", "Risiken werden sichtbar, bevor sie eskalieren.", "Rot bedeutet handeln, orange bedeutet prüfen, neutral bedeutet beobachten."],
                ["3D-Site-Simulation", "Visuelle Darstellung von Blöcken, Risiko, Zugriff und Servicebelastung.", "Komplexe Objektlage wird schneller verstanden als in Rohdaten.", "Die Simulation ist eine Managementhilfe, nicht die alleinige Entscheidungsquelle."],
                ["AI-Operations-Hinweise", "Kurze priorisierte Vorschläge für Einnahmen, SLA, Check-out und Zugriff.", "Das Team erkennt, welche Aufgabe zuerst sinnvoll ist.", "AI empfiehlt; sensible Entscheidungen bleiben beim Menschen."],
            ],
            workflow=[
                ["1", "Dashboard öffnen und Warnkarten lesen.", "Management erkennt sofort, ob Finanz-, Zugriff- oder Servicethemen kritisch sind."],
                ["2", "Phasen- und Modulkarte prüfen.", "Das Team versteht, welche Arbeitsbereiche verfügbar sind."],
                ["3", "Simulation und Kennzahlen vergleichen.", "Block- oder Risikothemen werden schneller priorisiert."],
                ["4", "Über das Rollenmenü in den Detailbereich wechseln.", "Die Fachabteilung arbeitet direkt in ihrem Modul weiter."],
                ["5", "AI-Hinweis prüfen und Aufgabe bewusst bestätigen.", "AI unterstützt Entscheidungen, ersetzt aber keine Verantwortung."],
            ],
            mindmap=[
                ["Rollen", "Warnungen", "Mobile Nutzung"],
                ["Navigation", "Phase 2\nArbeitsoberfläche", "AI-Hinweise"],
                ["Kennzahlen", "Simulation", "Tagessteuerung"],
            ],
            kpis=[
                ["4/4 sichtbare Phasen", "Alle aktuell fertiggestellten Bereiche sind für Stakeholder erkennbar.", "Transparenz über Fortschritt und Nutzung."],
                ["768+ verwaltete Einheiten", "Dashboard bildet den großen Objektumfang ab.", "Die Oberfläche ist für Portfolio-Betrieb ausgelegt."],
                ["Mobile Ansicht vorhanden", "Dashboard ist auf kleiner Breite lesbar.", "Führungskräfte können unterwegs prüfen."],
            ],
            business_rules=[
                ["Benutzer hat falsche Rolle", "Die sichtbaren Menüpunkte passen dann nicht zur Aufgabe.", "Rolle durch Admin prüfen lassen, nicht Workaround über fremden Login nutzen."],
                ["AI-Hinweis wirkt kritisch", "AI ist Entscheidungsvorbereitung, keine automatische Ausführung.", "Fachliche Prüfung durchführen und Entscheidung dokumentieren."],
                ["Zu viele Warnungen", "Zuerst rote Warnungen, danach orange Hinweise bearbeiten.", "Tagesprioritäten aus den Warnkarten ableiten."],
                ["Mobile Bildschirmbreite", "Inhalte stapeln sich untereinander.", "Nicht zoomen müssen; stattdessen nach unten scrollen."],
            ],
            screenshots=[
                ImageItem("phase-02-dashboard-command-center.png", "Screenshot 1: Management Command Center", "Startansicht mit Warnkarten, Phasenübersicht, Kennzahlen und Rollenmenü."),
                ImageItem("phase-02-simulation-ai.png", "Screenshot 2: Simulation und AI-Hinweise", "Visuelle Objektlage mit AI-Prioritäten für Betrieb, Finanzen und Service."),
                ImageItem("phase-02-mobile-dashboard.png", "Screenshot 3: Mobile Management-Ansicht", "Die wichtigsten Karten bleiben auch auf schmalem Bildschirm verständlich."),
            ],
            training_points=[
                "Anwender sollen zuerst die Warnkarten lesen und erst danach in Detailtabellen wechseln.",
                "Die AI-Karten sind Empfehlungen. Die Verantwortung bleibt bei der zuständigen Rolle.",
                "Rollenmenü und Statusfarben müssen in der Einführung kurz erklärt werden.",
                "Für Management reicht die Dashboard-Ansicht häufig als täglicher Startpunkt.",
            ],
            business_decisions=[
                ["Statussprache", "Welche Begriffe gelten final für rot, orange, grün und neutral?", "Einheitliche Sprache reduziert Missverständnisse."],
                ["Management-KPIs", "Welche 5 Kennzahlen sollen dauerhaft ganz oben stehen?", "Zu viele Kennzahlen machen die Oberfläche langsamer verständlich."],
                ["AI-Freigabe", "Welche AI-Hinweise dürfen nur nach menschlicher Bestätigung umgesetzt werden?", "Verantwortung und Vertrauen bleiben klar."],
            ],
            next_phase_links=[
                ["Phase 3", "Rollen und Rechte steuern, was im Menü sichtbar ist.", "Rollenmodell finalisieren."],
                ["Phase 4", "Dashboard-Kennzahlen hängen an sauberen Objekt- und Einheitendaten.", "Import- und Datenregeln festlegen."],
                ["Phase 6+", "Service- und Finanzprozesse nutzen das Dashboard als Steuerungszentrale.", "Dashboard als tägliches Operating-Modell nutzen."],
            ],
        ),
        PhaseDoc(
            phase="Phase 3",
            title="Plattform, Auth, RBAC und Audit",
            filename="phase-03-plattform-auth-rbac-audit.docx",
            audience="Geschäftsführung, Datenschutz, Security, Admins, Fachbereichsleitung",
            business_goal="Sensible Informationen und Aktionen sollen rollenbasiert, nachvollziehbar und verantwortungsvoll gesteuert werden.",
            management_summary="Phase 3 beschreibt die Kontrollschicht der Plattform. Sie macht sichtbar, welche Rollen Finanzfreigaben, Zugriffssperren, Nutzerverwaltung oder Datenexport ausführen dürfen. Zusätzlich zeigt sie Audit-Ereignisse, damit wichtige Entscheidungen nicht im Chat oder in E-Mails verschwinden.",
            why_it_matters=[
                "Finanzdaten, Bewohnerdaten und Zugriffsdaten dürfen nicht für jede Person sichtbar sein.",
                "Management braucht Nachvollziehbarkeit: wer hat wann welche sensible Aktion ausgelöst?",
                "AI-Funktionen brauchen klare Grenzen, damit Empfehlungen nicht unkontrolliert zu Entscheidungen werden.",
                "Ein auditierbares System wirkt professioneller gegenüber Kunden, Eigentümern und internen Prüfern.",
            ],
            feature_table=[
                ["Plattformkontrollen", "Kontrollkarten für Auth, RBAC, Audit, Daten und AI.", "Management sieht, welche Sicherheitsbereiche aktiv oder in Prüfung sind.", "Kontrollen regelmäßig im Management-Review prüfen."],
                ["Rollenmatrix", "Übersicht über Finanzfreigabe, Zugriffssperre, Nutzerverwaltung und Export.", "Rechte sind transparent und nicht nur technisch versteckt.", "Rechte immer nach Aufgabe vergeben, nicht nach Hierarchiegefühl."],
                ["Audit-Ereignisse", "Tabelle mit Akteur, Modul, Risiko und Aktion.", "Sensible Vorgänge sind später nachvollziehbar.", "High-Risk-Ereignisse aktiv im Wochenreview ansehen."],
                ["AI-Governance", "AI ist als Empfehlungssystem mit menschlicher Kontrolle beschrieben.", "Verhindert unklare Verantwortung.", "AI darf Finanz- oder Zugriffsthemen nicht still automatisch entscheiden."],
            ],
            workflow=[
                ["1", "Admin oder Manager öffnet Platform & Audit Center.", "Kontrollstatus wird sichtbar."],
                ["2", "Rollenmatrix prüfen.", "Es ist klar, welche Rolle welche sensible Aktion ausführen darf."],
                ["3", "Audit-Tabelle prüfen.", "Risikoereignisse werden nachvollzogen."],
                ["4", "Unklare Rechte oder Risiken besprechen.", "Management entscheidet, ob Rechte angepasst werden."],
                ["5", "Fachliche Entscheidung dokumentieren.", "Kontrollmodell bleibt sauber und prüfbar."],
            ],
            mindmap=[
                ["Login", "Rollen", "Datenexport"],
                ["Audit", "Phase 3\nKontrollschicht", "AI-Grenzen"],
                ["Finanzen", "Zugriff", "Verantwortung"],
            ],
            kpis=[
                ["5 Kontrollbereiche", "Auth, RBAC, Audit, Data und AI sind fachlich sichtbar.", "Kontrolle wird Teil der normalen Führung."],
                ["Rollenmatrix vorhanden", "Finanz, Zugriff, Nutzer und Export sind getrennt.", "Keine Vermischung sensibler Rechte."],
                ["Audit-Ereignisse sichtbar", "Wichtige Aktionen erscheinen in einer Prüfansicht.", "Nachvollziehbarkeit für Streitfälle und Reviews."],
            ],
            business_rules=[
                ["Rolle darf Finanzdaten nicht sehen", "Finanzrechte müssen explizit vergeben sein.", "Berechtigung über Management/Admin prüfen lassen."],
                ["Zugriffssperre wird gesetzt", "Grund und Rolle müssen nachvollziehbar bleiben.", "Audit-Ereignis im Review prüfen."],
                ["Datenexport wird angefordert", "Exportrecht ist getrennt von normaler Ansicht.", "Nur berechtigte Rollen dürfen exportieren."],
                ["AI erzeugt Vorschlag", "Vorschlag braucht menschliche Bewertung.", "Bei Finanz/Zugriff nie blind übernehmen."],
            ],
            screenshots=[
                ImageItem("phase-03-controls-overview.png", "Screenshot 1: Plattformkontrollen", "Kontrollkarten zeigen Auth, RBAC, Audit, Daten und AI-Governance."),
                ImageItem("phase-03-rbac-audit.png", "Screenshot 2: RBAC und Audit", "Rollenmatrix und Audit-Ereignisse zeigen, wie sensible Aktionen nachvollziehbar werden."),
            ],
            training_points=[
                "Admins müssen den Unterschied zwischen Sichtrecht, Bearbeitungsrecht und Exportrecht erklären.",
                "Fachbereiche sollen Audit-Ereignisse als Schutz verstehen, nicht als Kontrolle einzelner Personen.",
                "AI-Grenzen müssen klar kommuniziert werden: Empfehlung ja, stille Entscheidung nein.",
                "Rollenänderungen sollten nie informell erfolgen, sondern bewusst und nachvollziehbar.",
            ],
            business_decisions=[
                ["Rollenmodell", "Welche finalen Rollen braucht der Kunde wirklich?", "Zu viele Rollen erhöhen Pflegeaufwand; zu wenige Rollen erhöhen Risiko."],
                ["Audit-Aufbewahrung", "Wie lange sollen sensible Ereignisse sichtbar bleiben?", "Relevant für Streitfälle, Datenschutz und interne Prüfung."],
                ["Exportfreigabe", "Wer darf Personen- und Finanzdaten exportieren?", "Exporte sind besonders sensibel."],
            ],
            next_phase_links=[
                ["Phase 5", "Benutzer- und Rollenverwaltung nutzt diese Rechte.", "Rollenmatrix fachlich freigeben."],
                ["Phase 7", "Zahlungen und Schulden brauchen starke Finanzrechte.", "Freigabeprozess definieren."],
                ["Phase 9", "Personalaufgaben und SLA brauchen nachvollziehbare Historie.", "Audit-Regeln ausweiten."],
            ],
        ),
        PhaseDoc(
            phase="Phase 4",
            title="Site-, Block-, Etagen-, Wohnungs- und Importmodell",
            filename="phase-04-site-import-datenmodell.docx",
            audience="Operations, Objektmanagement, Datenverantwortliche, Buchhaltung",
            business_goal="Objekt- und Wohnungsdaten sollen zuverlässig, suchbar und vor dem operativen Einsatz kontrolliert sein.",
            management_summary="Phase 4 verwandelt eine große Objektliste in eine steuerbare Betriebsstruktur. Blöcke, Einheiten, Status, Schulden, Zugriff und Importqualität werden so dargestellt, dass Operations und Management Datenfehler früh sehen und nicht erst im Tagesbetrieb bemerken.",
            why_it_matters=[
                "Bei hunderten Einheiten führen kleine Datenfehler schnell zu falschen Rechnungen, falschem Zugang oder falscher Kommunikation.",
                "Der Importbereich schafft Vertrauen, weil Warnungen vor der Übernahme sichtbar werden.",
                "Die visuelle Matrix hilft Teams, Bestand, Blockierung, Leerstand und Wartung schneller zu verstehen.",
                "Suche nach Einheit oder Bewohner spart Zeit im operativen Alltag.",
            ],
            feature_table=[
                ["Blockübersicht", "Karten je Block mit Belegung, Leerstand, Wartung und Schuldenlast.", "Management erkennt schnell problematische Blöcke.", "Blockwerte sind Steuerungswerte, keine endgültige Buchhaltung."],
                ["Wohnungsmatrix", "Farbliche Darstellung von Einheiten nach Status.", "Teams sehen Muster und Ausnahmen schnell.", "Farben müssen fachlich trainiert werden."],
                ["Import-Qualitätstor", "Gültige Zeilen, Warnungen und abgelehnte Zeilen vor Datenübernahme.", "Verhindert Blindimport und schlechte Stammdaten.", "Warnung bedeutet prüfen, nicht ignorieren."],
                ["Einheitensuche", "Direkte Suche nach Einheit wie A-0101.", "Support und Operations finden Details schneller.", "Suche nutzt aktuelle Datenbasis."],
                ["Datenmodell-Hinweise", "Erklärung, welche Daten miteinander verbunden sind.", "Fachbereiche verstehen Abhängigkeiten.", "Wohnung, Person, Schuld und Zugriff müssen zusammenpassen."],
            ],
            workflow=[
                ["1", "Daire Matrisi öffnen.", "Der Gesamtzustand der Anlage wird sichtbar."],
                ["2", "Blockübersicht lesen.", "Auffällige Blöcke werden priorisiert."],
                ["3", "Import-Qualität prüfen.", "Daten werden nicht blind übernommen."],
                ["4", "Warnungen fachlich klären.", "Operations entscheidet, welche Daten korrigiert werden."],
                ["5", "Einheit suchen und Details prüfen.", "Einzelfälle werden schnell bearbeitet."],
            ],
            mindmap=[
                ["Blöcke", "Etagen", "Einheiten"],
                ["Import", "Phase 4\nStammdaten", "Qualitätstor"],
                ["Schulden", "Zugriff", "Service"],
            ],
            kpis=[
                ["2.156 Importzeilen", "Importumfang ist sichtbar.", "Fachbereich versteht Datenmenge."],
                ["2.124 gültige Zeilen", "Großer Teil ist direkt nutzbar.", "Gute Grundlage, aber nicht blind übernehmen."],
                ["32 Warnungen", "Fachliche Nacharbeit ist nötig.", "Warnungen vor Go-live klären."],
                ["0 abgelehnte Zeilen", "Kein harter Blocker im aktuellen Muster.", "Import kann vorbereitet werden."],
            ],
            business_rules=[
                ["Fehlende Telefonnummer", "Warnung statt harter Stopp.", "Kontakt später nachpflegen, aber Risiko markieren."],
                ["Unklare Identität", "Datensatz bleibt prüfpflichtig.", "Keine kritische Aktion ohne Klärung."],
                ["Einheit blockiert", "Zugriff und Service können eingeschränkt sein.", "Grund prüfen, bevor Freigabe erfolgt."],
                ["Doppelte Einheit", "Muss vor Übernahme bereinigt werden.", "Dubletten führen zu falscher Rechnung oder Kommunikation."],
            ],
            screenshots=[
                ImageItem("phase-04-unit-matrix.png", "Screenshot 1: Block- und Wohnungsmatrix", "Visuelle Übersicht über Einheiten und deren Status."),
                ImageItem("phase-04-import-quality-gate.png", "Screenshot 2: Import-Qualitätstor", "Importstatus mit gültigen Zeilen, Warnungen und abgelehnten Zeilen."),
                ImageItem("phase-04-unit-search.png", "Screenshot 3: Einheitensuche", "Suche nach A-0101 zeigt, wie Einzelfälle schnell gefunden werden."),
            ],
            training_points=[
                "Operations muss verstehen, dass Importwarnungen fachliche Entscheidungen erfordern.",
                "Die Wohnungsmatrix ist ein Überblick; Details werden über Suche und Tabellen geprüft.",
                "Datenpflege ist kein einmaliges Projekt, sondern Teil des laufenden Betriebs.",
                "Jede Datenänderung kann Auswirkungen auf Finanzen, Zugriff und Service haben.",
            ],
            business_decisions=[
                ["Importfreigabe", "Wer darf einen geprüften Import final übernehmen?", "Verhindert unkontrollierte Datenänderungen."],
                ["Warnlogik", "Welche Warnungen stoppen den Prozess, welche sind nur Hinweise?", "Fachliche Priorisierung ist nötig."],
                ["Datenverantwortung", "Wer besitzt die Qualität von Wohnungs- und Personendaten?", "Ohne Verantwortlichen veralten Daten schnell."],
            ],
            next_phase_links=[
                ["Phase 5", "Personen und Rollen müssen mit Einheiten verbunden werden.", "Datenbeziehungen finalisieren."],
                ["Phase 7", "Finanzprozesse brauchen korrekte Einheiten und Personen.", "Dubletten vermeiden."],
                ["Phase 10", "Einzug, Auszug und Zugang hängen von sauberem Einheitenstatus ab.", "Statusregeln definieren."],
            ],
        ),
        PhaseDoc(
            phase="Phase 5",
            title="Benutzer, Eigentümer, Mieter, Gäste, Personal und Rollen",
            filename="phase-05-benutzer-rollen-personal.docx",
            audience="Operations, HR, Support, Security, Buchhaltung, Management",
            business_goal="Alle relevanten Personen sollen mit Rolle, Verantwortung, Kontakt, Arbeitslast und Berechtigung verständlich verwaltet werden.",
            management_summary="Phase 5 macht Personen und Verantwortlichkeiten sichtbar. Das System zeigt interne Mitarbeiter, Rollen, Aufgabenlast, Freigabelimits, Bewohnergruppen und Rechte. Damit wird klar, wer handeln darf, wer nur sehen darf und wo Verantwortung liegt.",
            why_it_matters=[
                "Ohne klare Rollen entstehen falsche Freigaben, Doppelarbeit und unnötige Rückfragen.",
                "Support und Operations brauchen schnelle Personensuche und klare Kontaktinformationen.",
                "Management sieht Arbeitslast und Freigabegrenzen statt nur Namen.",
                "Rollenrechte reduzieren Datenschutz- und Finanzrisiken.",
            ],
            feature_table=[
                ["Personalkarten", "Karten mit Rolle, Team, Telefonnummer, Aufgabenlast und Limit.", "Teamleitung sieht Zuständigkeit und Auslastung.", "Limit bedeutet Freigaberahmen, nicht automatisch Zahlung."],
                ["Mitarbeitersuche", "Suche nach Namen oder Rolle, z. B. Merve Muhasebe.", "Schneller Zugriff im Tagesbetrieb.", "Suchergebnis immer mit Rolle prüfen."],
                ["Rollenmatrix", "Rechte für Finanz, Zugriff, Nutzerverwaltung und Export.", "Klare Verantwortung und Datenschutzsteuerung.", "Rechte werden getrennt vergeben."],
                ["Bewohnergruppen", "Eigentümer, Mieter, Gäste und Risikozahlen.", "Management erkennt Struktur und mögliche Betreuungsrisiken.", "Bewohnerstatus muss fachlich aktuell gehalten werden."],
            ],
            workflow=[
                ["1", "Benutzer & Rollen öffnen.", "Team, Bewohnergruppen und aktive Aufgaben werden sichtbar."],
                ["2", "Personalkarten prüfen.", "Zuständige Personen und Freigabelimits sind klar."],
                ["3", "Mitarbeiter oder Rolle suchen.", "Der konkrete Ansprechpartner wird gefunden."],
                ["4", "Rollenmatrix lesen.", "Management sieht, welche Rolle welche Aktion darf."],
                ["5", "Unklare Rechte entscheiden.", "Admin passt Rolle nach fachlicher Freigabe an."],
            ],
            mindmap=[
                ["Personal", "Eigentümer", "Mieter"],
                ["Rollen", "Phase 5\nPersonenverwaltung", "Berechtigungen"],
                ["Aufgabenlast", "Finanzlimit", "Exportrecht"],
            ],
            kpis=[
                ["5 Personalprofile", "Kernrollen sind sichtbar.", "Betrieb kann Verantwortlichkeiten zuordnen."],
                ["119 Bewohnerdatensätze", "Personenbasis ist modelliert.", "Support und Operations haben eine zentrale Sicht."],
                ["64 aktive Aufgaben", "Arbeitslast ist sichtbar.", "Teamleitung kann Prioritäten setzen."],
                ["4 Finanzfreigeber", "Freigabeverantwortung ist begrenzt.", "Risiko wird reduziert."],
            ],
            business_rules=[
                ["Mitarbeiter in Einarbeitung", "Training-Status bedeutet begrenzte Verantwortung.", "Keine kritischen Rechte ohne Freigabe vergeben."],
                ["Finanzrecht fehlt", "Person darf Finanzaktion nicht ausführen.", "Anfrage an Rolle mit Finanzfreigabe geben."],
                ["Exportrecht fehlt", "Datenexport darf nicht erfolgen.", "Export nur über berechtigte Rolle anfordern."],
                ["Kontakt fehlt oder ist falsch", "Datensatz muss gepflegt werden.", "Support darf nicht auf alte Kontaktdaten vertrauen."],
            ],
            screenshots=[
                ImageItem("phase-05-staff-overview.png", "Screenshot 1: Personal- und Rollenübersicht", "Personalkarten zeigen Rolle, Team, Aufgaben und Limit."),
                ImageItem("phase-05-staff-search.png", "Screenshot 2: Mitarbeitersuche", "Suche nach Merve zeigt die Buchhaltungsrolle und relevante Detaildaten."),
                ImageItem("phase-05-role-matrix.png", "Screenshot 3: Rollenmatrix", "Die Matrix zeigt, welche Rollen Finanz, Zugriff, Nutzerverwaltung und Export dürfen."),
            ],
            training_points=[
                "Nutzer sollen immer Rolle und Berechtigung prüfen, nicht nur den Namen.",
                "Finanz-, Export- und Zugriffrechte sind bewusst getrennt.",
                "Einarbeitungspersonen sollen nicht automatisch volle Rechte erhalten.",
                "Personendaten müssen regelmäßig gepflegt werden, weil sie mehrere Prozesse beeinflussen.",
            ],
            business_decisions=[
                ["Rollenanzahl", "Welche Rollen braucht der Kunde final?", "Zu viele Rollen erhöhen Pflegeaufwand."],
                ["Freigabelimits", "Welche Betragsgrenzen gelten je Rolle?", "Finanzkontrolle braucht klare Schwellen."],
                ["Exportregeln", "Wer darf personenbezogene Daten exportieren?", "Datenschutz und Compliance hängen daran."],
            ],
            next_phase_links=[
                ["Phase 6/7", "Finanzprozesse brauchen korrekte Freigeber und Limits.", "Freigabelogik bestätigen."],
                ["Phase 8/9", "Service und Aufgaben hängen an Personalrollen.", "Teamzuständigkeiten finalisieren."],
                ["Phase 10", "Zugang und Ein-/Auszug brauchen Bewohner- und Rollenstatus.", "Personenbeziehungen sauber halten."],
            ],
        ),
    ]


def validate(path: pathlib.Path) -> None:
    forbidden = ["E2E", "TypeScript", "lint", "Browser-Audit", "QA-geprüft", "HTTP 200", "API liefert"]
    with zipfile.ZipFile(path) as z:
        required = {"[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/_rels/document.xml.rels", "word/styles.xml", "word/settings.xml", "word/numbering.xml"}
        missing = required - set(z.namelist())
        if missing:
            raise RuntimeError(f"{path.name}: missing {sorted(missing)}")
        text = " ".join(re.findall(r"<w:t>(.*?)</w:t>", z.read("word/document.xml").decode("utf-8")))
        media = [name for name in z.namelist() if name.startswith("word/media/")]
        if len(media) < 2 and "phase-03" not in path.name:
            raise RuntimeError(f"{path.name}: expected multiple screenshots")
        if not any(ch in text for ch in "äöüÄÖÜß"):
            raise RuntimeError(f"{path.name}: German umlauts missing")
        for expected in ["Management Summary", "Funktionsübersicht", "Täglicher Arbeitsablauf", "Mindmap", "Geschäftsregeln", "Schulung"]:
            if expected not in text:
                raise RuntimeError(f"{path.name}: missing section {expected}")
        for word in forbidden:
            if word in text:
                raise RuntimeError(f"{path.name}: forbidden implementation wording found: {word}")


def main() -> None:
    outputs = []
    for phase in phases():
        out = BusinessDocx(phase).write()
        validate(out)
        outputs.append(out)
    print("\n".join(str(out) for out in outputs))


if __name__ == "__main__":
    main()
