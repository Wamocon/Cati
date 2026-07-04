# 1Çatı ERP — Fachliches Testszenario-Drehbuch für die Demo

Stand: 2. Juli 2026
Zielgruppe: Waleri Moretz (fachlicher Tester, Kundendemo-Verantwortlicher)
Zweck: Vollständige, rollenbasierte Testszenarien für die manuelle fachliche Prüfung der 1Çatı-Demo, bevor sie einem Kunden gezeigt wird.
Grundlage: aktueller Code (`apps/web`), `docs/PROJECT-HANDBOOK.md` (Phasenwahrheit, Stand 29. Juni 2026) und die kanonische UAT-Szenarienliste in `docs/requirements/option-3-ai-site-crm/QA-UAT-Launch-Plan.md`.

---

## 0. Wie du dieses Dokument benutzt

Dieses Dokument ist so geschrieben, dass du es unverändert in **NotebookLM** hochladen und daraus ein Audio-Overview erzeugen kannst. Jedes Kapitel erklärt ein zusammenhängendes Testszenario in ganzen Sätzen: was du tust, was du dabei siehst, woran du erkennst, dass es korrekt funktioniert, und wo bewusst noch nichts Fertiges steht, weil es laut Projektplan noch nicht gebaut wurde.

Empfohlene Nutzung: Höre dir zuerst Kapitel 1 bis 3 als Überblick an, danach jeweils ein Rollenkapitel (Kapitel 4 bis 9) direkt bevor du diese Rolle im System testest. Kapitel 10 und 11 solltest du kennen, bevor du überhaupt startest, damit du unfertige Bereiche nicht fälschlich als Fehler meldest.

---

## 1. Was du hier testest

1Çatı ist ein rollenbasiertes ERP-System für die Immobilienverwaltung der New-Level-Premium-Anlage (769 Wohneinheiten, 7 Blöcke) in der Türkei. Das System unterscheidet sechs Rollen mit unterschiedlicher Sichtbarkeit und unterschiedlichen Rechten: Yönetim (Admin), Sorumlu (Manager), Muhasebe (Accountant), Personel (Staff), Malik (Owner, Eigentümer) und Kiracı (Tenant, Mieter). Jede Rolle sieht in der Seitenleiste nur die Module, für die sie freigeschaltet ist, und jedes Modul zeigt innerhalb der Seite nur die Aktionen, die diese Rolle ausführen darf. Das fachliche Testen bedeutet daher immer zweierlei: erstens prüfen, ob die sichtbaren Daten fachlich korrekt und plausibel sind, und zweitens prüfen, ob die Rolle wirklich nur das sieht und darf, was ihr laut Berechtigungsmodell zusteht.

Die Demo läuft ohne echten Login. Alle Beispieldaten sind deterministische Testdaten, keine echten Kundendaten und keine echten Zahlungen.

---

## 2. Vorbereitung: Server starten und Zugang öffnen

Bevor du testest, muss der lokale Entwicklungsserver laufen. Er wird über das Terminal mit `npm run dev` im Ordner `apps/web` gestartet und meldet in der Konsole die tatsächliche Adresse, üblicherweise `http://localhost:3000`. Falls Port 3000 belegt ist, wählt Next.js automatisch den nächsten freien Port und zeigt ihn ebenfalls in der Konsole an — schau im Zweifel dort nach, statt eine feste Portnummer anzunehmen.

Öffne im Browser die Adresse mit dem Sprachpräfix, zum Beispiel `http://localhost:3000/tr` für die türkische Landingpage. Von dort gelangst du über den Anmelden-Link zur Login-Seite unter `/tr/login`.

Auf der Login-Seite gibt es zwei Wege ins System, und beide sind für die Demo gedacht — ein echter Benutzername-Passwort-Login ist bewusst nicht aktiv:

Erstens der große Button **„Demo başlat — tam yetkili erişim"** ganz oben auf der Seite. Ein Klick darauf öffnet das System sofort mit der höchsten Rolle, Admin, und zeigt dir alle zwölf Module ohne jede Einschränkung. Das ist der schnellste Weg, dem Kunden das Gesamtsystem zu zeigen.

