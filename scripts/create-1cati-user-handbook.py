# -*- coding: utf-8 -*-
"""Create the German 1Cati user handbook as a DOCX file.

The script writes a minimal Open XML Word document without external Python
packages. It embeds screenshots from docs/user-handbook/assets and keeps the
visual style intentionally simple: Arial Narrow, black text, grey tables.
"""

from __future__ import annotations

import html
import os
import sys
import struct
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "user-handbook"
ASSET_DIR = OUT_DIR / "assets"
DEFAULT_DOCX_PATH = OUT_DIR / "1Cati-Benutzerhandbuch-DE.docx"

JIRA_BASE = "https://wamocon.atlassian.net/browse"
PLATFORM_URL = "https://cati-blond.vercel.app/tr"
API_SPEC_URL = "https://cati-blond.vercel.app/api/openapi"

EMU_PER_INCH = 914400
TABLE_WIDTH_DXA = 9360


def esc(value: object) -> str:
    return html.escape(str(value), quote=False)


def attr(value: object) -> str:
    return html.escape(str(value), quote=True)


def check_text(text: str) -> None:
    forbidden = ["\u2014"]
    for char in forbidden:
        if char in text:
            raise ValueError(f"Forbidden character found: {char!r}")


def png_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not a PNG file: {path}")
    return struct.unpack(">II", data[16:24])


def jpg_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:2] != b"\xff\xd8":
        raise ValueError(f"Not a JPEG file: {path}")
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        i += 2
        if marker in (0xD8, 0xD9):
            continue
        length = struct.unpack(">H", data[i : i + 2])[0]
        if marker in range(0xC0, 0xC4):
            height = struct.unpack(">H", data[i + 3 : i + 5])[0]
            width = struct.unpack(">H", data[i + 5 : i + 7])[0]
            return width, height
        i += length
    raise ValueError(f"Cannot read JPEG dimensions: {path}")


def image_size(path: Path) -> tuple[int, int]:
    suffix = path.suffix.lower()
    if suffix == ".png":
        return png_size(path)
    if suffix in {".jpg", ".jpeg"}:
        return jpg_size(path)
    raise ValueError(f"Unsupported image format: {path}")


