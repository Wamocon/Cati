from __future__ import annotations

import datetime as dt
import pathlib
import struct
import zipfile
from dataclasses import dataclass
from xml.sax.saxutils import escape


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "phase-delivery"
ASSET_DIR = OUT_DIR / "assets"
DOCX_PATH = OUT_DIR / "cati-phase-02-05-stakeholder-report.docx"

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
}


@dataclass
class ImageRef:
    rel_id: str
    filename: str
    source: pathlib.Path
    title: str
    caption: str


def xml(text: object) -> str:
    return escape(str(text), {'"': "&quot;"})


def run(text: str, bold: bool = False, color: str | None = None, size: int | None = None) -> str:
    props = []
    if bold:
        props.append("<w:b/>")
    if color:
        props.append(f'<w:color w:val="{color}"/>')
    if size:
        props.append(f'<w:sz w:val="{size}"/>')
    rpr = f"<w:rPr>{''.join(props)}</w:rPr>" if props else ""
    return f"<w:r>{rpr}<w:t>{xml(text)}</w:t></w:r>"


def para(
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
    return f"<w:p>{ppr_xml}{run(text, bold=bold, color=color, size=size)}</w:p>"


def bullet(text: str) -> str:
    return para(f"• {text}", style="BodyText")


def cell(content: str, width: int, fill: str | None = None) -> str:
    shd = f'<w:shd w:fill="{fill}"/>' if fill else ""
    return (
        "<w:tc>"
        f'<w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>{shd}'
        '<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/>'
        '<w:start w:w="120" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>'
        f"{content}"
        "</w:tc>"
    )


def table(rows: list[list[str]], widths: list[int], header: bool = True) -> str:
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    body = []
    for index, row in enumerate(rows):
        fill = "F2F4F7" if header and index == 0 else None
        body.append(
            "<w:tr>"
            + "".join(cell(para(value, bold=(header and index == 0)), widths[i], fill=fill) for i, value in enumerate(row))
            + "</w:tr>"
        )
    return (
        "<w:tbl>"
        '<w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="DADCE0"/>'
        '<w:left w:val="single" w:sz="4" w:color="DADCE0"/><w:bottom w:val="single" w:sz="4" w:color="DADCE0"/>'
        '<w:right w:val="single" w:sz="4" w:color="DADCE0"/><w:insideH w:val="single" w:sz="4" w:color="DADCE0"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="DADCE0"/></w:tblBorders></w:tblPr>'
        f"<w:tblGrid>{grid}</w:tblGrid>{''.join(body)}</w:tbl>"
    )


def png_size(path: pathlib.Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not a PNG file: {path}")
    return struct.unpack(">II", data[16:24])


def image_paragraph(img: ImageRef, docpr_id: int, max_width_in: float = 6.2, max_height_in: float = 3.85) -> str:
    width_px, height_px = png_size(img.source)
    scale = min(max_width_in / width_px, max_height_in / height_px)
    width_emu = int(width_px * scale * 914400)
    height_emu = int(height_px * scale * 914400)
    return f"""
<w:p>
  <w:pPr><w:jc w:val="center"/></w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="{width_emu}" cy="{height_emu}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="{docpr_id}" name="{xml(img.title)}" descr="{xml(img.caption)}"/>
        <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr>
                <pic:cNvPr id="{docpr_id}" name="{xml(img.filename)}" descr="{xml(img.caption)}"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="{img.rel_id}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="{width_emu}" cy="{height_emu}"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>
"""


def caption(text: str) -> str:
    return para(text, style="Caption", color="667085", align="center")


def page_break() -> str:
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def styles_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="1F2937"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="BodyText">
    <w:name w:val="Body Text"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:sz w:val="22"/><w:color w:val="344054"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="160"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="44"/><w:color w:val="0B2545"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="320" w:after="160"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="2E74B5"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="2E74B5"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="1F4D78"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Caption">
    <w:name w:val="caption"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="80" w:after="120"/></w:pPr>
    <w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="667085"/></w:rPr>
  </w:style>
</w:styles>
"""


def content_types(images: list[ImageRef]) -> str:
    image_overrides = "".join(
        f'<Override PartName="/word/media/{xml(img.filename)}" ContentType="image/png"/>'
        for img in images
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
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


def document_rels(images: list[ImageRef]) -> str:
    rels = [
        '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
        '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
    ]
    for img in images:
        rels.append(
            f'<Relationship Id="{img.rel_id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{xml(img.filename)}"/>'
        )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  {''.join(rels)}
</Relationships>
"""


def core_props() -> str:
    now = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>1Çatı Phase 2-5 Stakeholder Delivery Report</dc:title>
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
  <Application>Codex OOXML Builder</Application>
  <Company>Wamocon</Company>
</Properties>
"""


def settings_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
</w:settings>
"""


def document_xml(images: list[ImageRef]) -> str:
    ns_decl = " ".join(f'xmlns:{prefix}="{uri}"' for prefix, uri in NS.items())
    parts: list[str] = []
    parts.append(para("1Çatı Phase 2-5 Stakeholder Delivery Report", style="Title"))
    parts.append(para("Prepared for management and stakeholders | 25 June 2026", color="667085"))
    parts.append(
        para(
            "Status: Phases 2, 3, 4 and 5 are implemented and verified in browser QA. The system is now a usable site-management command center, not only a static prototype.",
            bold=True,
            color="047857",
            shade="ECFDF3",
        )
    )

    parts.append(para("Executive Summary", style="Heading1"))
    parts.append(
        para(
            "The next four delivery phases have been completed as a working web application layer. The implementation now covers role-based navigation, platform controls, audit visibility, site/unit data management, import validation, staff records, resident/user records and permission visibility. The app remains focused on a web-first CRM because this is faster to deliver, easier for office teams to adopt, and simpler to secure than a separate mobile app at this stage.",
            style="BodyText",
        )
    )
    parts.append(
        table(
            [
                ["Area", "Current result"],
                ["Completed phases", "4 of 4 in this batch: Phase 2, Phase 3, Phase 4, Phase 5."],
                ["Business value", "Management can see the operation, validate imported data, control roles, and track audit decisions in one place."],
                ["QA result", "30/30 E2E tests passed; 26/26 browser-audit routes passed; 5/5 manual browser QA steps passed."],
                ["Backend/API check", "Phase-status API returns HTTP 200, 4 completed phases, 0 rejected import rows, 5 controls, and 5 audit events."],
            ],
            [2300, 7060],
        )
    )

    parts.append(para("How the app works now", style="Heading1"))
    parts.append(
        table(
            [
                ["Step", "Plain-language workflow"],
                ["1. Open dashboard", "Management starts from the Site Management Center and sees risks, metrics, AI priorities and the completed phase cards."],
                ["2. Manage units", "The Daire Matrisi page shows blocks, floors, unit status, debt, access status and service pressure."],
                ["3. Validate imports", "Before Excel/list data becomes operational, the import center separates valid rows, warnings and rejected rows."],
                ["4. Manage people", "The users and roles page shows staff, owners, tenants, guests, workload and role coverage."],
                ["5. Control access", "The settings area shows platform controls, RBAC permissions and audit events for sensitive decisions."],
                ["6. Use AI safely", "AI is used as an assistant for prioritization and summaries; sensitive finance/access actions remain visible and auditable."],
            ],
            [2100, 7260],
        )
    )

    parts.append(para("Phase Completion Detail", style="Heading1"))
    parts.append(
        table(
            [
                ["Phase", "Implemented", "What it does", "How to use it"],
                ["Phase 2", "UX/UI and role-based navigation", "Creates a modern dashboard, sidebar navigation, mobile layout, phase cards, metrics, charts, 3D site simulation and AI assistant area.", "Open Dashboard. Use the left menu. Critical numbers are at the top; detailed tables and search are below."],
                ["Phase 3", "Platform, Auth, RBAC and audit foundation", "Shows platform controls, role visibility, demo/real auth boundary, audit events and security settings.", "Open Ayarlar. Review controls, RBAC matrix and audit events such as AUD-2401."],
                ["Phase 4", "Site, block, floor, unit and import control", "Models the site portfolio and import quality gate with 769 unit handling, warning rows and zero rejected rows.", "Open Daire Matrisi. Use block overview, unit matrix and import validation before trusting source lists."],
                ["Phase 5", "Owners, tenants, guests, staff and roles", "Shows resident/user records, staff workload, approval limits, language/access hints and role coverage.", "Open Kullanıcılar & Roller. Search staff or roles and check who can approve finance, restrict access or export data."],
            ],
            [1300, 2300, 3300, 2460],
        )
    )

    parts.append(para("Screenshot Evidence", style="Heading1"))
    for index, img in enumerate(images, start=1):
        parts.append(para(img.title, style="Heading2"))
        parts.append(image_paragraph(img, index))
        parts.append(caption(img.caption))
        if index in {2, 4}:
            parts.append(page_break())

    parts.append(para("QA and Acceptance Evidence", style="Heading1"))
    parts.append(
        table(
            [
                ["Quality gate", "Result", "Meaning for management"],
                ["Lint", "Passed", "The frontend code follows the configured quality rules."],
                ["TypeScript", "Passed", "The app compiles at type level without known type errors."],
                ["Full E2E", "30/30 passed", "Desktop and mobile user journeys, login, pitch, dashboard and API checks are working."],
                ["Browser audit", "26/26 routes passed", "Core pages have no detected console/page errors or horizontal overflow at desktop/mobile sizes."],
                ["Manual QA", "5/5 passed", "A browser checked the new phase hub, import search, users search, platform audit and mobile dashboard."],
            ],
            [2300, 1900, 5160],
        )
    )
    parts.append(
        para(
            "Important limitation: this batch proves the product workflow and data model using the current local/demo data layer. Production rollout still needs final database connection hardening, real Supabase policies, real customer data migration, live Jira/GitHub release governance, backups and user acceptance testing with the client.",
            bold=True,
            color="7A5A00",
            shade="FFF7E6",
        )
    )

    parts.append(para("Design and Operating Principles Followed", style="Heading1"))
    parts.append(bullet("Web-first delivery to reduce delivery risk and make office workflows faster."))
    parts.append(bullet("Server-first architecture where possible, with client-side components only for interactive UI."))
    parts.append(bullet("Role-based navigation and permission visibility so each team sees only relevant work."))
    parts.append(bullet("Audit trail for sensitive finance, access and AI-supported decisions."))
    parts.append(bullet("Responsive Turkish UI with simple language, visible status badges and searchable operational tables."))
    parts.append(bullet("Security and accessibility aligned with current best-practice references: OWASP ASVS, Supabase RLS guidance and WCAG 2.2."))

    parts.append(para("Recommended Next Steps", style="Heading1"))
    parts.append(
        table(
            [
                ["Priority", "Next step", "Reason"],
                ["1", "Run stakeholder walkthrough", "Confirm whether the management view and Turkish workflow copy match the client expectation."],
                ["2", "Connect real production database policies", "Move from demo-safe data to secure tenant/site scoped production data."],
                ["3", "Start Phase 6+ service workflow", "The next biggest value area is a full ticket/service lifecycle with SLA, assignment, vendor and cost handling."],
                ["4", "Client UAT pack", "Prepare test accounts, acceptance scenarios and sign-off checklist for the client."],
            ],
            [1000, 3500, 4860],
        )
    )

    sect = (
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>'
        "</w:sectPr>"
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document {ns_decl}>
  <w:body>
    {''.join(parts)}
    {sect}
  </w:body>
</w:document>
"""


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    images = [
        ImageRef("rIdImg1", "phase-hub-desktop.png", ASSET_DIR / "phase-hub-desktop.png", "Phase 2-5 Delivery Hub", "Dashboard showing all four completed phase cards, role navigation, metrics and the AI assistant area."),
        ImageRef("rIdImg2", "phase-3-platform-audit.png", ASSET_DIR / "phase-3-platform-audit.png", "Phase 3 Platform and Audit Controls", "Settings screen showing security controls, RBAC matrix, audit trail and theme control."),
        ImageRef("rIdImg3", "phase-4-import-validation.png", ASSET_DIR / "phase-4-import-validation.png", "Phase 4 Import Validation", "Daire Matrisi screen showing import status, valid rows, warnings, zero rejected rows and a unit search."),
        ImageRef("rIdImg4", "phase-5-users-roles.png", ASSET_DIR / "phase-5-users-roles.png", "Phase 5 Users, Staff and Role Coverage", "Users and roles screen showing staff workload, role principle, staff search and permission matrix."),
        ImageRef("rIdImg5", "phase-hub-mobile.png", ASSET_DIR / "phase-hub-mobile.png", "Mobile Dashboard Check", "Mobile dashboard view proving the phase hub and key management cards stack correctly on a small screen."),
    ]
    for img in images:
      if not img.source.exists():
          raise FileNotFoundError(img.source)

    files = {
        "[Content_Types].xml": content_types(images),
        "_rels/.rels": package_rels(),
        "word/document.xml": document_xml(images),
        "word/_rels/document.xml.rels": document_rels(images),
        "word/styles.xml": styles_xml(),
        "word/settings.xml": settings_xml(),
        "docProps/core.xml": core_props(),
        "docProps/app.xml": app_props(),
    }

    with zipfile.ZipFile(DOCX_PATH, "w", zipfile.ZIP_DEFLATED) as docx:
        for name, content in files.items():
            docx.writestr(name, content)
        for img in images:
            docx.write(img.source, f"word/media/{img.filename}")

    print(DOCX_PATH)


if __name__ == "__main__":
    main()