Zweitens, darunter, sechs einzelne Rollen-Buttons mit Icon und Beschreibung: Yönetim (Admin), Sorumlu (Manager), Muhasebe (Accountant), Personel (Staff), Malik (Owner) und Kiracı (Tenant). Jeder Klick meldet dich sofort mit genau dieser Rolle an, ohne Passwort. Diesen Weg brauchst du für alle Rollentests außer Admin, weil du damit gezielt die eingeschränkte Sicht einer bestimmten Rolle prüfst.

Die Sprache kannst du jederzeit oben rechts über den Sprachumschalter wechseln — er erscheint als Dropdown mit Globus-Symbol auf der Login-Seite und zusätzlich im Einstellungen-Modul des Dashboards, mit den vier Optionen TR, EN, DE und RU. Die Umschaltung navigiert direkt zur selben Seite in der neuen Sprache, ohne dass du dich neu anmelden musst.

Zum Abmelden nutzt du in der Dashboard-Seitenleiste beziehungsweise in der oberen Leiste den Button **„Çıkış yap"**.

---

## 3. Gesamtübersicht: Rollen und ihre Hauptszenarien

Die folgende Tabelle gibt dir den Überblick, bevor du in die Details der einzelnen Rollenkapitel gehst.

| Rolle (Login-Button) | Berechtigungsstufe | Sichtbare Module in der Seitenleiste | Kern-Testfrage |
|---|---|---|---|
| Yönetim (Admin) | Stufe 90, firmenweit | Alle zwölf Module, volle Rechte überall | Sieht und darf der Admin wirklich alles, inklusive Nutzerverwaltung und Systemeinstellungen? |
| Sorumlu (Manager) | Stufe 70, standortweit | Alle zwölf Module sichtbar, aber mit eingeschränkten Aktionen bei Finanzen, Nutzern und Einstellungen | Kann der Manager operativ alles steuern, ohne Buchhaltungs- oder Systemrechte zu haben? |
| Muhasebe (Accountant) | Stufe 60, Finanzbereich | Nur fünf Module: Anasayfa, Finans, Belgeler, Raporlar, İletişim | Sieht der Buchhalter wirklich nur Finanz-relevante Module und keine Immobilien- oder Nutzerverwaltung? |
| Personel (Staff) | Stufe 40, Feldarbeit | Nur fünf Module: Anasayfa, Servis Talepleri, Rezervasyon, Belgeler, İletişim | Kann das Personal zugewiesene Aufgaben abarbeiten, ohne Finanzdaten oder andere Wohnungen zu sehen? |
| Malik (Owner) | Stufe 20, eigene Einheit | Nur fünf Module, aber inhaltlich auf die eigene Einheit begrenzt | Sieht der Eigentümer ausschließlich seine eigene Wohnung, seine Dokumente und seinen eigenen Kontostand? |
| Kiracı (Tenant) | Stufe 10, gemietete Einheit | Dieselben fünf Module wie Owner, inhaltlich noch enger begrenzt | Sieht der Mieter wirklich nur das, was der Mietvertrag erlaubt, und keine Eigentümer-Informationen? |

Wichtig für dein Verständnis: Admin und Manager sehen in der Seitenleiste fast identisch viele Module. Der Unterschied zwischen beiden liegt nicht in der Sichtbarkeit, sondern in der Tiefe der erlaubten Aktionen — das prüfst du gezielt in Kapitel 5.

---

## 4. Rolle Yönetim (Admin) — der volle Systemzugriff

Melde dich über den Demo-Button oder über den Admin-Rollen-Button an. Du landest im Dashboard mit der Übersicht „ERP Operasyon Merkezi" und siehst in der Seitenleiste alle zwölf Module: Anasayfa, Daire Matrisi, CRM, Servis Talepleri, Rezervasyon, Erişim & Uyum, Finans, Belgeler, Raporlar, İletişim, Kullanıcılar und Ayarlar.