class DocxBuilder:
    def __init__(self) -> None:
        self.body: list[str] = []
        self.rels: list[str] = [
            '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
            '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
            '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
        ]
        self.media: list[tuple[str, Path]] = []
        self.next_rel_id = 10
        self.next_docpr_id = 1

    def rel(self, rel_type: str, target: str, external: bool = False) -> str:
        rid = f"rId{self.next_rel_id}"
        self.next_rel_id += 1
        mode = ' TargetMode="External"' if external else ""
        self.rels.append(
            f'<Relationship Id="{rid}" Type="{rel_type}" Target="{attr(target)}"{mode}/>'
        )
        return rid

    def paragraph_xml(
        self,
        text: str = "",
        *,
        style: str | None = None,
        bold: bool = False,
        italic: bool = False,
        color: str = "111827",
        size: int | None = None,
        align: str | None = None,
        num_id: int | None = None,
        ilvl: int = 0,
        keep_next: bool = False,
        spacing_after: int | None = None,
        hyperlink: str | None = None,
    ) -> str:
        check_text(text)
        ppr: list[str] = []
        if style:
            ppr.append(f'<w:pStyle w:val="{attr(style)}"/>')
        if keep_next:
            ppr.append("<w:keepNext/>")
        if align:
            ppr.append(f'<w:jc w:val="{attr(align)}"/>')
        if spacing_after is not None:
            ppr.append(f'<w:spacing w:after="{spacing_after}"/>')
        if num_id is not None:
            ppr.append(
                f'<w:numPr><w:ilvl w:val="{ilvl}"/><w:numId w:val="{num_id}"/></w:numPr>'
            )
        ppr_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>" if ppr else ""
        rpr: list[str] = ['<w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/>']
        if bold:
            rpr.append("<w:b/>")
        if italic:
            rpr.append("<w:i/>")
        if color:
            rpr.append(f'<w:color w:val="{color}"/>')
        if size:
            rpr.append(f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>')
        rpr_xml = f"<w:rPr>{''.join(rpr)}</w:rPr>"
        run_xml = f'<w:r>{rpr_xml}<w:t xml:space="preserve">{esc(text)}</w:t></w:r>'
        if hyperlink:
            rid = self.rel(
                "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
                hyperlink,
                external=True,
            )
            run_xml = (
                f'<w:hyperlink r:id="{rid}" w:history="1">'
                f'<w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow"/>'
                f'<w:color w:val="0563C1"/><w:u w:val="single"/><w:sz w:val="{size or 20}"/></w:rPr>'
                f'<w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:hyperlink>'
            )
        return f"<w:p>{ppr_xml}{run_xml}</w:p>"

    def p(self, text: str = "", **kwargs: object) -> None:
        self.body.append(self.paragraph_xml(text, **kwargs))

    def heading(self, level: int, text: str) -> None:
        style = "Heading1" if level == 1 else "Heading2" if level == 2 else "Heading3"
        self.p(text, style=style, bold=True, color="111827", keep_next=True)

    def bullet(self, text: str, level: int = 0) -> None:
        self.p(text, num_id=1, ilvl=level, spacing_after=40)

    def numbered(self, text: str, level: int = 0) -> None:
        self.p(text, num_id=2, ilvl=level, spacing_after=40)

    def page_break(self) -> None:
        self.body.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')

    def image(self, path: Path, caption: str, *, max_width_in: float = 6.8) -> None:
        if not path.exists():
            self.p(f"Bild fehlt: {path.name}", italic=True, color="6B7280")
            return
        width_px, height_px = image_size(path)
        display_width = max_width_in
        display_height = display_width * height_px / width_px
        if display_height > 5.0:
            display_height = 5.0
            display_width = display_height * width_px / height_px
        cx = int(display_width * EMU_PER_INCH)
        cy = int(display_height * EMU_PER_INCH)
        media_name = f"image{len(self.media) + 1}{path.suffix.lower()}"
        self.media.append((media_name, path))
        rid = self.rel(
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
            f"media/{media_name}",
        )
        docpr_id = self.next_docpr_id
        self.next_docpr_id += 1
        self.body.append(
            f"""
<w:p>
  <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="80"/></w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="{cx}" cy="{cy}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="{docpr_id}" name="{attr(path.stem)}"/>
        <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr>
                <pic:cNvPr id="{docpr_id}" name="{attr(path.name)}"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="{rid}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>
""".strip()
        )
        self.p(caption, style="Caption", italic=True, color="6B7280", align="center", size=17)

    def table(self, headers: list[str], rows: list[list[str]], widths: list[int] | None = None) -> None:
        weights = widths or [1] * len(headers)
        total_weight = max(1, sum(weights))
        column_widths = [max(720, int(TABLE_WIDTH_DXA * weight / total_weight)) for weight in weights]
        rounding_delta = TABLE_WIDTH_DXA - sum(column_widths)
        column_widths[-1] += rounding_delta
        grid = "".join(f'<w:gridCol w:w="{width}"/>' for width in column_widths)
        tbl_rows: list[str] = []
        for row_idx, row in enumerate([headers] + rows):
            cells: list[str] = []
            tr_pr = "<w:trPr><w:tblHeader/></w:trPr>" if row_idx == 0 else ""
            for idx, cell in enumerate(row):
                shade = '<w:shd w:fill="E5E7EB"/>' if row_idx == 0 else ""
                bold = row_idx == 0
                tcw = column_widths[idx] if idx < len(column_widths) else column_widths[-1]
                paragraphs = []
                for line in str(cell).split("\n"):
                    paragraphs.append(
                        self.paragraph_xml(
                            line,
                            bold=bold,
                            size=17,
                            color="111827" if row_idx == 0 else "374151",
                            spacing_after=0,
                        )
                    )
                cells.append(
                    f"""
<w:tc>
  <w:tcPr><w:tcW w:w="{tcw}" w:type="dxa"/>{shade}<w:vAlign w:val="center"/><w:tcMar><w:top w:w="110" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
  {''.join(paragraphs)}
</w:tc>
""".strip()
                )
            tbl_rows.append(f"<w:tr>{tr_pr}{''.join(cells)}</w:tr>")
        self.body.append(
            f"""
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="{TABLE_WIDTH_DXA}" w:type="dxa"/>
    <w:tblInd w:w="0" w:type="dxa"/>
    <w:tblLayout w:type="fixed"/>
    <w:tblCellMar><w:top w:w="110" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>
    <w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>{grid}</w:tblGrid>
  {''.join(tbl_rows)}
</w:tbl>
""".strip()
        )
        self.p("")

    def write(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        document_xml = self.document_xml()
        rels_xml = self.document_rels_xml()
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("[Content_Types].xml", content_types_xml(self.media))
            zf.writestr("_rels/.rels", package_rels_xml())
            zf.writestr("word/document.xml", document_xml)
            zf.writestr("word/_rels/document.xml.rels", rels_xml)
            zf.writestr("word/styles.xml", styles_xml())
            zf.writestr("word/numbering.xml", numbering_xml())
            zf.writestr("word/settings.xml", settings_xml())
            zf.writestr("docProps/core.xml", core_xml())
            zf.writestr("docProps/app.xml", app_xml())
            for media_name, media_path in self.media:
                zf.write(media_path, f"word/media/{media_name}")

    def document_xml(self) -> str:
        body = "\n".join(self.body)
        return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"
  xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex"
  xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex"
  xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex"
  xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex"
  xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex"
  xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex"
  xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex"
  xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink"
  xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:oel="http://schemas.microsoft.com/office/2019/extlst"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
  xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex"
  xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid"
  xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml"
  xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du"
  xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash"
  xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
  mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16du wp14">
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="900" w:right="850" w:bottom="900" w:left="850" w:header="450" w:footer="450" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>"""

    def document_rels_xml(self) -> str:
        return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
{''.join(self.rels)}
</Relationships>"""


def content_types_xml(media: list[tuple[str, Path]]) -> str:
    overrides = []
    if any(name.endswith(".png") for name, _ in media):
        overrides.append('<Default Extension="png" ContentType="image/png"/>')
    if any(name.endswith((".jpg", ".jpeg")) for name, _ in media):
        overrides.append('<Default Extension="jpg" ContentType="image/jpeg"/>')
        overrides.append('<Default Extension="jpeg" ContentType="image/jpeg"/>')
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  {''.join(overrides)}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""


def package_rels_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""


def styles_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="20"/><w:color w:val="111827"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="260" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="120" w:after="160"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow"/><w:b/><w:sz w:val="56"/><w:color w:val="111827"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow"/><w:sz w:val="24"/><w:color w:val="4B5563"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="320" w:after="120"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow"/><w:b/><w:sz w:val="34"/><w:color w:val="111827"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="220" w:after="80"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow"/><w:b/><w:sz w:val="26"/><w:color w:val="1F2937"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="160" w:after="60"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow"/><w:b/><w:sz w:val="22"/><w:color w:val="374151"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="Caption"/><w:basedOn w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow"/><w:i/><w:sz w:val="17"/><w:color w:val="6B7280"/></w:rPr></w:style>
</w:styles>"""


def numbering_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="180"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="420" w:hanging="240"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>"""


def settings_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
  <w:characterSpacingControl w:val="doNotCompress"/>
</w:settings>"""


def core_xml() -> str:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>1Cati Benutzerhandbuch</dc:title>
  <dc:subject>Benutzerhandbuch für die 1Cati Plattform</dc:subject>
  <dc:creator>WAMOCON GmbH</dc:creator>
  <cp:keywords>1Cati, Ataberk Estate, Benutzerhandbuch, Rollen, Plattform</cp:keywords>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>"""


def app_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex Open XML Generator</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>WAMOCON GmbH</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>"""


def jira_url(key: str) -> str:
    return f"{JIRA_BASE}/{key}"


def add_intro(doc: DocxBuilder) -> None:
    doc.p("1Cati Benutzerhandbuch", style="Title")
    doc.p(
        "Rollenbasierte Nutzung der Ataberk Estate Plattform",
        style="Subtitle",
    )
    doc.table(
        ["Feld", "Wert"],
        [
            ["Projekt", "1Cati - Property-Management-Plattform für Ataberk Estate"],
            ["Portfolio", "New Level Premium, Avsallar, Alanya"],
            ["Status", "Benutzerhandbuch für Demo, Schulung und interne Einführung."],
            ["Stand", "01. Juli 2026"],
            ["Plattform", PLATFORM_URL],
            ["Sprache dieses Handbuchs", "Deutsch"],
        ],
        [2600, 7400],
    )
    cover = ROOT / "apps" / "web" / "public" / "new-level-premium" / "masterplan-aerial.jpg"
    doc.image(cover, "Projektbild: New Level Premium als visueller Kontext für das 1Cati Portfolio.", max_width_in=6.8)
    doc.p(
        "Dieses Handbuch erklärt die Bedienung der Plattform in einfacher Sprache. Es ist für Management, Betrieb, Buchhaltung, Mitarbeiter, Eigentümer, Mieter, Schulung und interne Einführung gedacht. Die Texte beschreiben den aktuellen Demo- und Schulungsstand sowie klar getrennt die Funktionen, die erst nach Kundendaten, Verträgen, API-Schlüsseln und Produktionsfreigabe live geschaltet werden.",
    )
    doc.page_break()


def add_status_and_scope(doc: DocxBuilder) -> None:
    doc.heading(1, "1. Überblick und aktueller Stand")
    doc.p(
        "1Cati ist die zentrale Arbeitsoberfläche für Immobilienverwaltung, Service, Finanzen, Reservierung, Dokumente, Kommunikation, Rollen und Reporting. Der aktuelle Stand ist für Demo, Schulung und interne Einführung vorbereitet."
    )
    doc.heading(2, "Was ist jetzt verfügbar")
    for item in [
        "Rollenbasierter Login für Demo-Profile und produktionsbereite Supabase Auth Struktur.",
        "Dashboard mit Portfolioübersicht, Statuskarten, operativer Simulation und rollenabhängiger Navigation.",
        "Daire Matrix für Einheiten, Blöcke, Eigentümer, Bewohner, Preise, Schulden, Dokumente, Service- und Zugriffstatus.",
        "Leads, Tickets, Reservierungen, Finanzen, Dokumente, Reports, Kommunikation, Offline-Sync, Benutzer und Einstellungen als eigene Arbeitsbereiche.",
        "Interne Ticketlogik mit SLA, Priorität, Freigaben, Schuldregeln, Außendiensthinweisen und Eskalationen.",
        "Dokumentenbereich mit Upload- und Review-Logik. Live Storage ist vorbereitet, aber produktive Bucket- und Retention-Entscheidung ist noch offen.",
        "AI Assistent mit rollenabhängigen Antworten, Sprachlogik und klaren Grenzen für sensible Aktionen.",
    ]:
        doc.bullet(item)
    doc.heading(2, "Was später produktiv freigegeben werden muss")
    for item in [
        "Echte Kundendaten, Eigentümerdaten, Mieterdaten, Zahlungen, offene Salden und finale Regeln müssen vom Kunden geprüft oder bestätigt werden.",
        "Live-Anbindungen für Zahlung, Banking, SMS, E-Mail, Zugangskarten, Kameras und Dokumentenspeicher brauchen Verträge, API-Schlüssel und Freigabe.",
        "Rechtliche Regeln zu Zugangssperren, Schulden, Kautionen, Check-out und Rückerstattung müssen vom Kunden oder Fachberater freigegeben werden.",
        "Security Review, UAT, Schulung, Betriebsfreigabe und Launch Readiness sind vor produktiver Nutzung noch einzuplanen.",
    ]:
        doc.bullet(item)
    doc.heading(2, "Wichtige Links")
    doc.p("Plattform öffnen", hyperlink=PLATFORM_URL)
    doc.p("API Spezifikation im Repository: docs/api/openapi.json")


def add_roles(doc: DocxBuilder) -> None:
    doc.heading(1, "2. Rollen und Rechte")
    doc.p(
        "Die Plattform arbeitet mit sechs Kernrollen. Jede Rolle sieht nur die Seiten und Aktionen, die für ihre Arbeit notwendig sind. So werden Eigentümer-, Mieter-, Finanz- und Betriebsdaten getrennt."
    )
    doc.image(ASSET_DIR / "01-login-profiles.png", "Rollenprofile: Übersicht der sechs Rollen und ihrer Arbeitsbereiche.", max_width_in=6.8)
    doc.table(
        ["Rolle", "Zweck", "Hauptseiten"],
        [
            [
                "Verwaltung",
                "Gesamtverantwortung für Plattform, Einstellungen, Benutzer und sensible Kontrollen.",
                "Alle Seiten",
            ],
            [
                "Verantwortlicher",
                "Tägliche Standort- und Betriebsführung für New Level Premium.",
                "Übersicht, Daire Matrix, Leads, Tickets, Reservierung, Zugang, Dokumente, Reports, Kommunikation, Offline-Sync, Benutzer, Einstellungen",
            ],
            [
                "Buchhaltung",
                "Finanz- und Zahlungsprozesse, Gebühren, Kautionen, Inkasso und Reports.",
                "Übersicht, Finanzen, Dokumente, Reports, Kommunikation",
            ],
            [
                "Mitarbeiter",
                "Außendienst, Serviceausführung, Foto- und Videonachweise.",
                "Übersicht, Tickets, Reservierung, Dokumente, Kommunikation, Offline-Sync",
            ],
            [
                "Eigentümer",
                "Eigene Wohnung, Dokumente, Services, Reservierungen und Kommunikation.",
                "Übersicht, Tickets, Reservierung, Dokumente, Kommunikation",
            ],
            [
                "Mieter",
                "Berechtigte Wohnung, Services, Reservierungen, Chat und Dokumente.",
                "Übersicht, Tickets, Reservierung, Dokumente, Kommunikation",
            ],
        ],
        [1400, 3400, 4560],
    )
    doc.table(
        ["Rolle", "Darf", "Darf nicht"],
        [
            [
                "Verwaltung",
                "Konfigurieren, Benutzer verwalten, Reports prüfen, sensible Bereiche überwachen.",
                "Keine Isolation umgehen. Finanz- und Zugangsvorgänge müssen nachvollziehbar bleiben.",
            ],
            [
                "Verantwortlicher",
                "Services steuern, Aufgaben zuweisen, Reservierungen prüfen, Risiken und SLA überwachen.",
                "Keine Buchungseinträge posten und keine globalen Systemeinstellungen ändern.",
            ],
            [
                "Buchhaltung",
                "Saldo prüfen, Zahlungen und Gebühren vorbereiten, Export und Finanzberichte nutzen.",
                "Keine Benutzerverwaltung und keine operative Ticket-Schließung ohne Nachweis.",
            ],
            [
                "Mitarbeiter",
                "Zugewiesene Aufgaben bearbeiten, Status und Nachweise ergänzen.",
                "Keine Finanzbücher sehen und keine Rückerstattung, Zugangssperre oder Rolle freigeben.",
            ],
            [
                "Eigentümer",
                "Eigene Anfragen erstellen und eigene berechtigte Daten sehen.",
                "Keine anderen Eigentümer, Mitarbeiterdaten, globale Reports oder interne Finanzen sehen.",
            ],
            [
                "Mieter",
                "Service- und Reservierungsanfragen erstellen, wenn dies erlaubt ist.",
                "Keine Eigentümerdaten, andere Wohnungen, Finanzbücher oder globale Reports sehen.",
            ],
        ],
        [1400, 3980, 3980],
    )
    doc.heading(2, "Login mit Rollenprofil")
    for step in [
        "Plattform öffnen und zur Login-Seite wechseln.",
        "In der Demo- oder Schulungsumgebung das passende Rollenprofil auswählen.",
        "Nach dem Login werden nur die Menüpunkte angezeigt, die zur Rolle passen.",
        "Eine Seite öffnen und die benötigte Aufgabe ausführen.",
        "Bei falscher Sichtbarkeit oder fehlender Berechtigung die zuständige Projekt- oder Systemverantwortung informieren.",
    ]:
        doc.numbered(step)


def add_navigation(doc: DocxBuilder) -> None:
    doc.heading(1, "3. Grundbedienung")
    doc.image(ASSET_DIR / "02-overview.png", "Übersicht: Startpunkt für Betrieb, Risiken, Statuskarten und Navigation.", max_width_in=6.8)
    doc.heading(2, "Linke Navigation")
    doc.p(
        "Die linke Navigation zeigt die Arbeitsbereiche, die zur aktuellen Rolle passen. Wenn eine Seite nicht sichtbar ist, ist das meistens eine bewusste Rollenbeschränkung."
    )
    for item in [
        "Übersicht: täglicher Startpunkt mit Portfoliozustand, Risiken und Arbeitskarten.",
        "Daire Matrix: zentrale Liste der Einheiten und operativen Daten.",
        "Müşteri Adayları: Lead- und Kontaktverfolgung.",
        "Servis Talepleri: interne Tickets, Serviceaufträge und SLA.",
        "Reservasyon: Buchung, Check-in, Check-out und Aufgaben.",
        "Erişim & Uyum: Zugang, Einschränkungen, EIDS und Compliance.",
        "Finans & Aidat: Gebühren, Zahlungen, Schulden und Kautionen.",
        "Belgeler: Dokumente, Upload, Pakete, Review und Nachweise.",
        "Raporlar: Management-, Finanz-, Betriebs- und AI-Berichte.",
        "İletişim: Nachrichten, Vorlagen, Benachrichtigungen und Sprachlogik.",
        "Offline Senkron: Offline-Warteschlange, Konflikte und Feldarbeit.",
        "Kullanıcılar & Roller: Team, Bewohner, Rollen und Berechtigungen.",
        "Ayarlar: Provider-Status, Systemkontrollen und Konfiguration.",
    ]:
        doc.bullet(item)
    doc.heading(2, "Suche und Filter")
    doc.p(
        "Die globale Such- und Filterleiste dient dazu, Datensätze schnell zu finden. Nutzer können nach Einheiten, Personen, Services, Dokumenten, Nachrichten oder Status suchen. Nach dem Anwenden eines Filters muss klar sichtbar sein, dass die Ergebnisliste aktualisiert wurde."
    )
    doc.heading(2, "Sprache")
    doc.p(
        "Die Plattform unterstützt Türkisch, Englisch, Deutsch und Russisch. Türkisch ist die Betriebssprache. Die Sprache kann oben rechts gewechselt werden."
    )
    doc.heading(2, "Audit und Nachvollziehbarkeit")
    doc.p(
        "Kritische Aktionen wie Freigabe, Zahlungslogik, Zugangsbeschränkung, Dokumentprüfung und Rollenänderung sollen immer mit Nutzer, Rolle, Zeitpunkt, Grund und Status nachvollziehbar bleiben."
    )


def add_page_features(doc: DocxBuilder) -> None:
    doc.heading(1, "4. Seiten und Funktionen")
    pages = [
        {
            "title": "4.1 Übersicht",
            "image": "02-overview.png",
            "purpose": "Täglicher Startpunkt für den Verantwortlichen. Zeigt Portfolio, offene Arbeit, Risiken, Blöcke, Live-Ereignisse und Rollenarbeitsbereiche.",
            "can": [
                "Portfolio und aktiven Standort prüfen.",
                "Blockrisiken und Statuskarten lesen.",
                "Offene Tickets, Schulden, Zugriffrisiken und Check-outs priorisieren.",
                "Rollenabhängige Arbeitskarten öffnen.",
                "Daten aktualisieren und operative Simulation prüfen.",
            ],
            "qa": [
                "Menüpunkt ist für berechtigte Rollen sichtbar.",
                "Karten zeigen plausible Zahlen und führen zu passenden Seiten.",
                "Blockauswahl verändert die angezeigten Kontextdaten.",
                "Live-Ereignisse sind lesbar und nicht abgeschnitten.",
            ],
        },
        {
            "title": "4.2 Daire Matrix",
            "image": "03-unit-matrix.png",
            "purpose": "Zentrale operative Matrix für Einheiten, Blöcke, Eigentümer, Bewohner, Preise, Schulden, Dokumente, Service- und Zugangsdaten.",
            "can": [
                "Einheiten nach Block, Nummer, Eigentümer, Bewohner, Status und Preisquelle suchen.",
                "Kategorien wie Daire, Servis, Finans, Belge, Mesaj, Uyum und Rapor als Schnellfilter nutzen.",
                "Index und Folgeaufgaben prüfen.",
                "Daten aktualisieren, Datenprüfung starten und Änderungswunsch anlegen.",
                "Einheiten aus Sicht von Verkauf, Betrieb, Finanzen und Service lesen.",
            ],
            "qa": [
                "Suche liefert passende Ergebnisse und zeigt bei leeren Treffern einen verständlichen Hinweis.",
                "Filterdialog öffnet verständlich, schließt sauber und zeigt angewendete Kriterien.",
                "Index und Kategoriechips ändern die Ergebnislogik ohne Seitenbruch.",
                "Leere Ergebnisse zeigen einen hilfreichen Zustand.",
            ],
        },
        {
            "title": "4.3 Müşteri Adayları",
            "image": None,
            "purpose": "Lead- und Kontaktbereich für Käufer, Eigentümer, Mieter und Interessenten.",
            "can": [
                "Leads nach Quelle, Sprache, Budget, Interesse und Temperatur prüfen.",
                "Nächste Aktion und zuständige Person erkennen.",
                "Kontaktstatus verfolgen und mit Einheiten oder Reservierungen verbinden.",
                "Mehrsprachige Beratungskontexte für Russisch, Türkisch, Deutsch und Englisch berücksichtigen.",
            ],
            "qa": [
                "Lead-Suche und Sortierung funktionieren.",
                "Statuslabels sind verständlich.",
                "Rollen ohne Lead-Recht sehen diese Seite nicht.",
            ],
        },
        {
            "title": "4.4 Servis Talepleri",
            "image": "04-tickets.png",
            "purpose": "Interner Ticketbereich für Wartung, Service, Beschwerden, SLA, Außendienst und Freigaben.",
            "can": [
                "Tickets nach Priorität, Status, SLA, Kategorie und Verantwortlichem prüfen.",
                "Ticketdetails öffnen und nächste Aktion lesen.",
                "Schuldenregel und Freigabepflicht erkennen.",
                "Außendienstnachweise wie Foto, Video oder Notiz vorbereiten.",
                "Interne Tickets als Alternative zu externem Helpdesk nutzen.",
            ],
            "qa": [
                "Ticketkarten und Tabellen sind klickbar, fokussierbar und verständlich.",
                "SLA-Verletzungen und hohe Priorität sind sichtbar.",
                "Nicht berechtigte Rollen können keine Freigaben ausführen.",
                "Interne Service-Tickets bleiben von normalen Benutzerhinweisen getrennt.",
            ],
        },
        {
            "title": "4.5 Reservasyon",
            "image": "05-reservation.png",
            "purpose": "Buchung, Check-in, Check-out, Deposit, Aufgaben und Gästekommunikation.",
            "can": [
                "Buchungen und Reservierungsstatus prüfen.",
                "Check-in Aufgaben, Zugangsvorbereitung und Dokumentanforderungen verfolgen.",
                "Check-out, Schaden, Reinigung, Kautionsprüfung und Rückerstattung vorbereiten.",
                "Subtile Begrüßungs- und Dankeskommunikation über Kommunikationsvorlagen planen.",
                "Sperren wegen Schulden oder fehlenden Nachweisen erkennen.",
            ],
            "qa": [
                "Buchungsdaten sind chronologisch und verständlich.",
                "Deposit- und Check-out-Informationen sind nicht versteckt.",
                "Gasttexte wirken professionell und nicht spamartig.",
                "Edge Cases wie verspätete Anreise, Schaden, fehlender Ausweis und Schuldenblocker sind sichtbar.",
            ],
        },
        {
            "title": "4.6 Erişim & Uyum",
            "image": None,
            "purpose": "Zugangs- und Compliance-Bereich für EIDS, Zugangskarten, Einschränkungen, Audits und Freigaben.",
            "can": [
                "Gesperrte oder eingeschränkte Einheiten prüfen.",
                "Grund für Zugangsbeschränkung lesen.",
                "Compliance-Status und nächste Freigabe erkennen.",
                "Provider-Platzhalter für Zugangskarten und Kameras später mit Live-System verbinden.",
            ],
            "qa": [
                "Sensible Zugangsdaten sind nur für berechtigte Rollen sichtbar.",
                "Zugangssperren sind mit Grund, Status und Verantwortlichem nachvollziehbar.",
                "Eine Zugangssperre wird nicht automatisch ohne Freigabe ausgelöst.",
            ],
        },
        {
            "title": "4.7 Finans & Aidat",
            "image": "06-finance.png",
            "purpose": "Finanzbereich für Gebühren, Salden, Zahlungen, Schulden, Kautionen, Rückerstattung und Inkasso.",
            "can": [
                "Offene Salden und Schuldstatus prüfen.",
                "Zahlungs- und Gebührenstatus nachvollziehen.",
                "Kautions- und Rückerstattungsstatus prüfen.",
                "Schuldrestriktionen für Service, Zugang oder Reservierung erkennen.",
                "Finanzdaten exportieren, wenn die Rolle berechtigt ist.",
            ],
            "qa": [
                "Buchhaltungsrolle sieht Finanzdetails, andere Rollen nur ihre erlaubten Auszüge.",
                "Summen, Währung und Status wirken plausibel.",
                "Freigabe- und Exportaktionen sind klar beschriftet.",
                "Demo-Daten sind klar von echten produktiven Zahlungen getrennt.",
            ],
        },
        {
            "title": "4.8 Belgeler",
            "image": "07-documents.png",
            "purpose": "Dokumentenbereich für Upload, Dokumentpakete, KYC, TAPU, Service-Nachweise, Verträge, Review und Retention.",
            "can": [
                "Dokumente je Einheit, Person, Kategorie und Status suchen.",
                "Dokumentpakete für Move-in, Check-out, Eigentümerstatement, KYC/TAPU und Service prüfen.",
                "Dateien in der Demo- oder Schulungsumgebung hochladen und Reviewstatus verfolgen.",
                "Ablaufdaten, Retention-Klasse und Berechtigungen prüfen.",
                "Spätere Speicherung über Supabase Storage oder S3 vorbereiten.",
            ],
            "qa": [
                "Upload validiert Pflichtfelder, Typ und Größe.",
                "Dokumente anderer Eigentümer oder Mieter sind nicht sichtbar.",
                "Reviewstatus ist klar: offen, genehmigt oder abgelehnt.",
                "Produktiver Storage ist als vorbereitet, aber noch nicht live zu verstehen.",
            ],
        },
        {
            "title": "4.9 Raporlar",
            "image": "08-reports.png",
            "purpose": "Reporting für Management, Betrieb, Finanzen, Zugang, Gäste, Services und AI-gestützte Zusammenfassungen.",
            "can": [
                "Berichte nach Bereich, Frequenz, Verantwortlichem und Metrik prüfen.",
                "Management- und Finanzkennzahlen lesen.",
                "Exportierte Berichte als kontrollierte Aktion behandeln.",
                "AI-Berichtsvorschläge nur als Entwurf betrachten.",
            ],
            "qa": [
                "Diagramme und Kennzahlen sind modern, lesbar und nicht dekorativ überladen.",
                "Rollen sehen nur erlaubte Reports.",
                "Export oder Berichtserstellung erzeugt keine nicht autorisierte Aktion.",
            ],
        },
        {
            "title": "4.10 İletişim",
            "image": None,
            "purpose": "Kommunikation für Nachrichten, Vorlagen, Benachrichtigung, Sprache, Ankündigungen und Servicekommunikation.",
            "can": [
                "Nachrichten und Vorlagen nach Sprache und Anwendungsfall prüfen.",
                "Kommunikation zu Buchung, Check-in, Check-out, Service, Zahlung und Dokumenten vorbereiten.",
                "Mehrsprachige Texte prüfen, ohne Nutzer zu überfluten.",
                "Live-Versand über SMS oder E-Mail erst nach Provider-Freigabe aktivieren.",
            ],
            "qa": [
                "Texte sind kurz, professionell und rollenbezogen.",
                "Sprache bleibt konsistent.",
                "Kein Live-Versand ohne klare Demo- oder Produktionskennzeichnung.",
            ],
        },
        {
            "title": "4.11 Offline-Sync",
            "image": "11-offline-sync.png",
            "purpose": "Offline-Warteschlange für Feldarbeit, schwache Verbindung, Konflikte und spätere Synchronisation.",
            "can": [
                "Offline-Einträge und Sync-Status prüfen.",
                "Konflikte, Wiederholungen und letzte Synchronisation lesen.",
                "Für Außendienst testen, ob Aufgaben auch bei instabiler Verbindung verständlich bleiben.",
                "Produktive Offline-Fähigkeit später mit Service Worker, Storage-Strategie und Konfliktregeln härten.",
            ],
            "qa": [
                "Der Bereich erklärt klar, ob Daten synchronisiert oder nur vorbereitet sind.",
                "Fehlerzustände sind verständlich.",
                "Rollen ohne Feldarbeit sehen keine unnötige Offline-Komplexität.",
            ],
        },
        {
            "title": "4.12 Benutzer & Rollen",
            "image": "09-users.png",
            "purpose": "Verwaltung von Mitarbeitern, Rollen, Bewohnerbeziehungen, Sprachen, Workload und Freigabeberechtigungen.",
            "can": [
                "Teammitglieder und aktive Aufgaben prüfen.",
                "Rollen, Freigabelimits und Zuständigkeiten lesen.",
                "Eigentümer, Mieter und Gäste als getrennte Beziehungen verstehen.",
                "Rollenänderungen nur kontrolliert und auditiert durchführen.",
            ],
            "qa": [
                "Rollenlabels stimmen mit dem RBAC-Modell überein.",
                "Benutzer- und Bewohnerdaten sind sauber getrennt.",
                "Keine Rolle bekommt mehr Sichtbarkeit als notwendig.",
            ],
        },
        {
            "title": "4.13 Einstellungen",
            "image": "10-settings.png",
            "purpose": "Konfiguration, Provider-Status, Systemkontrollen, Integrationen, Sicherheit und Projektparameter.",
            "can": [
                "Provider-Readiness für Zahlung, SMS, E-Mail, Banking, Zugang, Kamera und Dokumentenspeicher prüfen.",
                "System- und Sicherheitskontrollen lesen.",
                "Einstellungen als vorbereitete Produktionsplanung verstehen.",
                "Live-Aktivierung erst nach Vertrag, API-Key und Kundengenehmigung durchführen.",
            ],
            "qa": [
                "Demo-Status und Live-Status sind klar unterscheidbar.",
                "Sensible Werte wie API-Schlüssel werden nicht angezeigt.",
                "Einstellungen sind für nicht berechtigte Rollen nicht änderbar.",
            ],
        },
    ]
    for page in pages:
        doc.heading(2, page["title"])
        doc.p(page["purpose"])
        image = page.get("image")
        if image:
            doc.image(ASSET_DIR / image, f"Screenshot: {page['title']}.", max_width_in=6.8)
        doc.heading(3, "Was kann ich hier tun")
        for item in page["can"]:
            doc.bullet(item)
        doc.heading(3, "Worauf sollte ich achten")
        for item in page["qa"]:
            doc.bullet(item)


def add_workflows(doc: DocxBuilder) -> None:
    doc.heading(1, "5. Wichtige Arbeitsabläufe")
    workflows = [
        (
            "Tagesstart Verantwortlicher",
            [
                ["1", "Übersicht öffnen", "Portfolio, Blockrisiko, offene Tickets, Schulden und Check-outs sind sichtbar."],
                ["2", "Kritische Karten prüfen", "SLA-Verstoß, Zugangssperre, Zahlung oder Check-out wird priorisiert."],
                ["3", "In Detailseite wechseln", "Klick auf Karte führt zur passenden Seite."],
                ["4", "Nächste Aktion dokumentieren", "Aktion ist im Kontext der Rolle nachvollziehbar."],
            ],
        ),
        (
            "Einheit finden und Auskunft geben",
            [
                ["1", "Daire Matrix öffnen", "Such- und Filterbereich ist sichtbar."],
                ["2", "Block, Einheit oder Person suchen", "Passende Einheiten erscheinen, leere Suche zeigt verständliche Meldung."],
                ["3", "Status prüfen", "Preis, Zahlung, Dokumente, Service und Zugang sind zusammen lesbar."],
                ["4", "Änderung anfordern", "Wenn Daten fehlen, wird ein Änderungswunsch statt stiller Änderung ausgelöst."],
            ],
        ),
        (
            "Service-Ticket bearbeiten",
            [
                ["1", "Servis Talepleri öffnen", "Ticketliste und Prioritäten sind sichtbar."],
                ["2", "Ticket auswählen", "Beschreibung, SLA, Verantwortlicher, Schuldregel und nächste Aktion sind verständlich."],
                ["3", "Nachweis ergänzen", "Foto, Video oder Notiz kann im passenden Kontext vorbereitet werden."],
                ["4", "Freigabe prüfen", "Hohe Kosten, Zugang oder Schuldenblock erzeugen Manager- oder Buchhaltungsprüfung."],
            ],
        ),
        (
            "Buchung, Check-in und Check-out",
            [
                ["1", "Reservasyon öffnen", "Buchungen, Aufgaben und Check-in Daten sind sichtbar."],
                ["2", "Vor Anreise prüfen", "Dokumente, Zahlung, Deposit, Zugang und Begrüßung sind vorbereitet."],
                ["3", "Während Aufenthalt prüfen", "Service und Kommunikation bleiben im Datensatz."],
                ["4", "Check-out abschließen", "Schaden, Reinigung, Deposit und Dankesnachricht werden kontrolliert abgearbeitet."],
            ],
        ),
        (
            "Dokument hochladen und prüfen",
            [
                ["1", "Belgeler öffnen", "Dokumentliste, Pakete und Upload-Bereich sind sichtbar."],
                ["2", "Datei und Kategorie wählen", "Pflichtfelder und Retention-Klasse sind erkennbar."],
                ["3", "Upload ausführen", "In Demo- oder Schulungsumgebung wird die Datei kontrolliert abgelegt oder simuliert."],
                ["4", "Reviewstatus prüfen", "Genehmigung, Ablehnung oder Nachforderung ist sichtbar."],
            ],
        ),
        (
            "Finanzprüfung",
            [
                ["1", "Finans & Aidat öffnen", "Salden, Schulden und Zahlungskontext sind sichtbar."],
                ["2", "Konto prüfen", "Eigentümer, Einheit, Betrag, Fälligkeit und Risiko werden gelesen."],
                ["3", "Schuldregel bewerten", "Service, Zugang oder Reservierung wird je Regel erlaubt, geprüft oder blockiert."],
                ["4", "Export oder Freigabe prüfen", "Aktion bleibt auf Buchhaltungs- oder Verwaltungsrolle beschränkt."],
            ],
        ),
        (
            "Rückfrage oder Problem melden",
            [
                ["1", "Problem kurz beschreiben", "Seite, Rolle und Sprache sind genannt."],
                ["2", "Screenshot oder kurze Notiz ergänzen", "Die zuständige Person kann den Fall schnell verstehen."],
                ["3", "An verantwortliche Person weitergeben", "Management, Admin oder Projektteam erhält alle nötigen Informationen."],
                ["4", "Rückmeldung abwarten", "Korrektur, Erklärung oder nächste Aktion wird nachvollziehbar geklärt."],
            ],
        ),
    ]
    for title, rows in workflows:
        doc.heading(2, title)
        doc.table(["Schritt", "Aktion", "Erwartetes Ergebnis"], rows, [900, 2700, 6400])


def add_ai_and_integrations(doc: DocxBuilder) -> None:
    doc.heading(1, "6. AI, Integrationen und Grenzen")
    doc.heading(2, "AI Assistent")
    doc.p(
        "Der AI Assistent ist als unterstützender Helfer gedacht. Er kann Zusammenfassungen, Prioritäten, Textentwürfe, Rollenhinweise und einfache Auswertungen liefern. Er soll in der Sprache antworten, in der die Frage gestellt wurde."
    )
    for item in [
        "AI darf keine Zahlung buchen.",
        "AI darf keine Rückerstattung freigeben.",
        "AI darf keine Zugangssperre aktivieren.",
        "AI darf keine Rolle ändern.",
        "AI darf sensible Daten nur im Rahmen der aktuellen Rolle verwenden.",
        "AI Antworten sind Vorschläge und müssen bei kritischen Entscheidungen menschlich geprüft werden.",
    ]:
        doc.bullet(item)
    doc.heading(2, "Externe Anbieter")
    doc.p(
        "Die Plattform ist für Integrationen vorbereitet. Live-Anbindungen werden erst aktiviert, wenn Verträge, API-Schlüssel, technische Freigaben und fachliche Freigaben vorliegen."
    )
    doc.table(
        ["Bereich", "Aktueller Stand", "Produktionsfreigabe nötig"],
        [
            ["Zahlung", "Provider-ready und Demo-Kontext", "Vertrag, API-Key, Webhook, Refund-Regel, Buchhaltungstest"],
            ["Banking", "Konzept und Platzhalter", "Bankfreigabe, API-Zugriff, Konto-Mapping, Abstimmung"],
            ["SMS", "Vorlagen und Providerplanung", "SMS-Vertrag, Sender-ID, Kostenfreigabe, Opt-in Regeln"],
            ["E-Mail", "Vorlagen und Benachrichtigungskonzept", "Domain, SPF, DKIM, DMARC, Provider-Key"],
            ["Dokumentenspeicher", "Upload- und DB-Pfad vorbereitet", "Supabase Storage oder S3 Bucket, Retention, Zugriffspolitik"],
            ["Zugangskarten", "Compliance- und Statusmodell vorbereitet", "Hardwareanbieter, API, Rollenfreigabe, Notfallprozess"],
            ["Kameras", "Nur konzeptionell und datenschutzsensibel", "Rechtsprüfung, Kameraanbieter, Zugriffsbeschränkung"],
        ],
        [2200, 3600, 4200],
    )


def add_support(doc: DocxBuilder) -> None:
    doc.heading(1, "7. Hilfe und Support")
    doc.p(
        "Wenn eine Funktion unklar ist, Daten fehlen oder eine Aktion nicht wie erwartet möglich ist, sollte zuerst der zuständige Verantwortliche informiert werden. Die Plattform ist rollenbasiert aufgebaut. Deshalb ist es normal, dass nicht jeder Nutzer jede Seite oder jede Aktion sieht."
    )
    doc.heading(2, "Was sollte ich bei einer Rückfrage angeben")
    for item in [
        "Welche Seite ist betroffen, zum Beispiel Daire Matrix, Tickets, Finanzen oder Dokumente.",
        "Mit welcher Rolle wurde gearbeitet, zum Beispiel Verantwortlicher, Buchhaltung, Mitarbeiter, Eigentümer oder Mieter.",
        "Welche Sprache war aktiv.",
        "Welche Einheit, welches Ticket, welche Reservierung oder welches Dokument war betroffen.",
        "Was sollte passieren und was ist tatsächlich passiert.",
        "Falls möglich: ein Screenshot ohne unnötige private Daten.",
    ]:
        doc.bullet(item)
    doc.heading(2, "Wichtige Grenzen")
    doc.table(
        ["Bereich", "Regel"],
        [
            ["Finanzen", "Zahlungen, Rückerstattungen, Kautionen und Schuldrestriktionen brauchen fachliche Prüfung und Freigabe."],
            ["Zugang", "Zugangssperren, Zugangskarten und sicherheitsrelevante Änderungen dürfen nicht automatisch oder ohne Freigabe erfolgen."],
            ["Dokumente", "Produktive Dokumente dürfen erst nach Speicher-, Berechtigungs- und Datenschutzfreigabe verwendet werden."],
            ["Rollen", "Rollen und Berechtigungen dürfen nur durch berechtigte Administratoren geändert werden."],
            ["AI", "AI unterstützt mit Vorschlägen. Kritische Entscheidungen bleiben bei Menschen."],
        ],
        [2200, 7160],
    )
    doc.heading(2, "Empfohlener Ablauf bei Unklarheiten")
    for step in [
        "Kurz prüfen, ob die eigene Rolle die gewünschte Seite oder Aktion überhaupt sehen darf.",
        "Wenn Daten fehlen, zuerst Einheit, Person oder Dokument über die Suche erneut aufrufen.",
        "Wenn die Aktion weiterhin unklar ist, die zuständige Person mit Seite, Rolle und kurzem Screenshot informieren.",
        "Bei Finanz-, Zugangs- oder Rollenfragen keine eigene Umgehung versuchen, sondern auf Freigabe warten.",
    ]:
        doc.numbered(step)


def add_appendix(doc: DocxBuilder) -> None:
    doc.heading(1, "8. Kurz-FAQ")
    faqs = [
        ["Ist das System produktiv live?", "Nein. Es ist als Demo- und Einführungsstand vorbereitet. Produktivbetrieb braucht finale Daten, Provider, Security, UAT und Launch-Freigabe."],
        ["Sind Zahlungen echt?", "Nein. Finanzdaten und Zahlungen sind Demo-Daten, bis der Kunde Live-Provider bestätigt."],
        ["Kann ich echte Dokumente hochladen?", "Für Demo und Schulung bitte nur Beispieldokumente verwenden. Produktive Dokumente erst nach Storage-, Retention- und Datenschutzfreigabe hochladen."],
        ["Warum sehe ich eine Seite nicht?", "Die Rolle hat wahrscheinlich keine Berechtigung. Das ist Teil des RBAC-Sicherheitsmodells."],
        ["Was mache ich bei einem Problem?", "Die zuständige Person informieren und Seite, Rolle, Sprache, kurze Beschreibung und wenn möglich einen Screenshot angeben."],
        ["Warum gibt es Offline-Sync?", "Für Außendienst und instabile Verbindung. Im Demo-Stand dient er als vorbereiteter Arbeitsbereich und muss vor Produktion technisch final gehärtet werden."],
        ["Darf AI Entscheidungen treffen?", "Nein. AI unterstützt nur. Kritische Finanz-, Zugangs-, Refund- und Rollenentscheidungen bleiben menschlich."],
    ]
    doc.table(["Frage", "Antwort"], faqs, [3000, 7000])
    doc.heading(1, "9. Änderungsnotizen")
    doc.p(
        "Dieses Handbuch basiert auf dem Entwicklungsstand vom 01. Juli 2026, den vorhandenen Dashboardseiten, dem RBAC-Modell und den aktuellen Screenshots aus der lokalen Demo-Umgebung."
    )
    doc.p(
        "Bei Änderungen an Rollen, Navigation, API, Dokumentenablage, Providerstatus oder produktivem Betriebsablauf muss dieses Handbuch aktualisiert werden."
    )


def build_doc(output_path: Path = DEFAULT_DOCX_PATH) -> None:
    doc = DocxBuilder()
    add_intro(doc)
    add_status_and_scope(doc)
    add_roles(doc)
    add_navigation(doc)
    add_page_features(doc)
    add_workflows(doc)
    add_ai_and_integrations(doc)
    add_support(doc)
    add_appendix(doc)
    doc.write(output_path)
    print(output_path)


if __name__ == "__main__":
    output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_DOCX_PATH
    build_doc(output)
