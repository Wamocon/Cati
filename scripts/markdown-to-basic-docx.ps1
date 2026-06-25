param(
  [Parameter(Mandatory = $true)]
  [string[]]$InputPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Escape-XmlText {
  param([AllowNull()][string]$Text)
  if ($null -eq $Text) { return "" }
  return [System.Security.SecurityElement]::Escape($Text)
}

function New-Paragraph {
  param(
    [string]$Text,
    [string]$Style = "Normal",
    [bool]$KeepSpace = $false
  )
  $safe = Escape-XmlText $Text
  $space = if ($KeepSpace) { ' xml:space="preserve"' } else { "" }
  return "<w:p><w:pPr><w:pStyle w:val=`"$Style`"/></w:pPr><w:r><w:t$space>$safe</w:t></w:r></w:p>"
}

function New-PageBreak {
  return "<w:p><w:r><w:br w:type=`"page`"/></w:r></w:p>"
}

function Split-MarkdownTableRow {
  param([string]$Line)
  $trimmed = $Line.Trim()
  if ($trimmed.StartsWith("|")) { $trimmed = $trimmed.Substring(1) }
  if ($trimmed.EndsWith("|")) { $trimmed = $trimmed.Substring(0, $trimmed.Length - 1) }
  return $trimmed -split "\|" | ForEach-Object { $_.Trim() }
}

function Test-MarkdownTableSeparator {
  param([string]$Line)
  return ($Line.Trim() -match "^\|?[\s:\-]+\|[\s:\-\|]+$")
}

function New-Table {
  param([string[]]$Rows)
  if ($Rows.Count -lt 2) { return "" }
  $header = @(Split-MarkdownTableRow $Rows[0])
  $bodyRows = @()
  for ($i = 2; $i -lt $Rows.Count; $i++) {
    $bodyRows += ,@(Split-MarkdownTableRow $Rows[$i])
  }

  $colCount = [Math]::Max(1, $header.Count)
  $width = [Math]::Floor(9000 / $colCount)
  $xml = New-Object System.Text.StringBuilder
  [void]$xml.Append("<w:tbl><w:tblPr><w:tblW w:w=`"0`" w:type=`"auto`"/><w:tblBorders><w:top w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"BFBFBF`"/><w:left w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"BFBFBF`"/><w:bottom w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"BFBFBF`"/><w:right w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"BFBFBF`"/><w:insideH w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"D9D9D9`"/><w:insideV w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"D9D9D9`"/></w:tblBorders></w:tblPr>")
  [void]$xml.Append("<w:tblGrid>")
  for ($c = 0; $c -lt $colCount; $c++) {
    [void]$xml.Append("<w:gridCol w:w=`"$width`"/>")
  }
  [void]$xml.Append("</w:tblGrid>")

  [void]$xml.Append("<w:tr>")
  foreach ($cell in $header) {
    [void]$xml.Append("<w:tc><w:tcPr><w:tcW w:w=`"$width`" w:type=`"dxa`"/><w:shd w:fill=`"F2F5F7`"/></w:tcPr>")
    [void]$xml.Append((New-Paragraph -Text $cell -Style "TableHeader"))
    [void]$xml.Append("</w:tc>")
  }
  [void]$xml.Append("</w:tr>")

  foreach ($row in $bodyRows) {
    [void]$xml.Append("<w:tr>")
    for ($c = 0; $c -lt $colCount; $c++) {
      $cellText = if ($c -lt $row.Count) { $row[$c] } else { "" }
      [void]$xml.Append("<w:tc><w:tcPr><w:tcW w:w=`"$width`" w:type=`"dxa`"/></w:tcPr>")
      [void]$xml.Append((New-Paragraph -Text $cellText -Style "TableCell"))
      [void]$xml.Append("</w:tc>")
    }
    [void]$xml.Append("</w:tr>")
  }
  [void]$xml.Append("</w:tbl>")
  return $xml.ToString()
}

function Convert-MarkdownToBodyXml {
  param([string[]]$MarkdownPaths)
  $body = New-Object System.Text.StringBuilder
  $firstDocument = $true

  foreach ($path in $MarkdownPaths) {
    if (-not (Test-Path -LiteralPath $path)) {
      throw "Input file not found: $path"
    }
    if (-not $firstDocument) {
      [void]$body.Append((New-PageBreak))
    }
    $firstDocument = $false

    $lines = Get-Content -LiteralPath $path -Encoding UTF8
    $inCode = $false
    $code = New-Object System.Collections.Generic.List[string]
    $i = 0
    while ($i -lt $lines.Count) {
      $line = [string]$lines[$i]

      if ($line.Trim().StartsWith('```')) {
        if ($inCode) {
          foreach ($codeLine in $code) {
            [void]$body.Append((New-Paragraph -Text $codeLine -Style "CodeBlock" -KeepSpace $true))
          }
          $code.Clear()
          $inCode = $false
        } else {
          $inCode = $true
        }
        $i++
        continue
      }

      if ($inCode) {
        $code.Add($line)
        $i++
        continue
      }

      if ($line.Trim() -eq "") {
        $i++
        continue
      }

      if ($line.Trim() -eq "---") {
        [void]$body.Append("<w:p><w:pPr><w:pBdr><w:bottom w:val=`"single`" w:sz=`"6`" w:space=`"1`" w:color=`"D9D9D9`"/></w:pBdr></w:pPr></w:p>")
        $i++
        continue
      }

      if ($line.Trim().StartsWith("|") -and ($i + 1 -lt $lines.Count) -and (Test-MarkdownTableSeparator $lines[$i + 1])) {
        $tableRows = New-Object System.Collections.Generic.List[string]
        while ($i -lt $lines.Count -and ([string]$lines[$i]).Trim().StartsWith("|")) {
          $tableRows.Add([string]$lines[$i])
          $i++
        }
        [void]$body.Append((New-Table $tableRows.ToArray()))
        continue
      }

      if ($line -match "^# (.+)$") {
        [void]$body.Append((New-Paragraph -Text $Matches[1] -Style "Title"))
      } elseif ($line -match "^## (.+)$") {
        [void]$body.Append((New-Paragraph -Text $Matches[1] -Style "Heading1"))
      } elseif ($line -match "^### (.+)$") {
        [void]$body.Append((New-Paragraph -Text $Matches[1] -Style "Heading2"))
      } elseif ($line -match "^#### (.+)$") {
        [void]$body.Append((New-Paragraph -Text $Matches[1] -Style "Heading3"))
      } elseif ($line -match "^- (.+)$") {
        [void]$body.Append((New-Paragraph -Text ("- " + $Matches[1]) -Style "ListParagraph"))
      } elseif ($line -match "^\d+\. (.+)$") {
        [void]$body.Append((New-Paragraph -Text $line -Style "ListParagraph"))
      } else {
        [void]$body.Append((New-Paragraph -Text $line -Style "Normal"))
      }
      $i++
    }
  }
  return $body.ToString()
}

function Write-Utf8NoBom {
  param([string]$Path, [string]$Content)
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

$resolvedInputs = @()
foreach ($input in $InputPath) {
  $resolvedInputs += (Resolve-Path -LiteralPath $input).Path
}

if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $outFull = [System.IO.Path]::GetFullPath($OutputPath)
} else {
  $outFull = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
}
$outDir = Split-Path -Parent $outFull
if (-not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$tmpRoot = Join-Path $outDir (".docx-build-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tmpRoot "_rels") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tmpRoot "docProps") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tmpRoot "word") | Out-Null

$bodyXml = Convert-MarkdownToBodyXml $resolvedInputs

$contentTypes = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"@

$rels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"@

$document = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    $bodyXml
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$styles = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/><w:color w:val="1F2937"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="220"/></w:pPr><w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:sz w:val="40"/><w:color w:val="0F172A"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="0F766E"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="260" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/><w:color w:val="164E63"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="374151"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360"/><w:spacing w:after="70"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="CodeBlock"><w:name w:val="Code Block"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/><w:shd w:fill="F8FAFC"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableHeader"><w:name w:val="Table Header"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="40"/></w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableCell"><w:name w:val="Table Cell"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="40"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style>
</w:styles>
"@

$now = (Get-Date).ToUniversalTime().ToString("s") + "Z"
$core = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>AI-Powered Residential Site Management CRM</dc:title>
  <dc:creator>1Cati Product and Engineering</dc:creator>
  <cp:lastModifiedBy>1Cati Product and Engineering</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">$now</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">$now</dcterms:modified>
</cp:coreProperties>
"@

$app = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex OOXML Builder</Application>
</Properties>
"@

Write-Utf8NoBom (Join-Path $tmpRoot "[Content_Types].xml") $contentTypes
Write-Utf8NoBom (Join-Path $tmpRoot "_rels\.rels") $rels
Write-Utf8NoBom (Join-Path $tmpRoot "word\document.xml") $document
Write-Utf8NoBom (Join-Path $tmpRoot "word\styles.xml") $styles
Write-Utf8NoBom (Join-Path $tmpRoot "docProps\core.xml") $core
Write-Utf8NoBom (Join-Path $tmpRoot "docProps\app.xml") $app

if (Test-Path -LiteralPath $outFull) {
  Remove-Item -LiteralPath $outFull -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($outFull, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $rootWithSep = $tmpRoot.TrimEnd('\') + '\'
  Get-ChildItem -LiteralPath $tmpRoot -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($rootWithSep.Length).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relative) | Out-Null
  }
} finally {
  $zip.Dispose()
}
Remove-Item -LiteralPath $tmpRoot -Recurse -Force
Write-Output $outFull