**Szenario 4.1 — Globale Kennzahlen prüfen.** Auf der Startseite siehst du vier zentrale Kennzahlkarten: die Gesamtzahl der Wohneinheiten mit Belegungsquote, den Gesamtbetrag offener Forderungen mit der Anzahl der Zugriffsbeschränkungen, die Anzahl offener Servicefälle mit SLA-Überschreitungen und die heutigen Termine mit Check-outs. Prüfe, ob diese vier Zahlen plausibel zueinander passen — zum Beispiel sollte die Anzahl gesperrter Einheiten nicht höher sein als die Anzahl der Einheiten mit offenen Forderungen.

**Szenario 4.2 — Daire Matrisi (Wohnungsmatrix) im Detail.** Öffne das Modul und prüfe die Blockübersicht: Jeder der sieben Blöcke zeigt eine eigene Karte mit Gesamtzahl der Einheiten, Verkaufsstatus, Belegungsbalken und der Anzahl verfügbarer, verkaufter, fehlender und gesperrter Einheiten. Klicke danach in die Einheitenmatrix selbst — ein farbcodiertes Raster aller Wohnungen nach Status (belegt, frei, reserviert, in Wartung, gesperrt). Wähle eine einzelne Einheit an und prüfe, ob das Detailpanel rechts Block, Etage, Typ, Fläche, Verkaufsstatus, Zugangsstatus, Preis und offene Forderungen konsistent zueinander anzeigt. Prüfe zusätzlich den Importbereich weiter unten: Er zeigt Gesamtzeilen, gültige, warnungsbehaftete und abgelehnte Datensätze eines Dateneingangs — das ist die Kontrollstelle für künftige Datenimporte, nicht für Live-Buchungen.

**Szenario 4.3 — Kullanıcılar & Roller (Nutzer- und Rollenverwaltung).** Dieses Modul ist ausschließlich für Admin und teilweise Manager sichtbar. Prüfe die Personalkarten (Rolle, Status, Team, Kontaktdaten) und die Rollenabdeckungstabelle, die pro Rolle anzeigt, wer Finanzfreigaben, Zugangsbeschränkungen oder Exportrechte hat. Diese Tabelle sollte exakt mit dem übereinstimmen, was du in den anderen Rollenkapiteln dieses Dokuments als Berechtigungen liest.

**Szenario 4.4 — Ayarlar (Systemeinstellungen) und Audit-Trail.** Nur der Admin sieht hier vollständige Kontrollkarten zu Betrieb, Benachrichtigungen, Sicherheitsrichtlinie und Lokalisierung, dazu eine Audit-Tabelle mit Akteur, Modul, Risikostufe und Aktion je Eintrag. Prüfe, ob sicherheitsrelevante Aktionen (zum Beispiel eine Rollenänderung) im Audit-Trail nachvollziehbar protokolliert erscheinen.

**Foundation-Grenze:** Die Systemeinstellungen zeigen den aktuellen Konfigurationsstand, lösen aber keine echten Änderungen an einer Produktionsumgebung aus — die Demo läuft ohne angebundenes Supabase-Cloud-Projekt, siehe Kapitel 10.

---

## 5. Rolle Sorumlu (Manager) — operative Standortleitung ohne Buchhaltungsrechte

Melde dich neu über den Rollen-Button „Sorumlu" an (ein einfacher Sprachwechsel oder Reload reicht nicht — du musst dich über den Login-Button explizit als andere Rolle anmelden). Der Manager sieht ebenfalls alle zwölf Module, das ist beabsichtigt. Der eigentliche Test hier ist, ob die Aktionsrechte innerhalb der Module enger sind als beim Admin.

**Szenario 5.1 — Finans mit reinem Einsichtsrecht.** Öffne das Finanzmodul. Der Manager darf die Kennzahlen, den Cashflow, die Forderungsaltersstruktur und die Zahlungspläne vollständig einsehen und exportieren, aber er darf keine neuen Buchungen anlegen oder Zahlungen freigeben. Prüfe konkret in der Komponente „Ödeme, depozito ve kısıt kontrol merkezi": Der Button „İnceleme aç" (Prüfung öffnen) ist nur für Rollen mit Finanzfreigabe sichtbar — als Manager sollte dieser Button fehlen oder deaktiviert sein, während er beim Admin und beim Accountant erscheint.

