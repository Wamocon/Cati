# -*- coding: utf-8 -*-
from __future__ import annotations

import datetime as dt
import pathlib
import struct
import zipfile
from dataclasses import dataclass
from xml.sax.saxutils import escape


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "client-new-level-premium"
BUSINESS_ASSETS = ROOT / "docs" / "phase-delivery" / "business-assets"
OUT_FILE = OUT_DIR / "New-Level-Premium-CRM-Business-Blueprint-DE.docx"


def esc(value: object) -> str:
    return escape(str(value), {'"': "&quot;"})


def png_size(path: pathlib.Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not a PNG file: {path}")
    return struct.unpack(">II", data[16:24])


@dataclass
class ImageItem:
    source: pathlib.Path
    title: str
    caption: str
    rel_id: str = ""
    target: str = ""


@dataclass
class Stream:
    number: int
    title: str
    business_owner: str
    purpose: str
    subthemes: list[tuple[str, str]]
    workflow: list[str]
    rules: list[str]
    current_coverage: str
    missing: list[str]
    acceptance: list[str]
    ai_support: str


SOURCES = [
    (
        "Ataberk Estate",
        "https://www.ataberkestate.com/articles/proekt-new-level-premium-investiruy-zarabatyvay-i-otdykhay",
        "New Level Premium is positioned as an investment, income and leisure project connected to Ataberk sales activity.",
    ),
    (
        "Vikingen Estate",
        "https://vikingen.de/de/immobilien/1109-new-level-premium-avsallar-alanya",
        "German listing describes a 5-star project in Avsallar with price range, 52,000 m2 plot, apartment types, amenities, beach distance and airport distances.",
    ),
    (
        "Irlanya Homes",
        "https://irlanyahomes.com/de/properties/projects/avsallar/new-level-premium-apartments-alanya-turkey/",
        "German listing describes hotel infrastructure, private beach, owner reception, beach transfer, installment plan and rental/ROI arguments.",
    ),
    (
        "Turk.Estate",
        "https://turk.estate/de/real-estate/o222300/",
        "Listing describes a concrete 1+1 unit, 50 m2, 6th floor, smart-home features, beach shuttle, owner services, rental management and seller contact channels.",
    ),
    (
        "TechRadar Property Management Software 2026",
        "https://www.techradar.com/best/best-property-management-software",
        "Benchmark indicates mature property platforms combine maintenance, accounting, communication, owner portals, mobile inspections and reporting.",
    ),
    (
        "TechRadar Real Estate CRM 2026",
        "https://www.techradar.com/best/the-best-crm-for-real-estate",
        "Benchmark indicates real estate CRMs emphasize lead tracking, listing management, personalization, automation, mobile use and AI-assisted prioritization.",
    ),
]


PROPERTY_FACTS = [
    ("Projektname", "New Level Premium Avsallar Alanya"),
    ("Kernangebot", "Wohnungen zum Verkauf aus einem 5-Sterne-Projekt in Alanya Avsallar"),
    ("Standort", "Avsallar, Alanya, nahe Incekum Beach"),
    ("Projektfläche", "ca. 52.000 m2"),
    ("Stranddistanz", "ca. 900 m, je nach Quelle 3 bis 5 Gehminuten durch den Wald zum Meer"),
    ("Projektstruktur", "Wohnblöcke plus eigenes 5-Sterne-Hotel; Quellen nennen 7 Wohnblöcke, teilweise auch 9 Blöcke"),
    ("Einheitentypen", "1+1, 2+1 Gartenwohnungen, 2+1 Penthouse, 3+1 Penthouse"),
    ("Preisrahmen", "Quellen nennen ab ca. 105.000 EUR bis 314.500 EUR, abhängig von Anbieter, Einheit und Zeitpunkt"),
    ("Zahlungslogik", "Anzahlung und zinsfreie Raten bis Fertigstellung werden als Verkaufsargument genannt"),
    ("Fertigstellung", "Quellen nennen 2025 bzw. 30.06.2025"),
    ("Käuferargumente", "Investment, Mietpotenzial, hoher Wiederverkaufswert, Natur, Hotelkomfort, Privatstrand"),
    ("Serviceargumente", "Eigentümer-Rezeption, technische Anliegen, Strandtransfer, Beachclub, Spa, Fitness, Restaurants und Bars"),
]


CURRENT_COVERAGE = [
    ("CRM und Kontakte", "Teilweise umgesetzt", "Leads, Eigentümer, Bewohner, Gäste, Sprache und Kontaktpräferenz sind modelliert. Externe Kanäle wie WhatsApp, Viber und Telegram sind noch nicht offiziell angebunden."),
    ("Einheiten und Projektmatrix", "Teilweise umgesetzt", "Die Demo zeigt 769 Einheiten, Blöcke, Status, Suche und Importprüfung. Die echten New-Level-Einheiten mit realen Preisen, Etagen, Flächen und Anbieter-Codes fehlen noch."),
    ("Service und Tickets", "Gut begonnen", "Wartungstickets, SLA, Medienanzahl, Kosten und Zahlungsblockaden sind vorhanden. Hotelservice, Strandservice, Shuttle und Rezeption brauchen eigene Kategorien."),
    ("Finanzen", "Teilweise umgesetzt", "Aidat, Schulden, Deposits und Cashflow sind vorhanden. 0%-Ratenplan, Käuferanzahlungen, EUR/TRY/USD, Provisionslogik und Mietrendite fehlen noch als echte Deal-Sicht."),
    ("Dokumente", "Gut begonnen", "Dokumentenablage, Status, Aufbewahrung und Risiken sind vorhanden. TAPU, Kaufvertrag, EIDS, Pass/KYC, Reservierungsvertrag und Staatsbürgerschafts-/Aufenthaltscheck müssen projektspezifisch werden."),
    ("Eigentümer- und Hotelservice", "Nicht vollständig", "Aktuelle App zeigt After-Sales allgemein. Es fehlen Eigentümer-Rezeption, Hotelvorteile, Spa/Fitness/Restaurantrechte, Beachclub und Vermietungsverwaltung."),
    ("Berichte und KI", "Gut begonnen", "AI-Risiken, Berichte, Priorisierung und lokaler AI-Kontext sind vorhanden. Quellenbasierte Verkaufsargumente, Renditehinweise und Antwortvorschläge pro Lead fehlen noch."),
    ("Rollen und Kontrolle", "Gut begonnen", "Rollen, Audit und sensible Entscheidungen sind sichtbar. Feingranulare Freigaben für Verkauf, Finanzplan, Dokumentfreigabe, Servicekosten und Vermietung fehlen noch."),
]


STREAMS = [
    Stream(
        1,
        "Markt-, Projekt- und Quellenbasis",
        "Management, Vertrieb, Projektleitung",
        "Alle Teams arbeiten mit derselben Wahrheit über New Level Premium: Standort, Angebot, Projektstruktur, Preise, Quellen und Verkaufsargumente.",
        [
            ("Quellenregister", "Jede externe Quelle wird mit Datum, Kernaussage, Preisstand und Vertrauensniveau geführt."),
            ("Projektprofil", "Das Projekt erhält ein zentrales Profil mit Fläche, Lage, Stranddistanz, Blöcken, Hotelanteil und Fertigstellung."),
            ("Widerspruchsprüfung", "Unterschiedliche Angaben, zum Beispiel 7 oder 9 Blöcke, werden sichtbar markiert statt ungeprüft übernommen."),
            ("Management-Sicht", "Führungskräfte sehen, welche Aussagen belastbar sind und welche durch den Kunden bestätigt werden müssen."),
            ("Vertriebswissen", "Berater erhalten kurze, geprüfte Antworten für häufige Käuferfragen."),
        ],
        [
            "Neue Quelle wird erfasst.",
            "Fakten werden extrahiert und in einfache Business-Begriffe übersetzt.",
            "Widersprüche werden markiert.",
            "Projektleitung bestätigt oder korrigiert die Aussage.",
            "Vertrieb nutzt nur freigegebene Aussagen.",
        ],
        [
            "Keine Verkaufsbehauptung ohne Quelle oder interne Freigabe.",
            "Preis- und Fertigstellungsdaten werden mit Quellenzeitpunkt gespeichert.",
            "Unsichere Angaben werden im CRM als Prüfung offen angezeigt.",
        ],
        "Der Ataberk-Kontext und einzelne externe Quellen sind berücksichtigt.",
        ["Es gibt noch kein formales Quellenregister im UI.", "Widersprüche zwischen Quellen werden noch nicht automatisch sichtbar.", "Freigabeprozess für Verkaufsargumente fehlt."],
        ["Projektprofil enthält alle Pflichtfelder.", "Mindestens vier Quellen sind dokumentiert.", "Widersprüche sind markiert.", "Vertrieb kann freigegebene Argumente kopieren."],
        "AI kann Quellen zusammenfassen, Unterschiede markieren und eine klare deutsche Antwort für Management und Vertrieb vorschlagen.",
    ),
    Stream(
        2,
        "Lead-Erfassung und schnelle Reaktion",
        "Vertrieb, Callcenter, Teamleitung",
        "Jede Anfrage aus Website, WhatsApp, Telegram, Viber, Telefon oder Formular wird schnell sichtbar, sauber zugeordnet und ohne Informationsverlust weiterbearbeitet.",
        [
            ("Lead-Profil", "Name, Sprache, Budget, Herkunft, Wunschwohnung, Kontaktkanal und Dringlichkeit stehen auf einer Seite."),
            ("Reaktionszeit", "Neue Leads erhalten eine klare Frist, damit heiße Anfragen nicht liegen bleiben."),
            ("Kanalhistorie", "Gespräche, Rückrufe und gesendete Exposés werden am Lead gespeichert."),
            ("Teamübergabe", "Ein Berater kann einen Lead mit Kontext an einen anderen Berater übergeben."),
            ("Nicht erreichbar", "Nach mehreren fehlgeschlagenen Kontakten startet ein definierter Follow-up-Plan."),
        ],
        ["Lead kommt rein.", "System erkennt Quelle und Sprache.", "Lead wird priorisiert.", "Berater reagiert.", "Antwort und nächster Schritt werden gespeichert."],
        ["Kein Lead ohne Verantwortlichen.", "Jede Antwort braucht nächsten Schritt oder Abschlussgrund.", "VIP- und Investment-Leads erhalten kürzere Reaktionszeit."],
        "Lead- und Kontaktmodell ist vorhanden, externe Kanalanbindung ist noch nicht echt.",
        ["WhatsApp/Viber/Telegram API-Anbindung fehlt.", "30-Minuten-Reaktionslogik ist noch nicht vollständig sichtbar.", "Vorlagen für New-Level-Verkauf fehlen."],
        ["Lead aus jedem Kanal landet im CRM.", "Teamleitung sieht offene Reaktionszeiten.", "Berater kann direkt passendes Exposé und Projekthinweise senden."],
        "AI kann Leads nach Kaufabsicht, Budget, Sprache und Risiko priorisieren und Antwortentwürfe in Deutsch, Türkisch, Englisch oder Russisch erstellen.",
    ),
    Stream(
        3,
        "Mehrsprachige Beratung und Käuferqualifizierung",
        "Vertrieb, internationale Kundenbetreuung",
        "Ausländische Käufer verstehen das Projekt, die Kosten, den Ablauf und die nächsten Schritte ohne Sprach- oder Vertrauensverlust.",
        [
            ("Sprachprofil", "Deutsch, Türkisch, Englisch und Russisch werden pro Lead, Eigentümer und Dokument geführt."),
            ("Käuferziel", "Nutzung als Ferienwohnung, Daueraufenthalt, Investment, Vermietung oder Staatsbürgerschaft wird getrennt erfasst."),
            ("Einwandbehandlung", "Typische Fragen zu Strand, Hotelservice, Kosten, TAPU, Raten und Vermietung sind vorbereitet."),
            ("Beratungsnotizen", "Jede Beratung endet mit klarem Status: interessiert, reservieren, Dokumente offen, Finanzierung offen oder verloren."),
            ("Vertrauensaufbau", "Quellen, Bilder, Lageargumente und rechtliche Schritte werden konsistent erklärt."),
        ],
        ["Käuferziel aufnehmen.", "Passende Einheitengruppe vorschlagen.", "Risiken und offene Fragen klären.", "Nächsten Termin planen.", "Entscheidung dokumentieren."],
        ["Beratung darf keine Rechts- oder Steuerzusage ersetzen.", "Aufenthalt und Staatsbürgerschaft werden als Vorprüfung markiert.", "Alle sensiblen Zusagen brauchen Freigabe."],
        "Sprachen und Kontaktpräferenzen sind vorhanden.",
        ["Käuferqualifizierung nach Ziel fehlt noch.", "Einwandbibliothek fehlt.", "Mehrsprachige Vorlagen sind noch nicht vollständig."],
        ["Lead hat Käuferziel.", "Berater sieht passende Argumente.", "Antworten sind sprachlich korrekt.", "Unsichere Aussagen werden als Prüfung offen markiert."],
        "AI kann Beratungsnotizen zusammenfassen, passende nächste Schritte vorschlagen und Übersetzungen vorbereiten.",
    ),
    Stream(
        4,
        "Einheiten, Preise und Verfügbarkeit",
        "Vertrieb, Datenmanagement, Management",
        "Alle Wohnungen, Varianten und Preise werden so gepflegt, dass Berater schnell und korrekt passende Angebote machen können.",
        [
            ("Einheitenstamm", "Block, Etage, Wohnungsnummer, Typ, Fläche, Aussicht, Status und Preis werden zentral gepflegt."),
            ("Preisvarianten", "Listenpreis, Aktionspreis, Anbieterpreis, Reservierungspreis und Preisstand werden getrennt sichtbar."),
            ("Verfügbarkeit", "Verfügbar, reserviert, verkauft, blockiert und Prüfung offen sind klare Zustände."),
            ("Vergleich", "1+1, 2+1 Gartenwohnung, Penthouse und Spezialfälle werden vergleichbar."),
            ("Importkontrolle", "Excel- oder Quellenimporte werden geprüft, bevor sie live gehen."),
        ],
        ["Daten importieren.", "Warnungen prüfen.", "Preise und Verfügbarkeit freigeben.", "Berater nutzt die Matrix.", "Änderungen werden protokolliert."],
        ["Kein Preis ohne Datum und Quelle.", "Verkaufte oder reservierte Einheiten dürfen nicht aktiv angeboten werden.", "Manuelle Preisänderungen brauchen Freigabe."],
        "Daire Matrisi, Importprüfung und Demo-Einheiten sind vorhanden.",
        ["Echte New-Level-Liste fehlt.", "Preisquellen und Anbieter-Codes fehlen.", "Reservierungs- und Verkaufsstatus sind noch Demo-Daten."],
        ["Einheitenliste ist vollständig.", "Preisstand ist nachvollziehbar.", "Importfehler werden vor Freigabe blockiert.", "Berater kann in unter 30 Sekunden filtern."],
        "AI kann Dubletten, Preisabweichungen und ungewöhnliche Änderungen markieren.",
    ),
    Stream(
        5,
        "Projektstory, Exposé und Präsentation",
        "Marketing, Vertrieb, Management",
        "Das CRM liefert eine konsistente, überzeugende Projektstory für New Level Premium, ohne dass jeder Berater eigene Texte erfinden muss.",
        [
            ("Projektargumente", "Incekum, Natur, Hotelservice, Privatstrand, 52.000 m2, Sportflächen und Investmentlogik werden in klare Aussagen übersetzt."),
            ("Exposé-Bausteine", "Kurze Textbausteine, lange Beschreibung, Standorttext und Vorteilsliste sind getrennt pflegbar."),
            ("Bilder und Medien", "Bilder, Videos, 3D-Rundgänge und Quellenlinks werden dem Projekt zugeordnet."),
            ("Zielgruppen", "Familie, Investor, Ferienkäufer, Daueraufenthalt und Staatsbürgerschaftsinteresse erhalten passende Darstellung."),
            ("Freigabe", "Marketingtexte werden erst nach fachlicher Prüfung aktiv genutzt."),
        ],
        ["Projekttext erstellen.", "Quelle und Zielgruppe zuordnen.", "Management prüft.", "Berater nutzt Baustein.", "Kundenreaktion wird gemessen."],
        ["Keine übertriebene Renditegarantie ohne schriftliche Quelle.", "Bilder werden mit Nutzungsrecht geprüft.", "Sprachversionen müssen inhaltlich gleichwertig sein."],
        "Dashboard und Pitch sind Ataberk-branded; Exposé-Builder fehlt.",
        ["Kein Exposé-Modul.", "Keine Medienfreigabe.", "Keine Versionierung von Verkaufstexten."],
        ["Projektseite im CRM ist vollständig.", "Texte sind freigegeben.", "Berater kann PDF/Link senden.", "Management sieht Nutzung und Wirkung."],
        "AI kann aus freigegebenen Fakten zielgruppengerechte Texte entwerfen, die vor Nutzung geprüft werden.",
    ),
    Stream(
        6,
        "Besichtigung, Online-Tour und Terminsteuerung",
        "Vertrieb, Kundenbetreuung, Außendienst",
        "Käufer erhalten schnelle, gut organisierte Besichtigungen vor Ort oder online, inklusive Follow-up und Verantwortlichkeit.",
        [
            ("Terminarten", "Rückruf, Online-Tour, Projektbesichtigung, Dokumenttermin und Nachfassgespräch werden getrennt geführt."),
            ("Vorbereitung", "Berater sieht Lead-Ziel, Sprache, Wunschwohnung, offene Dokumente und Fragen vor dem Termin."),
            ("Online-Tour", "Links, Medien, Notizen und Ergebnis werden dokumentiert."),
            ("Vor-Ort-Prozess", "Transfer, Ansprechpartner und Besichtigungsroute werden geplant."),
            ("Follow-up", "Nach jedem Termin gibt es nächste Aktion, Frist und Verantwortlichen."),
        ],
        ["Termin buchen.", "Vorbereitung prüfen.", "Besichtigung durchführen.", "Ergebnis dokumentieren.", "Follow-up starten."],
        ["Kein Termin ohne Verantwortlichen.", "Kein Follow-up ohne Frist.", "Verlorene Leads brauchen Grund."],
        "Kalender und Buchungslogik sind vorhanden, aber stärker auf Wohn-/Gästeprozess als Verkaufstouren ausgerichtet.",
        ["Online-Tour-Modul fehlt.", "Transfer- und Besichtigungsroute fehlen.", "Follow-up-Automation ist noch nicht vollständig."],
        ["Jeder Termin ist sichtbar.", "Berater hat Vorbereitung auf einer Seite.", "Nachfassaufgaben entstehen automatisch.", "Management sieht No-Shows."],
        "AI kann Terminzusammenfassungen und Follow-up-Entwürfe erstellen.",
    ),
    Stream(
        7,
        "Finanzplan, Raten und Zahlungsverfolgung",
        "Finanzen, Vertrieb, Management",
        "Käufer, Berater und Management sehen jederzeit, welcher Betrag bezahlt wurde, was offen ist und welche Rate als nächstes kommt.",
        [
            ("Anzahlung", "Reservierungszahlung und Anzahlung werden getrennt geführt."),
            ("0%-Ratenplan", "Restzahlung bis Fertigstellung wird mit Fälligkeiten und Status geplant."),
            ("Währungen", "EUR, TRY und USD werden getrennt, mit sichtbarem Wechselkursstand geführt."),
            ("Provisionssicht", "Agenturprovision, Verkäuferprovision und interne Freigabe werden nachvollziehbar."),
            ("Warnungen", "Überfällige Zahlungen, falsche Beträge und nicht zugeordnete Zahlungen werden markiert."),
        ],
        ["Deal anlegen.", "Zahlungsplan erzeugen.", "Zahlung erfassen.", "Finanzteam prüft.", "Freigabe oder Mahnung starten."],
        ["Keine Schlüssel-/TAPU-Freigabe ohne Zahlungsprüfung.", "Manuelle Zahlungsänderungen brauchen Vier-Augen-Prinzip.", "Wechselkurse müssen dokumentiert werden."],
        "Finanzmodul für Aidat, Schulden und Cashflow existiert.",
        ["Käufer-Ratenplan fehlt.", "Mehrwährung und Deal-Zahlungen fehlen.", "Provisions- und Reservierungslogik fehlen."],
        ["Jeder Deal hat Zahlungsplan.", "Überfällige Raten sind sichtbar.", "Freigaben sind protokolliert.", "Management sieht Zahlungsausfallrisiko."],
        "AI kann Zahlungsrisiken erklären, Erinnerungen vorschlagen und offene Beträge zusammenfassen.",
    ),
    Stream(
        8,
        "Dokumente, TAPU und rechtliche Checklisten",
        "Backoffice, Recht, Vertrieb",
        "Alle kaufrelevanten Unterlagen sind vollständig, geprüft und im richtigen Status, bevor ein Deal weitergeht.",
        [
            ("Käuferakte", "Pass, Steuernummer, Adresse, Kontaktdaten, KYC und Vollmachten werden gesammelt."),
            ("Objektakte", "TAPU, Projektunterlagen, Baugenehmigung, DASK, EIDS/Inseratserlaubnis und Anbieterunterlagen werden getrennt geführt."),
            ("Vertragsakte", "Reservierung, Kaufvertrag, Zahlungsplan, Provisionsvereinbarung und Nachträge erhalten Status."),
            ("Prüfstatus", "Fehlt, hochgeladen, geprüft, abgelehnt und abgelaufen sind klare Zustände."),
            ("Freigabe", "Kritische Schritte brauchen Manager- oder Rechtsfreigabe."),
        ],
        ["Dokument anfordern.", "Dokument hochladen.", "Prüfung durchführen.", "Fehler korrigieren.", "Deal freigeben."],
        ["Keine Vertragsfreigabe bei fehlender Käuferidentität.", "Keine Preis- oder Zahlungszusage ohne Dokumentstatus.", "Sensible Dokumente sind rollenbeschränkt."],
        "Dokumentenmodul existiert mit Status und Aufbewahrung.",
        ["Kaufakte ist noch nicht vollständig modelliert.", "EIDS, KYC und TAPU-Checklisten fehlen als eigene Pflichtlisten.", "Echte Freigabeketten fehlen."],
        ["Kaufakte zeigt Ampelstatus.", "Fehlende Dokumente werden automatisch angefordert.", "Freigaben sind nachvollziehbar.", "Export ist managementtauglich."],
        "AI kann Dokumentlisten erklären und fehlende Unterlagen in einfacher Sprache zusammenfassen.",
    ),
    Stream(
        9,
        "Aufenthalt, Staatsbürgerschaft und Käufer-Eignung",
        "Vertrieb, Rechtspartner, Management",
        "Käufer erhalten eine klare Vorprüfung, ob die gewünschte Einheit grundsätzlich zu Aufenthalt, Staatsbürgerschaft oder Investmentziel passt.",
        [
            ("Zielprüfung", "Aufenthalt, Staatsbürgerschaft, Investment und Feriennutzung werden getrennt bewertet."),
            ("Wertgrenzen", "Kaufpreis, Gutachtenwert und rechtliche Schwellen werden als Prüfpunkt geführt."),
            ("Stadtteilstatus", "Regionale Einschränkungen oder Quoten werden als Prüfung offen markiert."),
            ("Dokumentliste", "Benötigte Dokumente werden je Ziel automatisch vorgeschlagen."),
            ("Haftungsschutz", "Das System gibt Vorprüfung, keine Rechtsgarantie."),
        ],
        ["Käuferziel wählen.", "Preis und Einheit prüfen.", "Dokumentliste erzeugen.", "Rechtspartner prüfen lassen.", "Ergebnis speichern."],
        ["Keine Garantieformulierung ohne Anwalt/Fachpartner.", "Unklare Fälle werden als Prüfung offen markiert.", "Berater sieht Haftungshinweis."],
        "Roadmap erwähnt Eligibility, aber UI-Modul ist noch nicht umgesetzt.",
        ["Kein Rechner.", "Keine Stadtteil-/Quotenlogik.", "Keine Dokumentliste pro Ziel."],
        ["Käuferziel ist sichtbar.", "Vorprüfung hat Status.", "Haftungstext ist klar.", "Fachpartnerfreigabe kann dokumentiert werden."],
        "AI kann Fragen erklären, darf aber keine rechtliche Entscheidung automatisch treffen.",
    ),
    Stream(
        10,
        "Eigentümer-Rezeption und Hotelservice",
        "After-Sales, Hotelservice, Eigentümerbetreuung",
        "Nach dem Kauf erleben Eigentümer die versprochene Premium-Betreuung: Rezeption, technische Hilfe, Hotelvorteile und transparente Anliegen.",
        [
            ("Eigentümerprofil", "Jede Einheit hat Eigentümer, Rechte, Kontaktwege, Sprache und Servicepräferenzen."),
            ("Rezeption", "Alltägliche und technische Anliegen landen in einer Servicewarteschlange."),
            ("Hotelvorteile", "Spa, Fitness, Restaurants, Bars und mögliche Rabatte werden als Rechte oder Hinweise geführt."),
            ("Kommunikation", "Antworten bleiben in einer Historie statt in Einzelchats verloren zu gehen."),
            ("Servicequalität", "SLA, Zufriedenheit und Wiederholungsprobleme werden gemessen."),
        ],
        ["Eigentümer meldet Anliegen.", "Rezeption erfasst es.", "Kategorie und Priorität werden gesetzt.", "Team bearbeitet.", "Eigentümer erhält Ergebnis."],
        ["Jedes Anliegen braucht Kategorie, Besitzer und Status.", "Kostenpflichtige Arbeiten brauchen Freigabe.", "Rabatte und Rechte müssen bestätigt sein."],
        "Service-Tickets existieren, aber ohne Hotel-/Rezeptionsrechte.",
        ["Eigentümer-Rezeption fehlt.", "Hotelvorteile fehlen.", "Rabatt- und Nutzungsrechte fehlen."],
        ["Eigentümer kann Anliegen nachvollziehen.", "Rezeption sieht offene Fälle.", "Hotelservice ist kategorisiert.", "Management sieht Servicequalität."],
        "AI kann Anliegen zusammenfassen, priorisieren und passende Antwortvorlagen vorschlagen.",
    ),
    Stream(
        11,
        "Wartung, Dienstleister und Kostenkontrolle",
        "Technik, Einkauf, Finanzen, Management",
        "Technische Probleme werden schnell gelöst, mit Bildern dokumentiert und finanziell kontrolliert.",
        [
            ("Ticketarten", "Wohnung, Gemeinschaftsbereich, Hotelbereich, Strandservice, Shuttle und Sicherheit werden getrennt."),
            ("Mediennachweis", "Vorher-/Nachher-Bilder, Rechnungen und Freigaben hängen am Ticket."),
            ("Dienstleister", "Interne Techniker und externe Partner erhalten Aufgaben und Fristen."),
            ("Kostenfreigabe", "Kleine, mittlere und große Kosten haben unterschiedliche Freigaberegeln."),
            ("Eigentümerbericht", "Eigentümer erhalten verständliche Zusammenfassung statt Chat-Chaos."),
        ],
        ["Ticket öffnen.", "Beweisbilder erfassen.", "Kosten schätzen.", "Freigabe einholen.", "Arbeit abschließen und berichten."],
        ["Kein kostenpflichtiger Auftrag ohne Freigabe.", "Kritische Sicherheitstickets haben Vorrang.", "Abschluss braucht Beleg oder Kommentar."],
        "Ticketmodul mit SLA, Kosten, Medienanzahl und Status existiert.",
        ["Dienstleisterdaten fehlen.", "Vorher-/Nachher-Galerie fehlt.", "Kostenfreigabe ist noch nicht fein genug."],
        ["Ticket hat Belege.", "Kostenfreigabe ist sichtbar.", "SLA ist messbar.", "Eigentümerbericht kann erzeugt werden."],
        "AI kann ähnliche Tickets erkennen, Standardantworten vorschlagen und Kostenauffälligkeiten markieren.",
    ),
    Stream(
        12,
        "Strand, Shuttle und Freizeitangebote",
        "Hotelservice, Operations, Eigentümerbetreuung",
        "Die besonderen Projektversprechen wie Privatstrand, Beachclub, Shuttle, Wasserpark, Sport und Kinderangebote werden organisatorisch steuerbar.",
        [
            ("Strandzugang", "Beachclub, Liegen, Schirme und Strandservice werden als Servicebereich geführt."),
            ("Shuttle", "Fahrten zum Strand und Zentrum werden planbar und kommunizierbar."),
            ("Freizeitflächen", "Tennis, Basketball, Volleyball, Minigolf, Wasserpark, Kino und Amphitheater werden als nutzbare Bereiche geführt."),
            ("Störungen", "Ausfall von Shuttle, Pool oder Sportbereich wird als Servicefall mit Auswirkung sichtbar."),
            ("Saisonlogik", "Hochsaison, Auslastung und Verfügbarkeit werden berücksichtigt."),
        ],
        ["Angebot oder Störung erfassen.", "Betroffene Eigentümer/Gäste identifizieren.", "Information senden.", "Team beauftragen.", "Status schließen."],
        ["Sicherheitsrelevante Freizeitflächen dürfen nicht ohne Prüfung freigegeben werden.", "Saisonhinweise müssen aktuell sein.", "Shuttlezeiten brauchen Verantwortlichen."],
        "Aktuelle App hat allgemeine Buchungen und Tickets, aber keine Amenity-Steuerung.",
        ["Beachclub/Shuttle fehlen.", "Freizeitflächen fehlen.", "Saison- und Kapazitätslogik fehlen."],
        ["Servicebereiche sind im System.", "Shuttleinformation ist sichtbar.", "Störungen erzeugen Benachrichtigung.", "Management sieht Auslastung."],
        "AI kann Auswirkungen einer Störung erklären und Nachrichtenvorlagen für Eigentümer und Gäste erzeugen.",
    ),
    Stream(
        13,
        "Vermietung, Rendite und Investorenservice",
        "Investment-Team, Vermietungsmanagement, Finanzen",
        "Investoren sehen nicht nur den Kaufpreis, sondern auch Mietpotenzial, Vermietungsstatus, Einnahmen, Kosten und Berichte.",
        [
            ("Vermietungsfreigabe", "Eigentümer legt fest, ob und wann die Wohnung vermietet werden darf."),
            ("Kalender", "Eigennutzung, Vermietung, Sperrzeiten und Reinigung werden zusammengeführt."),
            ("Einnahmen", "Mieteinnahmen, Provision, Reinigung, Wartung und Auszahlungen werden transparent."),
            ("Portale", "Booking, Airbnb oder direkte Buchungen werden später anschließbar geplant."),
            ("Investorbericht", "Monatlicher Report zeigt Auslastung, Einnahmen, Kosten und offene Aufgaben."),
        ],
        ["Eigentümer freigibt Vermietung.", "Kalender wird gepflegt.", "Buchung kommt rein.", "Aufenthalt wird abgewickelt.", "Abrechnung und Bericht werden erstellt."],
        ["Keine Vermietung ohne Eigentümerfreigabe.", "Kurzzeitvermietung braucht Compliance-Prüfung.", "Auszahlung braucht geprüfte Abrechnung."],
        "Buchungen und Deposits existieren in der App.",
        ["Eigentümer-Freigabe zur Vermietung fehlt.", "Channel-Sync fehlt.", "Investorbericht und Mietrendite fehlen."],
        ["Vermietungsstatus je Einheit ist sichtbar.", "Eigennutzung blockiert Kalender.", "Einnahmen/Kosten sind nachvollziehbar.", "Eigentümerbericht ist verständlich."],
        "AI kann Monatsberichte zusammenfassen und Investorenfragen beantworten, solange Daten geprüft sind.",
    ),
    Stream(
        14,
        "Management-Reporting, AI und Kontrolle",
        "Management, Teamleitung, Qualität",
        "Führungskräfte sehen Risiken, Fortschritt, Umsatz, Servicequalität und offene Entscheidungen ohne Tabellenchaos.",
        [
            ("Management-Cockpit", "Leads, Verkäufe, Zahlungen, Servicefälle, Dokumente und Vermietung werden in einer Übersicht zusammengeführt."),
            ("Risikokarten", "Überfällige Zahlungen, fehlende Dokumente, langsame Leads und Service-SLA werden sichtbar."),
            ("AI-Empfehlungen", "AI priorisiert, erklärt und schlägt Aktionen vor, entscheidet aber nicht allein."),
            ("Prüfspuren", "Sensible Änderungen werden protokolliert."),
            ("Qualitätsrunde", "Wöchentliche Review-Ansicht für Teamleiter."),
        ],
        ["Daten laufen zusammen.", "Risiken werden priorisiert.", "Team entscheidet.", "Aktion wird ausgeführt.", "Ergebnis fließt in Bericht."],
        ["AI darf keine Zahlung, Sperre oder Rechtsaussage allein auslösen.", "Jede sensible Aktion braucht Verantwortlichen.", "Berichte müssen Quelle und Aktualität zeigen."],
        "Dashboard, Berichte, AI-Assistent und Audit sind vorhanden.",
        ["Projekt- und Deal-spezifische Reportings fehlen.", "AI-Empfehlungen sind noch nicht vollständig quellengebunden.", "Wochenreview fehlt."],
        ["Management sieht Top-Risiken.", "AI-Hinweise sind erklärbar.", "Aktionen sind nachverfolgbar.", "Berichte sind exportierbar."],
        "AI ist die Assistenzschicht für Zusammenfassung, Priorisierung und Textentwurf, mit menschlicher Freigabe.",
    ),
    Stream(
        15,
        "Einführung, Schulung und spätere Generalisierung",
        "Projektleitung, Management, Fachbereiche",
        "Die Ataberk-Version geht kontrolliert live und bleibt so gebaut, dass spätere Projekte und Kunden ohne Neuanfang ergänzt werden.",
        [
            ("Pilotbetrieb", "Zuerst New Level Premium mit echten Daten, Rollen und klaren Erfolgskriterien."),
            ("Schulung", "Management, Vertrieb, Finanzen, Backoffice, Service und Hotelteam erhalten kurze Rollenanleitungen."),
            ("Datenabnahme", "Einheiten, Preise, Quellen, Dokumenttypen und Rollen werden vor Livegang abgenommen."),
            ("Feedback", "Tägliche Feedbackrunde in der Startphase."),
            ("Generalisierung", "Projektlogik wird später für weitere Standorte und Unternehmen erweitert."),
        ],
        ["Pilotdaten laden.", "Rollen schulen.", "UAT durchführen.", "Feedback priorisieren.", "Livegang und Ausbau planen."],
        ["Kein Livegang ohne Datenabnahme.", "Jede Rolle braucht Schulungsnachweis.", "Änderungen nach Livegang laufen über kontrollierte Liste."],
        "Phasen 2 bis 5 sind dokumentiert und browsergeprüft.",
        ["Ein einziger Masterplan fehlte bisher.", "100-Seiten-Gesamtguide fehlte.", "UAT-Skripte pro Rolle müssen noch ergänzt werden."],
        ["Masterdokument ist freigegeben.", "Rollen können Kernprozesse erklären.", "Pilotdaten sind bestätigt.", "Roadmap für nächste Module ist klar."],
        "AI kann Schulungsfragen beantworten, darf aber Prozessfreigaben nicht ersetzen.",
    ),
]


IMAGES = [
    ImageItem(BUSINESS_ASSETS / "phase-02-dashboard-command-center.png", "CRM Command Center", "Abbildung: Ataberk-spezifische Management-Übersicht mit New-Level-Kontext."),
    ImageItem(BUSINESS_ASSETS / "phase-04-unit-matrix.png", "Projekt- und Wohnungsmatrix", "Abbildung: Einheiten-, Block- und Statussicht als Grundlage für Verkauf und Betrieb."),
    ImageItem(BUSINESS_ASSETS / "phase-03-controls-overview.png", "Kontroll- und Freigabesicht", "Abbildung: Rollen, Kontrolle und Prüfspur für sensible Prozesse."),
    ImageItem(BUSINESS_ASSETS / "phase-05-role-matrix.png", "Team- und Rollenübersicht", "Abbildung: Mitarbeiter, Aufgaben und Zuständigkeiten im CRM."),
]


EXECUTIVE_DECISIONS = [
    ["Entscheidung", "Empfehlung", "Begründung"],
    ["Fokus", "New Level Premium zuerst produktionsnah fertigstellen", "Das Projekt hat konkrete Verkaufs-, Service-, Hotel- und Vermietungsversprechen. Eine generische CRM-Demo reicht dafür nicht aus."],
    ["Dokumentation", "Ein Masterdokument als zentrale Wahrheit nutzen", "Management, Vertrieb, Backoffice, Finanzen und Service brauchen eine gemeinsame Lesefassung ohne widersprüchliche Unterlagen."],
    ["Umsetzung", "15 klar getrennte Business-Streams liefern", "Die Anforderungen sind zu groß für grobe Phasen. Jede Phase braucht eigene Ziele, Rollen, Regeln, Daten und Abnahmekriterien."],
    ["AI", "AI als Assistenz mit menschlicher Freigabe einsetzen", "AI soll priorisieren, zusammenfassen und Texte vorbereiten. Rechtliche, finanzielle und verkaufsrelevante Entscheidungen bleiben beim Menschen."],
    ["Go-live", "Pilot mit echten New-Level-Daten und echten Rollen starten", "Erst reale Einheiten, Preise, Dokumente, Rechte, Zahlungen und Servicefälle zeigen, ob das System fachlich belastbar ist."],
]


TARGET_OPERATING_MODEL = [
    ["Baustein", "Was er fachlich bedeutet", "Warum er für New Level Premium wichtig ist"],
    ["Verkauf", "Leads, Beratung, Einheiten, Preise, Reservierung und Follow-up sind ein zusammenhängender Ablauf.", "Interessenten entscheiden schnell. Jede Verzögerung, falsche Preisinfo oder fehlende Antwort kostet Abschlusschance."],
    ["Kaufabwicklung", "Dokumente, TAPU, KYC, Zahlungsplan, Vertrag und Freigaben sind als Kaufakte sichtbar.", "Internationale Käufer brauchen Vertrauen, Nachvollziehbarkeit und klare nächste Schritte."],
    ["Eigentümerbetreuung", "Nach dem Kauf entsteht ein eigener Serviceprozess mit Rezeption, Wartung, Hotelrechten und Kommunikation.", "Das 5-Sterne-Versprechen endet nicht beim Verkauf. Es wird im Alltag des Eigentümers bewiesen."],
    ["Hotel- und Freizeitbetrieb", "Strand, Shuttle, Spa, Fitness, Restaurant, Beachclub und Freizeitflächen werden als steuerbare Servicebereiche behandelt.", "Die öffentlichen Projektversprechen müssen später operativ betreut und erklärt werden können."],
    ["Vermietung", "Eigentümerfreigabe, Kalender, Einnahmen, Kosten, Auszahlungen und Investorenberichte werden verbunden.", "Mietpotenzial ist ein Kernargument für Investoren und darf nicht nur als Verkaufssatz existieren."],
    ["Management", "Risiken, Zahlungsausfälle, fehlende Dokumente, offene Leads, Servicequalität und AI-Hinweise werden gebündelt.", "Führung braucht wenige, klare Signale statt verstreuter Tabellen und Chatverläufe."],
]


STAKEHOLDER_MAP = [
    ["Rolle", "Was diese Rolle im System sehen muss", "Typische Entscheidung"],
    ["Geschäftsführung", "Umsatzpipeline, Abschlusswahrscheinlichkeit, Zahlungsrisiken, Servicequalität und offene Managementfreigaben.", "Wird priorisiert, gestoppt, freigegeben oder eskaliert?"],
    ["Vertriebsleitung", "Lead-Reaktionszeit, Beraterleistung, Einheitenverfügbarkeit, Reservierungen und verlorene Chancen.", "Welcher Lead braucht sofortige Aufmerksamkeit und welche Einheit passt wirklich?"],
    ["Berater", "Leadprofil, Sprache, Budget, Käuferziel, passende Einheiten, Projektargumente und nächster Schritt.", "Welche Antwort sende ich jetzt und was ist der sauberste nächste Schritt?"],
    ["Backoffice", "Kaufakte, Dokumentstatus, fehlende Unterlagen, TAPU/KYC/EIDS, Vertragsstatus und Freigaben.", "Ist der Deal vollständig genug für den nächsten Prozessschritt?"],
    ["Finanzen", "Anzahlungen, Ratenplan, offene Beträge, Währung, Provisionen, Auszahlungen und Mahnstatus.", "Ist die Zahlung korrekt, überfällig oder freigabepflichtig?"],
    ["Rezeption und Service", "Eigentümeranliegen, Hotelrechte, Wartungstickets, Shuttle/Strandservice, SLA und Kommunikationshistorie.", "Wer bearbeitet den Fall, bis wann, mit welchen Kosten und welcher Antwort?"],
    ["Eigentümer", "Eigene Einheit, Dokumente, Zahlungen, Servicefälle, Vermietungsfreigabe, Einnahmen und offene Anliegen.", "Was ist erledigt, was ist offen und was muss ich freigeben?"],
]


CONSULTANT_QUALITY_GATES = [
    "Jeder Prozess hat einen klaren Start, einen eindeutigen Status, einen Verantwortlichen und ein messbares Ende.",
    "Jede geschäftskritische Entscheidung ist durch Rollen, Freigabe und Prüfspur abgesichert.",
    "Jede Aussage gegenüber Käufer oder Eigentümer ist entweder quellenbasiert, intern freigegeben oder als Prüfung offen markiert.",
    "Jede Phase ist so formuliert, dass ein nicht-technischer Fachbereich sie erklären und abnehmen kann.",
    "AI hilft beim Denken und Schreiben, ersetzt aber keine rechtliche, finanzielle oder geschäftliche Verantwortung.",
]


PHASE_DETAIL = {
    1: {
        "scenario": "Ein Berater sieht auf einer Fremdseite einen neuen Preis oder eine andere Blockanzahl. Statt diese Information sofort zu verwenden, wird sie als Quelle erfasst, mit Datum versehen und gegen bestehende Fakten geprüft. Das Management entscheidet, ob die Aussage freigegeben, korrigiert oder als offen markiert wird.",
        "kpis": [("Freigegebene Quellen", "Anteil der Projektinformationen mit geprüfter Quelle."), ("Offene Widersprüche", "Anzahl widersprüchlicher Angaben, die noch vom Kunden bestätigt werden müssen."), ("Nutzbare Verkaufsargumente", "Anzahl freigegebener Argumente pro Zielgruppe und Sprache.")],
        "objects": ["Quelle", "Projektfakt", "Widerspruch", "Freigabe", "Verkaufsargument"],
    },
    2: {
        "scenario": "Ein Interessent schreibt über WhatsApp wegen einer 1+1 Wohnung. Das System erkennt Quelle, Sprache, Budget und Dringlichkeit, weist den Lead einem Berater zu und startet eine Reaktionsfrist. Wenn keine Antwort erfolgt, sieht die Teamleitung den Fall sofort.",
        "kpis": [("Erstreaktionszeit", "Zeit von Eingang bis erster qualifizierter Antwort."), ("Kontaktquote", "Anteil erreichter Leads nach Kanal."), ("Verlorene Leads mit Grund", "Anteil sauber abgeschlossener, nicht konvertierter Leads.")],
        "objects": ["Lead", "Kontaktkanal", "Berater", "Reaktionsfrist", "Follow-up"],
    },
    3: {
        "scenario": "Ein russischsprachiger Käufer interessiert sich für Vermietung und Aufenthalt. Der Berater sieht Sprache, Ziel, Budget und offene Fragen auf einer Seite. Unsichere Aussagen zu Aufenthalt oder Staatsbürgerschaft werden nicht versprochen, sondern als Prüfung an einen Fachpartner markiert.",
        "kpis": [("Qualifizierte Leads", "Leads mit Ziel, Budget, Sprache und nächstem Schritt."), ("Vorlagenabdeckung", "Vorhandene Antwortvorlagen je Sprache und Käuferziel."), ("Offene Prüffragen", "Rechtliche oder finanzielle Punkte, die noch geklärt werden müssen.")],
        "objects": ["Käuferprofil", "Sprache", "Käuferziel", "Einwand", "Beratungsnotiz"],
    },
    4: {
        "scenario": "Eine Preisliste wird vom Kunden geliefert. Das System erkennt fehlende Etagen, doppelte Wohnungsnummern, unklare Preise und widersprüchliche Status. Erst nach Freigabe kann der Vertrieb die Einheiten aktiv anbieten.",
        "kpis": [("Datenqualität", "Anteil vollständiger Einheiten ohne Warnung."), ("Preisaktualität", "Alter des letzten geprüften Preisstands."), ("Reservierungsfehler", "Versuche, bereits reservierte oder verkaufte Einheiten anzubieten.")],
        "objects": ["Einheit", "Block", "Etage", "Preis", "Verfügbarkeit", "Importwarnung"],
    },
    5: {
        "scenario": "Marketing erstellt eine deutsche Projektbeschreibung für Investoren. AI darf einen Entwurf auf Basis freigegebener Fakten erstellen, aber Management prüft Aussagen zu Rendite, Hotelservice und Privatstrand, bevor der Text an Kunden geht.",
        "kpis": [("Freigegebene Textbausteine", "Anzahl nutzbarer Texte nach Sprache und Zielgruppe."), ("Medienfreigabe", "Anteil geprüfter Bilder, Videos und 3D-Inhalte."), ("Nutzung im Vertrieb", "Wie oft Berater freigegebene Materialien verwenden.")],
        "objects": ["Projekttext", "Exposé", "Bild", "Zielgruppe", "Freigabestatus"],
    },
    6: {
        "scenario": "Ein Interessent bucht eine Online-Tour. Der Berater sieht vorher Wunschwohnung, Sprache, Budget und offene Fragen. Nach dem Termin wird das Ergebnis dokumentiert, ein Exposé gesendet und automatisch ein Nachfasstermin gesetzt.",
        "kpis": [("Terminquote", "Anteil Leads mit durchgeführtem Termin."), ("No-Show-Rate", "Nicht erschienene Termine nach Kanal."), ("Follow-up-Pünktlichkeit", "Anteil rechtzeitig erledigter Nachfassaufgaben.")],
        "objects": ["Termin", "Online-Tour", "Besichtigungsnotiz", "Follow-up", "No-Show-Grund"],
    },
    7: {
        "scenario": "Ein Käufer wählt eine Einheit mit 35 Prozent Anzahlung und Raten bis Fertigstellung. Das System erzeugt den Zahlungsplan, zeigt Fälligkeiten und blockiert kritische Freigaben, wenn Zahlungen fehlen oder nicht geprüft sind.",
        "kpis": [("Offene Raten", "Summe und Anzahl überfälliger Zahlungen."), ("Zahlungszuordnung", "Anteil korrekt zugeordneter Zahlungseingänge."), ("Freigabeblockaden", "Fälle, in denen Zahlungslage nächsten Schritt verhindert.")],
        "objects": ["Deal", "Anzahlung", "Ratenplan", "Zahlung", "Mahnung", "Freigabe"],
    },
    8: {
        "scenario": "Vor Vertragsfreigabe prüft Backoffice, ob Pass, KYC, TAPU, EIDS, Reservierung, Kaufvertrag und Zahlungsplan vorhanden sind. Fehlende Dokumente erzeugen eine klare Anfrage an den Käufer oder Berater.",
        "kpis": [("Dokumentvollständigkeit", "Anteil Deals mit kompletter Pflichtakte."), ("Prüfdauer", "Zeit von Upload bis Freigabe oder Ablehnung."), ("Abgelaufene Dokumente", "Dokumente, die erneuert werden müssen.")],
        "objects": ["Kaufakte", "Dokument", "Prüfstatus", "Freigabe", "Ablaufdatum"],
    },
    9: {
        "scenario": "Ein Käufer fragt, ob die Wohnung für Aufenthalt oder Staatsbürgerschaft geeignet ist. Das System zeigt eine Vorprüfung mit klarer Unsicherheit und leitet kritische Punkte an einen Rechtspartner weiter.",
        "kpis": [("Vorprüfungen", "Anzahl Käufer mit dokumentierter Zielprüfung."), ("Fachpartner-Freigaben", "Anteil rechtlich geprüfter Sonderfälle."), ("Haftungswarnungen", "Fälle, in denen keine Garantieformulierung erlaubt ist.")],
        "objects": ["Käuferziel", "Vorprüfung", "Gutachtenwert", "Fachpartner", "Haftungshinweis"],
    },
    10: {
        "scenario": "Ein Eigentümer meldet nach dem Kauf ein technisches Anliegen an der Rezeption. Der Fall wird kategorisiert, an das richtige Team übergeben, mit SLA verfolgt und dem Eigentümer transparent zurückgemeldet.",
        "kpis": [("Service-SLA", "Anteil Anliegen innerhalb Zielzeit gelöst."), ("Offene Eigentümerfälle", "Anzahl offener Anliegen nach Priorität."), ("Zufriedenheit", "Rückmeldung nach Abschluss eines Servicefalls.")],
        "objects": ["Eigentümer", "Servicefall", "Rezeption", "Hotelrecht", "Antwort"],
    },
    11: {
        "scenario": "Eine Reparatur wird mit Fotos gemeldet. Das System fordert Kostenschätzung und Eigentümerfreigabe an, bevor ein externer Dienstleister beauftragt wird. Nach Abschluss werden Rechnung und Vorher-/Nachher-Bilder gespeichert.",
        "kpis": [("Durchlaufzeit", "Zeit von Meldung bis Abschluss."), ("Kostenfreigaben", "Anteil Tickets mit korrekter Freigabe vor Beauftragung."), ("Wiederholungsprobleme", "Häufige Mängel je Einheit oder Bereich.")],
        "objects": ["Wartungsticket", "Dienstleister", "Foto", "Kostenfreigabe", "Rechnung"],
    },
    12: {
        "scenario": "Der Shuttle zum Privatstrand fällt aus. Das System erkennt betroffene Eigentümer und Gäste, erzeugt eine Information, öffnet einen Servicefall und zeigt dem Management die Auswirkung auf das 5-Sterne-Versprechen.",
        "kpis": [("Serviceverfügbarkeit", "Verfügbarkeit von Shuttle, Strand und Freizeitbereichen."), ("Störungsdauer", "Zeit bis Wiederherstellung."), ("Kommunikationsquote", "Betroffene Personen, die informiert wurden.")],
        "objects": ["Amenity", "Shuttle", "Beachclub", "Störung", "Benachrichtigung"],
    },
    13: {
        "scenario": "Ein Eigentümer gibt seine Wohnung für Vermietung frei, blockiert aber zwei Wochen Eigennutzung. Das System verwaltet Kalender, Einnahmen, Reinigung, Kosten und Monatsbericht für den Eigentümer.",
        "kpis": [("Auslastung", "Belegte Tage je vermietbarer Einheit."), ("Nettoertrag", "Einnahmen abzüglich Kosten und Provisionen."), ("Berichtspünktlichkeit", "Monatsberichte rechtzeitig an Eigentümer.")],
        "objects": ["Vermietungsfreigabe", "Kalender", "Buchung", "Kosten", "Eigentümerbericht"],
    },
    14: {
        "scenario": "Montagmorgen sieht die Geschäftsführung die wichtigsten Risiken: heiße Leads ohne Antwort, fehlende TAPU-Dokumente, überfällige Raten, offene Eigentümerfälle und AI-Empfehlungen mit Begründung.",
        "kpis": [("Top-Risiken", "Anzahl kritischer Risiken nach Kategorie."), ("Entscheidungszeit", "Zeit bis Managementfreigabe."), ("AI-Nutzungsqualität", "AI-Vorschläge mit Quelle, Begründung und menschlicher Entscheidung.")],
        "objects": ["Managementbericht", "Risiko", "AI-Hinweis", "Freigabe", "Audit"],
    },
    15: {
        "scenario": "Vor dem Go-live arbeiten alle Rollen mit echten Daten in einem UAT-Durchlauf. Jeder Bereich bestätigt, ob Prozesse, Rollen, Daten, Dokumente und Berichte für den Pilotbetrieb reichen.",
        "kpis": [("UAT-Abdeckung", "Abgeschlossene Tests je Rolle und Prozess."), ("Schulungsstatus", "Rollen mit bestätigter Einweisung."), ("Go-live-Blocker", "Offene Punkte, die Livegang verhindern.")],
        "objects": ["Pilot", "Schulung", "UAT", "Feedback", "Go-live-Freigabe"],
    },
}


class MasterDocx:
    def __init__(self) -> None:
        self.images = [img for img in IMAGES if img.source.exists()]
        for idx, image in enumerate(self.images, start=1):
            image.rel_id = f"rIdImg{idx}"
            image.target = f"media/image{idx}.png"

    def run(self, text: str, bold: bool = False, color: str | None = None, size: int | None = None, italic: bool = False) -> str:
        props = []
        if bold:
            props.append("<w:b/>")
        if italic:
            props.append("<w:i/>")
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
        italic: bool = False,
    ) -> str:
        ppr = []
        if style:
            ppr.append(f'<w:pStyle w:val="{style}"/>')
        if align:
            ppr.append(f'<w:jc w:val="{align}"/>')
        if fill:
            ppr.append(f'<w:shd w:fill="{fill}"/>')
        ppr_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>" if ppr else ""
        return f"<w:p>{ppr_xml}{self.run(text, bold=bold, color=color, size=size, italic=italic)}</w:p>"

    def bullet(self, text: str) -> str:
        return (
            "<w:p><w:pPr><w:pStyle w:val=\"BodyText\"/><w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"1\"/></w:numPr></w:pPr>"
            f"{self.run(text)}</w:p>"
        )

    def page_break(self) -> str:
        return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

    def cell(self, content: str, width: int, fill: str | None = None) -> str:
        shd = f'<w:shd w:fill="{fill}"/>' if fill else ""
        return (
            "<w:tc>"
            f'<w:tcPr><w:tcW w:w="{width}" w:type="dxa"/><w:vAlign w:val="center"/>{shd}'
            '<w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>'
            '<w:start w:w="150" w:type="dxa"/><w:end w:w="150" w:type="dxa"/></w:tcMar></w:tcPr>'
            f"{content}</w:tc>"
        )

    def table(self, rows: list[list[str]], widths: list[int], header: bool = True, header_fill: str = "E8EEF5") -> str:
        grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
        trs = []
        for r, row in enumerate(rows):
            fill = header_fill if header and r == 0 else None
            cells = [self.cell(self.para(value, bold=(header and r == 0)), widths[i], fill=fill) for i, value in enumerate(row)]
            trs.append("<w:tr>" + "".join(cells) + "</w:tr>")
        return (
            '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/>'
            '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="DADCE0"/><w:left w:val="single" w:sz="4" w:color="DADCE0"/>'
            '<w:bottom w:val="single" w:sz="4" w:color="DADCE0"/><w:right w:val="single" w:sz="4" w:color="DADCE0"/>'
            '<w:insideH w:val="single" w:sz="4" w:color="DADCE0"/><w:insideV w:val="single" w:sz="4" w:color="DADCE0"/></w:tblBorders></w:tblPr>'
            f"<w:tblGrid>{grid}</w:tblGrid>{''.join(trs)}</w:tbl>"
        )

    def callout(self, title: str, text: str, fill: str = "ECFDF3") -> str:
        return self.table([[title, text]], [2200, 7160], header=False, header_fill=fill).replace("<w:tcPr>", f'<w:tcPr><w:shd w:fill="{fill}"/>', 1)

    def image(self, image: ImageItem, max_width_in: float = 6.2, max_height_in: float = 3.7) -> str:
        width_px, height_px = png_size(image.source)
        scale = min(max_width_in / width_px, max_height_in / height_px)
        width_emu = int(width_px * scale * 914400)
        height_emu = int(height_px * scale * 914400)
        return f"""
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing>
<wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">
<wp:extent cx="{width_emu}" cy="{height_emu}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>
<wp:docPr id="{esc(image.rel_id.replace('rIdImg', ''))}" name="{esc(image.title)}" descr="{esc(image.caption)}"/>
<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>
<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:nvPicPr><pic:cNvPr id="{esc(image.rel_id.replace('rIdImg', ''))}" name="{esc(image.title)}" descr="{esc(image.caption)}"/><pic:cNvPicPr/></pic:nvPicPr>
<pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="{image.rel_id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{width_emu}" cy="{height_emu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
</pic:pic></a:graphicData></a:graphic>
</wp:inline></w:drawing></w:r></w:p>
{self.para(image.caption, style="Caption", align="center")}
"""

    def phase_mindmap(self, stream: Stream) -> str:
        rows = [
            [stream.subthemes[0][0], stream.subthemes[1][0], stream.subthemes[2][0]],
            [stream.subthemes[3][0], f"Phase {stream.number}: {stream.title}", stream.subthemes[4][0]],
            ["Regeln", "AI-Unterstützung", "Abnahmekriterien"],
        ]
        fills = [["DBEAFE", "D1FAE5", "FEF3C7"], ["F3E8FF", "E0F2FE", "FFE4E6"], ["F8FAFC", "ECFDF3", "F8FAFC"]]
        trs = []
        for r, row in enumerate(rows):
            cells = []
            for c, value in enumerate(row):
                cells.append(self.cell(self.para(value, align="center", bold=True), 3120, fills[r][c]))
            trs.append("<w:tr>" + "".join(cells) + "</w:tr>")
        return (
            '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/>'
            '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:color="CBD5E1"/>'
            '<w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:color="CBD5E1"/>'
            '<w:insideH w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideV w:val="single" w:sz="4" w:color="CBD5E1"/></w:tblBorders></w:tblPr>'
            '<w:tblGrid><w:gridCol w:w="3120"/><w:gridCol w:w="3120"/><w:gridCol w:w="3120"/></w:tblGrid>'
            + "".join(trs)
            + "</w:tbl>"
        )

    def page(self, parts: list[str], break_after: bool = True) -> str:
        return "".join(parts) + (self.page_break() if break_after else "")

    def phase_detail(self, stream: Stream) -> dict[str, object]:
        return PHASE_DETAIL[stream.number]

    def feature_scope_rows(self, stream: Stream) -> list[list[str]]:
        rows = [["Funktion", "Was der Nutzer sieht", "Geschäftlicher Nutzen"]]
        for title, description in stream.subthemes:
            rows.append([
                title,
                description,
                "Der Fachbereich erhält einen klaren Arbeitskontext, weniger Rückfragen und eine nachvollziehbare Entscheidung.",
            ])
        return rows

    def stakeholder_rows(self, stream: Stream) -> list[list[str]]:
        owners = [part.strip() for part in stream.business_owner.split(",")]
        rows = [["Rolle", "Verantwortung in dieser Phase", "Was nicht passieren darf"]]
        for owner in owners[:4]:
            rows.append([
                owner,
                f"{owner} sorgt dafür, dass Status, nächste Aktion und fachliche Entscheidung in Phase {stream.number} eindeutig bleiben.",
                "Entscheidungen dürfen nicht nur in Chatverläufen, Telefonnotizen oder privaten Tabellen hängen bleiben.",
            ])
        rows.append([
            "Management",
            "Management sieht Risiken, Engpässe, offene Freigaben und Abweichungen vom gewünschten Zielbild.",
            "Management darf nicht erst durch Kundenbeschwerden oder manuelle Nachfragen von Problemen erfahren.",
        ])
        rows.append([
            "AI-Assistent",
            "AI fasst zusammen, priorisiert, erkennt Muster und bereitet Texte vor. Die finale Verantwortung bleibt bei einer Person.",
            "AI darf keine rechtliche, finanzielle, vertragsbezogene oder reputationskritische Entscheidung automatisch auslösen.",
        ])
        return rows

    def decision_rows(self, stream: Stream) -> list[list[str]]:
        detail = self.phase_detail(stream)
        objects = detail["objects"]
        rows = [["Business-Objekt", "Warum es gepflegt wird", "Qualitätsregel"]]
        for item in objects:
            rows.append([
                str(item),
                f"{item} ist ein steuerbarer Bestandteil der Phase und muss für Suche, Status, Bericht und Freigabe nutzbar sein.",
                "Pflichtfelder, Quelle, Verantwortlicher und Änderungsdatum müssen sichtbar sein.",
            ])
        return rows

    def risk_rows(self, stream: Stream) -> list[list[str]]:
        rows = [["Sonderfall oder Risiko", "Empfohlene Behandlung"]]
        for rule in stream.rules:
            rows.append([rule, "Als Regel im System abbilden, damit Mitarbeitende nicht jedes Mal neu entscheiden müssen."])
        for gap in stream.missing:
            rows.append([gap, "Als Umsetzungsbedarf markieren, priorisieren und mit klarer Abnahmebedingung schließen."])
        rows.append(["Widerspruch zwischen Kunde, Quelle und System", "Nicht überschreiben. Als Prüfung offen markieren, Quelle dokumentieren und Managemententscheidung verlangen."])
        rows.append(["Dringender Kundenfall außerhalb der Standardlogik", "Eskalation mit Begründung, Frist, Verantwortlichem und nachträglicher Prüfspur erfassen."])
        return rows

    def kpi_rows(self, stream: Stream) -> list[list[str]]:
        detail = self.phase_detail(stream)
        rows = [["Kennzahl", "Bedeutung für Management", "Interpretation"]]
        for name, meaning in detail["kpis"]:
            rows.append([
                str(name),
                str(meaning),
                "Gut, wenn der Trend stabil ist und Abweichungen mit Ursache und Maßnahme erklärt werden können.",
            ])
        rows.append([
            "Offene Entscheidungen",
            "Zeigt, wie viele Fälle noch auf Freigabe, Rückmeldung oder Kundendaten warten.",
            "Kritisch, wenn offene Entscheidungen älter werden und Umsatz, Service oder Vertrauen blockieren.",
        ])
        return rows

    def acceptance_pack_rows(self, stream: Stream) -> list[list[str]]:
        rows = [["Abnahmefrage", "Erwartete Antwort"]]
        for item in stream.acceptance:
            rows.append([item, "Ja, mit echtem Beispiel, sichtbarem Status und nachvollziehbarer Verantwortlichkeit."])
        rows.append(["Kann ein neuer Mitarbeiter diese Phase ohne Spezialwissen verstehen?", "Ja, weil Ziel, Ablauf, Rollen, Regeln und Sonderfälle in normaler Sprache beschrieben sind."])
        rows.append(["Kann Management eine Entscheidung treffen?", "Ja, weil Status, Risiko, Lücke, KPI und nächster Schritt sichtbar sind."])
        return rows

    def stream_consultant_pages(self, stream: Stream) -> list[str]:
        detail = self.phase_detail(stream)
        return [
            self.page([
                self.para(f"Phase {stream.number}: Funktionsumfang in Business-Sprache", style="Heading1"),
                self.para("Diese Seite übersetzt die Funktionalität in ein Fachbereichsverständnis. Entscheidend ist nicht, ob ein Bildschirm existiert, sondern ob der Arbeitsprozess zuverlässig, verständlich und prüfbar wird.", style="BodyText"),
                self.table(self.feature_scope_rows(stream), [1900, 3960, 3500]),
                self.callout("Beraterlogik", "Eine Funktion gilt erst als fertig, wenn ein echter Nutzer sie im Alltag ohne Erklärung bedienen kann und Management das Ergebnis kontrollieren kann.", "EFF6FF"),
            ]),
            self.page([
                self.para(f"Phase {stream.number}: Rollen, Verantwortung und Übergabe", style="Heading1"),
                self.para("Viele CRM-Projekte scheitern nicht an fehlenden Masken, sondern an unklarer Verantwortung. Diese Phase braucht deshalb eine einfache Rollenlogik, klare Übergabepunkte und sichtbare Eskalation.", style="BodyText"),
                self.table(self.stakeholder_rows(stream), [1900, 4300, 3160]),
            ]),
            self.page([
                self.para(f"Phase {stream.number}: Daten, Entscheidungen und Nachweise", style="Heading1"),
                self.para("Daten werden nicht gesammelt, weil das System Felder braucht. Daten werden gesammelt, weil sie eine spätere Entscheidung, Freigabe, Kundenauskunft oder Managementauswertung tragen.", style="BodyText"),
                self.table(self.decision_rows(stream), [2100, 4200, 3060]),
                self.callout("Qualitätsregel", "Jedes wichtige Objekt braucht Quelle, Status, Verantwortlichen, Änderungsdatum und einen klaren Grund, warum es gepflegt wird.", "F8FAFC"),
            ]),
            self.page([
                self.para(f"Phase {stream.number}: Beispiel aus dem Alltag", style="Heading1"),
                self.callout("Praxisfall", str(detail["scenario"]), "ECFDF3"),
                self.para("Moment der Wahrheit", style="Heading2"),
                self.para("Der Moment der Wahrheit ist der Punkt, an dem der Kunde, Eigentümer oder Manager merkt, ob das System wirklich hilft. In dieser Phase bedeutet das: Informationen dürfen nicht gesucht, geraten oder per Chat rekonstruiert werden. Der richtige Status muss sofort sichtbar sein.", style="BodyText"),
                self.para("Was der Nutzer danach können muss", style="Heading2"),
                *[self.bullet(step) for step in stream.workflow],
            ]),
            self.page([
                self.para(f"Phase {stream.number}: Risiken, Sonderfälle und Kontrollen", style="Heading1"),
                self.para("Diese Übersicht ist bewusst streng formuliert. Sie verhindert, dass kritische Sonderfälle informell gelöst werden und später zu Umsatzverlust, Servicefrust oder Haftungsrisiko führen.", style="BodyText"),
                self.table(self.risk_rows(stream), [3600, 5760]),
            ]),
            self.page([
                self.para(f"Phase {stream.number}: Kennzahlen und Managementfragen", style="Heading1"),
                self.table(self.kpi_rows(stream), [2300, 3760, 3300]),
                self.para("Managementfragen", style="Heading2"),
                *[self.bullet(question) for question in [
                    "Welche Fälle blockieren Umsatz, Servicequalität oder Vertrauen?",
                    "Welche Entscheidung braucht heute eine Führungskraft?",
                    "Welche Lücke ist fachlich kritisch und welche ist nur kosmetisch?",
                    "Welche AI-Empfehlung ist hilfreich, aber noch nicht ausreichend belegt?",
                ]],
            ]),
            self.page([
                self.para(f"Phase {stream.number}: Abnahmepaket für Fachbereich und Management", style="Heading1"),
                self.para("Die Phase ist nicht fertig, wenn eine Demo gut aussieht. Sie ist fertig, wenn echte Rollen mit echten Beispielen arbeiten können und Management die Ergebnisse versteht.", style="BodyText"),
                self.table(self.acceptance_pack_rows(stream), [4200, 5160]),
                self.callout("C1-Anspruch", "Die Sprache muss präzise, ruhig und geschäftlich sein: keine technischen Ausreden, keine unklaren Versprechen, keine versteckten Annahmen.", "FFF7E6"),
            ]),
        ]

    def stream_pages(self, stream: Stream) -> list[str]:
        rows = [["Teilbereich", "Erklärung für Fachbereich und Management"]] + [[a, b] for a, b in stream.subthemes]
        gap_rows = [["Was ist bereits da?", stream.current_coverage]] + [[f"Lücke {idx}", item] for idx, item in enumerate(stream.missing, start=1)]
        pages = [
            self.page([
                self.para(f"Phase {stream.number}: {stream.title}", style="Heading1"),
                self.callout("Geschäftsziel", stream.purpose, "ECFDF3"),
                self.para(f"Verantwortliche Teams: {stream.business_owner}", style="BodyText", bold=True),
                self.para("Warum das wichtig ist", style="Heading2"),
                self.para(
                    "Diese Phase übersetzt das Projektversprechen in einen kontrollierten Arbeitsprozess. Sie verhindert, dass Wissen in Einzelchats, Tabellen oder einzelnen Köpfen hängen bleibt.",
                    style="BodyText",
                ),
                self.table(rows, [2300, 7060]),
            ]),
            self.page([
                self.para(f"Phase {stream.number}: Arbeitsablauf", style="Heading1"),
                self.para("Der Ablauf ist bewusst in normaler Sprache formuliert, damit Management, Vertrieb und Betrieb denselben Prozess verstehen.", style="BodyText"),
                *[self.bullet(step) for step in stream.workflow],
                self.callout("Ergebnis des Ablaufs", "Am Ende gibt es immer einen sichtbaren Status, einen Verantwortlichen und einen nächsten Schritt.", "EFF6FF"),
            ]),
            self.page([
                self.para(f"Phase {stream.number}: Mindmap", style="Heading1"),
                self.phase_mindmap(stream),
                self.para("Lesart", style="Heading2"),
                self.para("Die Mitte zeigt das Geschäftsthema. Die umliegenden Felder zeigen, welche Teams, Regeln und Kundenerlebnisse miteinander verbunden sind.", style="BodyText"),
            ]),
            self.page([
                self.para(f"Phase {stream.number}: Geschäftsregeln und Sonderfälle", style="Heading1"),
                *[self.bullet(rule) for rule in stream.rules],
                self.para("Typische Sonderfälle", style="Heading2"),
                self.para(
                    "Sonderfälle dürfen nicht als Chat-Nachricht gelöst werden. Sie brauchen Status, Begründung, Verantwortlichen und eine prüfbare Entscheidung.",
                    style="BodyText",
                ),
            ]),
            self.page([
                self.para(f"Phase {stream.number}: Umsetzungsstand heute", style="Heading1"),
                self.table(gap_rows, [2200, 7160], header=False),
                self.callout("Experteneinschätzung", "Die Basis ist brauchbar, aber diese Phase ist erst vollständig, wenn die genannten Lücken mit echten New-Level-Daten, Rollen und Freigaben geschlossen sind.", "FFF7E6"),
            ]),
            self.page([
                self.para(f"Phase {stream.number}: Abnahme und AI-Unterstützung", style="Heading1"),
                self.para("Abnahmekriterien", style="Heading2"),
                *[self.bullet(item) for item in stream.acceptance],
                self.para("Sinnvolle AI-Unterstützung", style="Heading2"),
                self.para(stream.ai_support, style="BodyText", bold=True, color="047857", fill="ECFDF3"),
            ]),
        ]
        pages.extend(self.stream_consultant_pages(stream))
        return pages

    def document_body(self) -> str:
        pages: list[str] = []
        today = "25. Juni 2026"
        pages.append(self.page([
            self.para("New Level Premium Avsallar Alanya", style="Title", align="center"),
            self.para("Business Blueprint für 1Çatı CRM", style="Subtitle", align="center"),
            self.para("Kunde: Ataberk Estate | Standort: Avsallar, Alanya | Version: Management- und Fachbereichsdokumentation", align="center", color="667085"),
            self.para(today, align="center", bold=True, color="0F766E"),
            self.callout("Zweck", "Dieses Dokument erklärt in nicht-technischer Sprache, was für das Projekt gebraucht wird, was bereits umgesetzt ist, was noch fehlt und wie die Lösung phasenweise vollständig werden soll.", "ECFDF3"),
        ]))
        pages.append(self.page([
            self.para("Kurzantwort für das Management", style="Heading1"),
            self.callout("Status heute", "Wir haben eine starke CRM-Grundlage, aber noch keine vollständige New-Level-Premium-Endlösung. Die wichtigsten CRM-, Service-, Finanz-, Dokumenten-, Rollen-, Audit- und AI-Bausteine sind vorhanden. Die projektspezifischen Hotel-, Strand-, Eigentümer-, Ratenzahlungs-, Mietverwaltungs- und Rechts-/Aufenthaltsprozesse müssen noch ergänzt werden.", "FFF7E6"),
            self.table(CURRENT_COVERAGE, [1900, 1700, 5760]),
        ]))
        pages.append(self.page([
            self.para("Executive Decision Brief", style="Heading1"),
            self.para("Diese Seite verdichtet die Managemententscheidung. Sie beantwortet nicht nur, was gebaut werden soll, sondern auch, warum es für Ataberk Estate und New Level Premium geschäftlich notwendig ist.", style="BodyText"),
            self.table(EXECUTIVE_DECISIONS, [1700, 3300, 4360]),
            self.callout("Kernbotschaft", "Das Ziel ist keine schöne CRM-Oberfläche. Das Ziel ist ein kontrollierbares Verkaufs-, Kaufabwicklungs-, Eigentümer-, Hotelservice- und Vermietungssystem für ein konkretes Premium-Projekt.", "ECFDF3"),
        ]))
        pages.append(self.page([
            self.para("Zielbild des Betriebsmodells", style="Heading1"),
            self.para("Das Betriebsmodell beschreibt, wie Vertrieb, Backoffice, Finanzen, Rezeption, Service, Vermietung und Management später zusammenarbeiten. Es ist die fachliche Brücke zwischen Kundenversprechen und täglicher Arbeit.", style="BodyText"),
            self.table(TARGET_OPERATING_MODEL, [1700, 3900, 3760]),
        ]))
        pages.append(self.page([
            self.para("Stakeholder Map", style="Heading1"),
            self.para("Jede Rolle braucht eine andere Sicht. Ein Geschäftsführer braucht Prioritäten und Risiken, ein Berater braucht nächste Aktionen, und ein Eigentümer braucht Transparenz. Das System muss diese Perspektiven trennen, ohne die gemeinsame Datenbasis zu verlieren.", style="BodyText"),
            self.table(STAKEHOLDER_MAP, [1900, 4300, 3160]),
        ]))
        pages.append(self.page([
            self.para("Qualitätsmaßstab für die gesamte Dokumentation", style="Heading1"),
            self.para("Die folgenden Prüfpunkte sind der Maßstab für den McKinsey-ähnlichen Anspruch dieser Dokumentation: klare Struktur, klare Entscheidungen, klare Verantwortlichkeit und keine unnötige technische Sprache.", style="BodyText"),
            *[self.bullet(item) for item in CONSULTANT_QUALITY_GATES],
            self.callout("Dokumentationsprinzip", "Der Leser soll nach jedem Abschnitt verstehen: was ist das Ziel, wer nutzt es, welche Entscheidung wird unterstützt, welche Risiken werden kontrolliert und woran erkennt man, dass es fertig ist.", "EFF6FF"),
        ]))
        pages.append(self.page([
            self.para("Quellenlage und Projektfakten", style="Heading1"),
            self.table([["Feld", "Aktueller fachlicher Stand"]] + PROPERTY_FACTS, [2300, 7060]),
            self.para("Hinweis", style="Heading2"),
            self.para("Wenn Quellen voneinander abweichen, wird im CRM nicht geraten. Der Wert wird als Prüfung offen markiert und muss vom Kunden oder Projektträger bestätigt werden.", style="BodyText"),
        ]))
        pages.append(self.page([
            self.para("Öffentliche Quellen und Benchmark-Hinweise", style="Heading1"),
            self.table([["Quelle", "URL", "Warum sie relevant ist"]] + [list(row) for row in SOURCES], [1800, 3300, 4260]),
        ]))
        pages.append(self.page([
            self.para("Was moderne Lösungen 2026 erwarten lassen", style="Heading1"),
            self.para("Marktführende Immobilien- und Property-Management-Systeme bündeln nicht nur Kontakte. Sie verbinden Leads, Objekte, Aufgaben, Wartung, Eigentümerkommunikation, Zahlungen, Berichte, mobile Nutzung und Automatisierung. Für New Level Premium bedeutet das: Verkauf und After-Sales dürfen nicht getrennt gebaut werden.", style="BodyText"),
            self.table([
                ["Marktstandard", "Bedeutung für New Level Premium"],
                ["Owner Portal", "Eigentümer sehen Service, Dokumente, Zahlungen, Vermietung und Berichte."],
                ["Maintenance Tracking", "Technische Anliegen werden mit Fotos, Kosten und Status bearbeitet."],
                ["AI Lead Priorisierung", "Heiße Käufer, offene Risiken und nächste Schritte werden schneller sichtbar."],
                ["Mobile/Responsive Nutzung", "Vertrieb, Rezeption und Außendienst können unterwegs arbeiten."],
                ["Reporting", "Management sieht Umsatz, Risiken, offene Aufgaben und Servicequalität."],
            ], [2600, 6760]),
        ]))
        if self.images:
            pages.append(self.page([
                self.para("Aktueller UI-Stand im CRM", style="Heading1"),
                self.image(self.images[0]),
                self.para("Lesart", style="Heading2"),
                self.para("Die Oberfläche ist bereits auf Ataberk Estate und New Level Premium ausgerichtet. Der nächste Schritt ist, die realen Projektprozesse und echten Einheiten vollständig einzubinden.", style="BodyText"),
            ]))
        pages.append(self.page([
            self.para("Betriebsmodell ohne Fachjargon", style="Heading1"),
            self.table([
                ["Ebene", "Was sie für den Betrieb bedeutet"],
                ["Kundenerlebnis", "Lead, Beratung, Exposé, Termin, Vertrag, Eigentümerbetreuung und Vermietung sollen sich wie ein Prozess anfühlen."],
                ["Geschäftsregeln", "Zahlung, Dokumente, Servicekosten, Freigaben und Rollen entscheiden, was als nächstes erlaubt ist."],
                ["Kontrolle", "Jede sensible Aktion braucht Verantwortlichen, Begründung und Prüfspur."],
                ["Datenbasis", "Einheiten, Preise, Quellen, Dokumente, Zahlungen, Servicefälle und Berichte bleiben synchron."],
            ], [2200, 7160]),
            self.callout("Leitprinzip", "Jede wichtige Entscheidung braucht Rollenprüfung, Geschäftsregel und nachvollziehbare Begründung.", "EFF6FF"),
        ]))
        if len(self.images) > 1:
            pages.append(self.page([
                self.para("Einheiten- und Projektmatrix", style="Heading1"),
                self.image(self.images[1]),
                self.para("Warum das wichtig ist", style="Heading2"),
                self.para("Bei einem Projekt mit mehreren Einheitentypen, Preisen, Etagen, Ausblicken und Verfügbarkeiten muss der Vertrieb schnell filtern können, ohne alte Tabellen zu durchsuchen.", style="BodyText"),
            ]))
        if len(self.images) > 2:
            pages.append(self.page([
                self.para("Kontroll- und Freigabelogik", style="Heading1"),
                self.image(self.images[2]),
                self.para("Warum das wichtig ist", style="Heading2"),
                self.para("Zahlungsfreigaben, Dokumentenfreigaben, Rollen und Audit sind für ausländische Käufer besonders wichtig, weil Vertrauen und Nachvollziehbarkeit kaufentscheidend sind.", style="BodyText"),
            ]))

        for stream in STREAMS:
            pages.extend(self.stream_pages(stream))

        pages.append(self.page([
            self.para("Gesamtpriorität nach Experteneinschätzung", style="Heading1"),
            self.table([
                ["Priorität", "Thema", "Warum zuerst"],
                ["1", "Echte Einheiten, Preise, Quellen und Verfügbarkeit", "Ohne reale Daten kann Vertrieb nicht belastbar arbeiten."],
                ["2", "Lead- und Kanalprozess", "Schnelle Reaktion entscheidet über Abschlusschance."],
                ["3", "Finanzplan und Dokumentenakte", "Kaufprozess braucht Vertrauen und klare Freigaben."],
                ["4", "Eigentümer-/Hotelservice", "Das 5-Sterne-Versprechen entsteht nach dem Verkauf."],
                ["5", "Vermietung und Investor Reporting", "Mietpotenzial ist ein zentrales Verkaufsargument."],
            ], [1300, 3000, 5060]),
        ]))
        pages.append(self.page([
            self.para("Was jetzt konkret zu tun ist", style="Heading1"),
            *[self.bullet(item) for item in [
                "Echte New-Level-Einheitenliste vom Kunden anfordern: Block, Etage, Nummer, Typ, Fläche, Aussicht, Preis, Status, Zahlungsplan.",
                "Freigegebene Projektbeschreibung in Deutsch, Türkisch, Englisch und Russisch erstellen.",
                "Lead-Kanäle mit WhatsApp, Telegram, Viber, Websiteformular und Telefon sauber priorisieren.",
                "Kaufakte mit TAPU, KYC, Vertrag, Zahlung, Ratenplan und EIDS/Inseratserlaubnis definieren.",
                "Eigentümer- und Hotelservice als eigene Module planen: Rezeption, Strand, Shuttle, Spa/Fitness, Wartung, Vermietung.",
                "UAT mit echten Rollen durchführen: Manager, Vertrieb, Finanzen, Backoffice, Rezeption, Technik, Vermietung.",
            ]],
        ]))
        pages.append(self.page([
            self.para("Dokumentationsstruktur ab jetzt", style="Heading1"),
            self.table([
                ["Dokumenttyp", "Ablage", "Nutzung"],
                ["Master Blueprint", "docs/client-new-level-premium", "Einzige aktive Management- und Fachbereichsdokumentation."],
                ["Alte BRD/TRD/PRD-Pakete", "docs/requirements/option-3-ai-site-crm", "Quelle und Archiv, nicht mehr primäre Lesefassung."],
                ["Phase-Dokumente", "docs/phase-delivery/de", "Detailnachweise für umgesetzte Phasen 2 bis 5."],
                ["QA und Screenshots", "quality und docs/phase-delivery/business-assets", "Nachweise für interne Prüfung und visuelle Dokumente."],
            ], [2100, 3300, 3960]),
        ]))
        pages.append(self.page([
            self.para("Abschlussbewertung", style="Heading1"),
            self.callout("Ergebnis", "Die Lösung ist auf dem richtigen Weg, aber sie muss jetzt vom allgemeinen Site-CRM zu einem echten New-Level-Premium-Verkaufs-, Eigentümer- und Hotelservice-System geschärft werden. Danach kann sie wieder als generalisierte Plattform ausgebaut werden.", "ECFDF3"),
            self.para("Empfehlung", style="Heading2"),
            self.para("Als nächstes sollten echte Projektdaten, echte Rollen, echte Dokumenttypen und reale Serviceversprechen in das System aufgenommen werden. Erst dann ist die Lösung fachlich vollständig genug für eine starke Kundendemonstration.", style="BodyText", bold=True),
        ], break_after=False))

        return "".join(pages)

    def write(self) -> pathlib.Path:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        body = self.document_body()
        document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>{body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body>
</w:document>"""
        with zipfile.ZipFile(OUT_FILE, "w", zipfile.ZIP_DEFLATED) as docx:
            for name, content in package_files(self.images, document_xml).items():
                docx.writestr(name, content)
            for image in self.images:
                docx.write(image.source, f"word/{image.target}")
        return OUT_FILE


def package_files(images: list[ImageItem], document_xml: str) -> dict[str, str]:
    return {
        "[Content_Types].xml": content_types(images),
        "_rels/.rels": package_rels(),
        "docProps/core.xml": core_props(),
        "docProps/app.xml": app_props(),
        "word/document.xml": document_xml,
        "word/_rels/document.xml.rels": document_rels(images),
        "word/styles.xml": styles_xml(),
        "word/settings.xml": settings_xml(),
        "word/numbering.xml": numbering_xml(),
    }


def content_types(images: list[ImageItem]) -> str:
    image_overrides = "".join(f'<Override PartName="/word/{esc(i.target)}" ContentType="image/png"/>' for i in images)
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
</Types>"""


def package_rels() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""


def document_rels(images: list[ImageItem]) -> str:
    rels = [
        '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
        '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
        '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    ]
    rels.extend(
        f'<Relationship Id="{image.rel_id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="{esc(image.target)}"/>'
        for image in images
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{''.join(rels)}</Relationships>"""


def styles_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="160" w:line="320" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="1F2937"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="Body Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="160" w:line="320" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/><w:color w:val="344054"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="160"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:sz w:val="52"/><w:color w:val="0B2545"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="220"/><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="30"/><w:color w:val="0F766E"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="180"/></w:pPr><w:rPr><w:b/><w:sz w:val="34"/><w:color w:val="0B2545"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="27"/><w:color w:val="0F766E"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="Caption"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="180"/></w:pPr><w:rPr><w:i/><w:sz w:val="19"/><w:color w:val="667085"/></w:rPr></w:style>
</w:styles>"""


def numbering_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>"""


def settings_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/></w:settings>"""


def core_props() -> str:
    now = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>New Level Premium CRM Business Blueprint</dc:title><dc:creator>Codex</dc:creator><cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>"""


def app_props() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Codex OOXML Builder</Application><Company>WAMOCON</Company></Properties>"""


def validate(path: pathlib.Path) -> None:
    import re
    import xml.etree.ElementTree as ET

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
        if missing:
            raise RuntimeError(f"Missing DOCX parts: {missing}")
        xml = z.read("word/document.xml").decode("utf-8")
        ET.fromstring(xml)
        text = " ".join(re.findall(r"<w:t>(.*?)</w:t>", xml))
        page_breaks = xml.count('w:type="page"')
        media = [name for name in names if name.startswith("word/media/")]
        required_terms = [
            "New Level Premium",
            "Ataberk Estate",
            "Avsallar",
            "Privatstrand",
            "Eigentümer",
            "Vermietung",
            "Ratenplan",
            "Phase 15",
        ]
        missing_terms = [term for term in required_terms if term not in text]
        if page_breaks < 99:
            raise RuntimeError(f"Expected at least 100 planned pages, found {page_breaks + 1}")
        if len(media) < 3:
            raise RuntimeError("Expected at least three embedded screenshots.")
        if missing_terms:
            raise RuntimeError(f"Missing required business terms: {missing_terms}")


def main() -> None:
    path = MasterDocx().write()
    validate(path)
    print(path)


if __name__ == "__main__":
    main()
