# Dokumentationsstruktur

Stand: 25. Juni 2026

## Aktive Management-Dokumentation

Der zentrale fachliche Leitfaden fuer den aktuellen Kunden- und Projektkontext liegt hier:

- `client-new-level-premium/New-Level-Premium-CRM-Business-Blueprint-DE.docx`

Dieses Dokument ist die primaere Lesefassung fuer Management, Vertrieb, Backoffice, Service, Finanzen und Projektleitung. Es beschreibt New Level Premium Avsallar Alanya, den aktuellen Umsetzungsstand, die fachlichen Luecken und die 15 umzusetzenden Geschaeftsphasen in einfacher deutscher Sprache.

## Originale Kundenvorgaben und Eingaben

Die vom Kunden oder aus der Analyse stammenden Ausgangsdokumente liegen gesammelt hier:

- `source/client-inputs/`

Diese Dateien sind Quellenmaterial. Sie sollen nicht geloescht werden, weil sie die fachliche Herleitung des Projekts belegen. Neue Rohdokumente oder extrahierte Texte aus Kundendateien gehoeren ebenfalls in diesen Ordner, nicht in das Repository-Hauptverzeichnis.

## Detailnachweise zu umgesetzten Phasen

Die folgenden Dokumente bleiben als Detailnachweise fuer bereits gebaute Phasen erhalten:

- `phase-delivery/de/phase-02-ux-ui-rollennavigation.docx`
- `phase-delivery/de/phase-03-plattform-auth-rbac-audit.docx`
- `phase-delivery/de/phase-04-site-import-datenmodell.docx`
- `phase-delivery/de/phase-05-benutzer-rollen-personal.docx`

## Quellen- und Archivmaterial

Die alten BRD-, PRD-, TRD- und Annex-Dateien bleiben als Arbeits- und Archivmaterial erhalten:

- `requirements/option-3-ai-site-crm/`
- `ways-of-work/`
- `archive/legacy-product-roadmap.md`

Diese Dateien sind nicht mehr die erste Lesefassung fuer Stakeholder. Sie dienen als Nachweis, Quelle oder technische Vertiefung. Fuer externe Weitergabe soll zuerst der Master Blueprint genutzt werden. Dateien im Archiv koennen aeltere Formulierungen oder technische Rohfassung enthalten und sollen vor externer Nutzung ueberarbeitet werden.

## Bilder und QA

- `phase-delivery/business-assets/`: Screenshots fuer Business-Dokumente.
- `phase-delivery/assets/`: fruehere Phasenbilder.
- `quality/browser-audit/`: Browser-QA-Berichte und Screenshots.
- `quality/manual-qa/legacy-root-qa/`: alte manuelle QA-Screenshots, die vorher im Hauptverzeichnis lagen.

## Pflege-Regel

Neue stakeholderrelevante Informationen zu New Level Premium sollen zuerst im Master Blueprint ergaenzt werden. Detaildokumente koennen danach nachgezogen werden, damit keine widerspruechlichen Fassungen entstehen.

## Aufraeum-Regeln

- Keine DOCX-, PNG-, TXT- oder Analyse-Dateien im Repository-Hauptverzeichnis ablegen.
- Temporäre Word-Dateien wie `~$*.docx`, `.tmp` oder `.bak` duerfen entfernt werden.
- Exakte Duplikate duerfen entfernt werden, wenn eine gleichwertige Fassung erhalten bleibt.
- Alte Anforderungen bleiben im Archiv, solange sie als Quelle oder Nachweis dienen.