**Szenario 5.2 — Kullanıcılar mit eingeschränkter Tiefe.** Der Manager sieht die Nutzerliste (view), darf Personal Aufgaben zuweisen (assign), aber keine Rollen vergeben oder Nutzer anlegen/löschen — dieses Recht bleibt exklusiv beim Admin. Prüfe, ob entsprechende Bearbeiten-Buttons für Rollenänderungen beim Manager fehlen.

**Szenario 5.3 — Operative Vollsteuerung bei Servicefällen, Kalender und Kommunikation.** Hier hat der Manager praktisch dieselben Rechte wie der Admin: Er darf Servicetickets anlegen, bearbeiten, zuweisen und freigeben, Reservierungen im Kalender verwalten und Kommunikationsregeln pflegen. Prüfe im Modul Servis Talepleri, ob der Manager sowohl den Servicekatalog als auch die Auftragskontrolle und die Feldaufgaben-Übersicht sieht, inklusive Team-Zuweisung und Prioritäten.

**Szenario 5.4 — Ayarlar nur mit Leserecht.** Öffne als Manager das Einstellungen-Modul. Er darf es sehen (view), aber keine Kontrollen verändern (kein manage-Recht) — anders als der Admin. Prüfe, ob Bearbeiten-Aktionen dort fehlen oder deaktiviert sind.

**Randnotiz:** In der Kalenderseite gibt es zusätzlich eine „Sales pipeline"-Tabelle mit Status, Kanal und nächstem Schritt — das ist die aktuelle Abbildung des Vertriebs-/Deal-Trichters. Ein eigenständiges Modul „Deals" existiert in der Seitenleiste bewusst nicht; das ist kein Fehler, sondern der aktuelle Funktionsumfang.

---

## 6. Rolle Muhasebe (Accountant) — Finanzfokus mit strikt reduzierter Sicht

Melde dich über den Rollen-Button „Muhasebe" an. Das ist der wichtigste Sichtbarkeitstest im ganzen System: Der Accountant sollte in der Seitenleiste **nur fünf Module** sehen — Anasayfa, Finans, Belgeler, Raporlar und İletişim. Module wie Daire Matrisi, CRM, Servis Talepleri, Rezervasyon, Erişim & Uyum, Kullanıcılar und Ayarlar dürfen überhaupt nicht in der Seitenleiste erscheinen.

**Szenario 6.1 — Sichtbarkeitsgrenze bestätigen.** Zähle nach dem Login die sichtbaren Menüpunkte in der Seitenleiste nach. Sind es mehr als fünf, ist das ein Berechtigungsfehler und sollte als kritischer Befund vermerkt werden, weil er die Rollenisolation verletzt.

**Szenario 6.2 — Finanzarbeit im Detail.** Öffne Finans. Der Accountant darf hier — anders als der Manager — Buchungen anlegen, bearbeiten und freigeben (create, update, approve). Prüfe die Zahlungspläne-Tabelle (Plan-ID, Käufer, Listenpreis, bereits Bezahlt, nächste Fälligkeit, Status), die Forderungsaltersstruktur mit Tagen im Verzug, und die Komponente „Ödeme, depozito ve kısıt kontrol merkezi". Der Button „İnceleme aç" sollte hier sichtbar und aktiv sein.

**Szenario 6.3 — Berichte mit KI-Hinweisen.** Öffne Raporlar. Prüfe den Hinweisbanner zum Monatsabschluss, die Kennzahlkarten (Berichtsanzahl, fertig, geplant, KI-Prüfung nötig), den Sammlungs-Trend und die Forderungsaltersstruktur nach 30/60/90 Tagen. Wichtig: Direkt im Banner steht der Satz „AI sadece öneri üretir; onay insan rolünde kalır" (die KI erzeugt nur Empfehlungen, die Freigabe bleibt beim Menschen) — das ist eine bewusste Sicherheitsgrenze, kein Platzhaltertext, und sollte in jeder Demo hervorgehoben werden.

**Szenario 6.4 — Dokumente ohne Immobilienkontext.** Öffne Belgeler. Der Accountant sieht hier Finanz- und Kaufdokumente (Checkliste, TAPU-relevante Dateien), aber keine operativen Servicedokumente, weil sein Rollenkontext auf Finanzen begrenzt ist.

**Foundation-Grenze:** Alle Zahlungen, Mahnläufe und Kontoabgleiche in der Demo sind Beispieldaten. Es ist noch keine echte Bank- oder Zahlungsanbieter-Anbindung aktiv — diese Entscheidung ist laut Handbuch offen (siehe Kapitel 10).

---

## 7. Rolle Personel (Staff) — Feldarbeit ohne Finanzeinblick

Melde dich über den Rollen-Button „Personel" an. Auch hier gilt die enge Sichtbarkeitsregel: nur fünf Module — Anasayfa, Servis Talepleri, Rezervasyon, Belgeler, İletişim. Kein Zugriff auf Finans, Daire Matrisi, CRM, Kullanıcılar, Ayarlar oder Erişim & Uyum.

**Szenario 7.1 — Zugewiesene Aufgaben abarbeiten.** Öffne Servis Talepleri. Prüfe den Bereich „Saha görevleri" (Feldaufgaben): Jede Karte zeigt Routen-Slot, Wohnung, Titel, zuständige Person, Bereitschaftsgrad in Prozent, Priorität, Status, eine Freigabe-Markierung durch die Führungskraft, die ersten Checklistenpunkte und die Anzahl der Medien-Nachweise. Prüfe, ob Personal-Nutzer nur ihre eigenen zugewiesenen Aufgaben sehen und ob der „Aksiyon"-Button zum Abschließen einer Aufgabe funktioniert.

**Szenario 7.2 — Kein Finanzeinblick, auch nicht versteckt.** Öffne die Auftragskontrolle innerhalb desselben Moduls. Prüfe gezielt, ob der Preis pro Auftrag beim Personal maskiert oder ausgeblendet ist (laut Code wird der Preis für Feldrollen maskiert). Das ist ein wichtiger Negativtest: Als Personal darfst du an keiner Stelle im System einen konkreten Geldbetrag sehen.

**Szenario 7.3 — Kalender aus Betriebssicht.** Öffne Rezervasyon. Personal sieht eine vereinfachte Betriebsansicht mit Status, Zugangscode-Status und Reinigungsstatus je Buchung, aber keine Vertriebs-Pipeline und keine Depotbeträge im Klartext — Depotbeträge werden für Feldrollen maskiert angezeigt.

**Szenario 7.4 — Dokumente hochladen.** Prüfe, ob Personal im Dokumente-Modul eigene Nachweisdokumente (zum Beispiel Fotobelege) hochladen kann (create-Recht vorhanden), aber keine TAPU- oder Kaufdokumente sieht.

---

## 8. Rolle Malik (Owner) — Eigentümerperspektive auf die eigene Einheit

Melde dich über den Rollen-Button „Malik" an. Auch der Owner sieht nur fünf Module: Anasayfa, Servis Talepleri, Rezervasyon, Belgeler, İletişim. Der entscheidende Unterschied zu Personal und Accountant ist nicht die Modulliste, sondern dass jeder Inhalt auf die eigene Einheit begrenzt sein muss.

**Szenario 8.1 — Nur die eigene Wohnung sehen.** Öffne Rezervasyon und Servis Talepleri. Für Client-Rollen wie Owner zeigt der Kalender laut Code nur die „yetkili daire" (autorisierte Einheit) statt der gesamten Belegungsliste aller 769 Einheiten. Prüfe, ob wirklich nur eine einzige Wohnung mit ihren eigenen Buchungen erscheint und keine Vertriebs-Pipeline, keine Mitarbeiterliste und keine Daten anderer Eigentümer sichtbar sind.

**Szenario 8.2 — Servicefälle selbst anlegen.** Der Owner darf einen neuen Servicewunsch erstellen (create-Recht bei tickets), aber keine Aufträge an Dienstleister freigeben oder Preise sehen. Lege testweise eine neue Serviceanfrage an und prüfe, ob sie danach im System als offener Fall erscheint (aus Sicht der Rolle, die sie sehen darf, zum Beispiel Manager oder Personal beim nächsten Rollenwechsel).

**Szenario 8.3 — Eigene Dokumente und Kontostand.** Prüfe im Dokumente-Modul, ob nur Dokumente zur eigenen Einheit sichtbar sind (view-Recht, kein Hochladen durch den Owner selbst vorgesehen). Prüfe zusätzlich, falls im Dashboard eine Kontostandsanzeige für die eigene Einheit erscheint, ob der Betrag mit dem entspricht, was du später als Admin oder Accountant für dieselbe Einheit in der Wohnungsmatrix beziehungsweise im Finanzmodul siehst — das ist ein Konsistenztest über mehrere Rollen hinweg.

**Szenario 8.4 — Kommunikation mit der Verwaltung.** Öffne İletişim. Laut Code filtert das System für Owner ausschließlich Konversationen mit der Kennzeichnung „Malik" (Eigentümer). Prüfe, ob keine Konversationen anderer Zielgruppen wie „Kiracı" oder „Personel" sichtbar sind.

---

## 9. Rolle Kiracı (Tenant) — Mieterperspektive, die engste Sicht im System

Melde dich über den Rollen-Button „Kiracı" an. Die Modulliste ist identisch zu Owner (fünf Module), die inhaltliche Grenze ist aber noch enger, weil sie zusätzlich vom Mietvertrag und vom Schuldnerstatus abhängt.

**Szenario 9.1 — Zugriffsbeschränkung durch offene Forderungen.** Dies ist eines der wichtigsten Geschäftsszenarien im ganzen System: Wenn zu einer Einheit eine offene Forderung mit Zugriffsbeschränkung hinterlegt ist, muss der Mieter beim Versuch, einen kostenpflichtigen Service anzufragen, eine klare Begründung und einen Zahlungsweg angezeigt bekommen, statt einfach nur eine Fehlermeldung. Prüfe im Modul Servis Talepleri, ob eine gesperrte Einheit als „Onay bekleyen" oder mit einer vergleichbaren Statusmeldung inklusive Grund angezeigt wird.

**Szenario 9.2 — Eigene Reservierung und eigener Vertrag.** Öffne Rezervasyon. Wie beim Owner sollte auch der Tenant nur seine eigene autorisierte Einheit sehen, keine Depotinformationen anderer Mieter und keine Vertriebsdaten.

**Szenario 9.3 — Kommunikationsfilter „Kiracı".** Öffne İletişim und prüfe, ob hier ausschließlich Konversationen mit der Zielgruppenkennzeichnung „Kiracı" erscheinen, keine Eigentümer- oder internen Personalkonversationen.

**Szenario 9.4 — Grenztest: Versuch, ein fremdes Modul über die URL zu öffnen.** Melde dich als Kiracı an und versuche danach, direkt über die Adresszeile ein nicht freigegebenes Modul aufzurufen, zum Beispiel die Finanz- oder Nutzerverwaltungsseite. Das System muss den Zugriff verweigern oder umleiten, auch wenn der Menüpunkt in der Seitenleiste gar nicht angeboten wird — dieser Test prüft, ob der Schutz serverseitig (also wirklich) besteht und nicht nur durch das Verstecken eines Menüpunkts vorgetäuscht wird. Das ist die höchste Prioritätsstufe unter allen Szenarien in diesem Dokument.

---

## 10. Modulübergreifende Szenarien für alle Rollen

**Szenario 10.1 — KI-Assistent und Rollenschutz.** Öffne über das schwebende Symbol unten rechts den „1Çatı Operasyon Asistanı". Er begrüßt dich mit deinem Rollennamen und zeigt ein rollenspezifisches Eingabefeld — zum Beispiel bei Muhasebe den Hinweis auf Aidat, Tahsilat, Depozito oder Finanzberichte, bei Personel den Hinweis auf zugewiesene Servicefälle und Feldnotizen. Stelle als Tenant testweise eine Frage nach Finanzdaten, die dir nicht zustehen — die Antwort muss eine klare Zugriffsverweigerung sein, keine ausgedachte Zahl. Stelle danach als Admin oder Manager dieselbe Frage — hier sollte eine echte, aus den Systemdaten abgeleitete Antwort kommen. Wichtig für die Erwartungshaltung: Der Assistent gibt aktuell nur begründete Auskünfte auf Basis vorhandener Daten, er sagt keine Zahlungsausfallrisiken vorher und plant keine automatischen Aktionen — das ist eine geplante, aber noch nicht gebaute Erweiterung (siehe `docs/offers/ki-premium-layer-offer.md`).

**Szenario 10.2 — Mehrsprachigkeit.** Wechsle in mindestens zwei Rollen jeweils durch alle vier Sprachen (TR, EN, DE, RU) über den Sprachumschalter und prüfe, ob Menü, Kennzahlkarten und Statusbezeichnungen vollständig übersetzt sind, ohne englische oder türkische Restwörter in den anderen Sprachen.

**Szenario 10.3 — Wohnungsdatenquelle erkennen.** In den von der API gelieferten Datenstrukturen gibt es intern ein Feld, das angibt, ob eine Information aus der echten Datenbank (Supabase) oder aus lokalen Beispieldaten stammt. Für die fachliche Demo mit dem Kunden ist das nicht sichtbar, aber wichtig für dich als Tester: Zahlen, die sich zwischen zwei Ansichten leicht widersprechen, kannst du dir dadurch erklären, dass eine Ansicht lokale Beispieldaten und die andere eine andere Berechnungsgrundlage verwendet — das ist ein bekannter, dokumentierter Punkt (siehe Kapitel 11), kein neuer Fehler, den du zusätzlich melden musst, wenn er zu den dort genannten Stellen passt.

**Szenario 10.4 — Abmelden und erneut anmelden.** Prüfe für mindestens zwei Rollen, dass der „Çıkış yap"-Button dich wirklich zur Login-Seite zurückführt und dass ein direkter Aufruf des Dashboards danach erneut zur Anmeldung auffordert beziehungsweise zur Login-Seite umleitet.

---

## 11. Bekannte Grenzen — was du nicht als Fehler melden musst

Damit du beim Testen keine Zeit mit bereits bekannten, bewusst noch offenen Punkten verlierst, hier die Liste der Grenzen laut aktuellem Projektstand (`docs/PROJECT-HANDBOOK.md`, Abschnitt 3.1 und 6):

- **Phase 10 (Booking, Move-in, Checkout mit Verfügbarkeitsprüfung, Zugangsfreischaltung und Schadensabrechnung) ist der nächste aktive Baustein und noch nicht fertig.** Die Kalenderseite zeigt bereits Buchungen, Check-in/Check-out-Daten und Depotstatus, aber die vollständige Verknüpfung mit automatischer Zugangsfreischaltung und Schadensabrechnung ist noch im Aufbau.
- **Es ist kein echter Zahlungsanbieter, keine echte Bankanbindung und kein echtes Zugangskontrollsystem angeschlossen.** Diese Entscheidungen sind laut Handbuch offen und erfordern eine Kunden-/Rechts-/Vendor-Freigabe, bevor sie produktiv geschaltet werden.
- **Schuldnerbasierte Zugriffsbeschränkungen sind fachlich abgebildet, aber rechtlich noch nicht final geprüft.** Buchhaltung und Rechtsabteilung müssen die Regel vor dem Produktivbetrieb freigeben.
- **Die KI-Funktionen (Tier 2/3 aus dem Premium-Angebot: Risikoscoring, Prognosen, automatische Briefings) sind ein Vorschlag für die nächste Ausbaustufe und aktuell nicht gebaut.** Live ist ausschließlich der rollenbasierte, datengestützte Frage-Antwort-Assistent aus Szenario 10.1.
- **Datenimport, Massendatenmigration historischer Bestände und die endgültige Supabase-Cloud-Produktivumgebung sind offene Entscheidungen**, keine technischen Fehler der Demo.
- **Kleinere Zahlenabweichungen zwischen einzelnen Kennzahlkarten und Detailtabellen** können auf unterschiedlichen Berechnungsgrundlagen zwischen Live- und Beispieldaten beruhen; sie sind als bekannter Nacharbeitspunkt erfasst und nicht Gegenstand dieses Testdurchlaufs.

Melde stattdessen mit hoher Priorität alles, was in Kapitel 4 bis 9 als Sichtbarkeits- oder Rechteverletzung beschrieben ist — also wenn eine Rolle mehr sieht oder mehr darf, als ihr laut diesem Dokument zusteht. Das sind die fachlich kritischsten Fehlerklassen in einem rollenbasierten System.

---

## 12. Bezug zu den offiziellen Pflicht-UAT-Szenarien

Die kanonische Liste der Pflicht-Testszenarien für den späteren Produktivstart steht in `docs/requirements/option-3-ai-site-crm/QA-UAT-Launch-Plan.md`, Abschnitt 4. Die folgende Tabelle ordnet sie diesem Demo-Testdurchlauf zu, damit du weißt, was schon heute sinnvoll prüfbar ist und was erst nach Phase 10 beziehungsweise nach Anbieterentscheidungen vollständig testbar wird.

| Offizielles Szenario | Heute in der Demo testbar? | Wo in diesem Dokument |
|---|---|---|
| Rollen-Login und Navigation | Ja, vollständig | Kapitel 4–9 |
| 769-Wohnungen-Suche | Ja, vollständig | Szenario 4.2 |
| Eigentümer-Kontostand | Ja, mit Beispieldaten | Szenario 8.3 |
| Mieter legt Serviceanfrage an | Ja, vollständig | Szenario 8.2, 9.1 |
| Schulden blockieren Service | Ja, die Statusanzeige ist testbar | Szenario 9.1 |
| Zahlung hebt Sperre auf | Nur als Anzeige-Logik, ohne echten Zahlungsanbieter | Szenario 6.2 |
| Personal schließt Aufgabe ab | Ja, vollständig | Szenario 7.1 |
| Buchung anlegen | Teilweise — Anzeige ja, Überschneidungsprüfung gehört zu Phase 10 | Kapitel 11 |
| Move-in | Noch nicht vollständig — Phase 10 | Kapitel 11 |
| Checkout | Noch nicht vollständig — Phase 10 | Kapitel 11 |
| Dokumentenzugriff | Ja, vollständig | Szenario 4.2, 6.4, 7.4, 8.3 |
| KI-Empfehlung mit Quellenangabe | Ja, für die heute gebaute Stufe 1 | Szenario 10.1 |
| Reporting | Ja, mit Beispieldaten | Szenario 6.3 |

---

## 13. Testprotokoll-Vorlage

Nutze diese einfache Tabelle während des Testens, um Ergebnisse festzuhalten. Du kannst sie in eine Tabellenkalkulation kopieren.

| Szenario-Nr. | Rolle | Datum | Ergebnis (OK / Fehler / Teilweise) | Anmerkung |
|---|---|---|---|---|
| 4.1 | Admin | | | |
| 4.2 | Admin | | | |
| 5.1 | Manager | | | |
| 6.1 | Accountant | | | |
| 7.2 | Staff | | | |
| 8.1 | Owner | | | |
| 9.1 | Tenant | | | |
| 9.4 | Tenant | | | |
| 10.1 | mehrere | | | |

---

*Dieses Dokument beschreibt den Stand der Demo zum 2. Juli 2026. Bei größeren Änderungen an Rollen, Modulen oder Phasenstatus sollte es gegen `apps/web/lib/rbac.ts` und `docs/PROJECT-HANDBOOK.md` neu abgeglichen werden.*
