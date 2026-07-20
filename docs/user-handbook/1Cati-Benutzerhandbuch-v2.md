# 1Cati Benutzerhandbuch, Version 2

Rollenbasierte Nutzung der Ataberk Estate Plattform

| Feld | Wert |
|---|---|
| Projekt | 1Cati - Property-Management-Plattform für Ataberk Estate |
| Portfolio | New Level Premium, Avsallar, Alanya |
| Status | Benutzerhandbuch für Demo, Schulung und interne Einführung. |
| Dokumentversion | **v2**, ergänzt `1Cati-Benutzerhandbuch.docx` (v1, 01.07.2026); die bestehende Datei bleibt unverändert erhalten |
| Anlass dieser Version | Abgleich des Handbuchs gegen den tatsächlichen Code (Tiefenanalyse 07.07.2026), mehrere seit v1 entwickelte Funktionen fehlten, eine Beschreibung war veraltet |
| Stand | 07. Juli 2026 |
| Plattform | https://cati-blond.vercel.app/tr |
| Sprache dieses Handbuchs | Deutsch |

Dieses Handbuch erklärt die Bedienung der Plattform in einfacher Sprache. Es ist für Management, Betrieb, Buchhaltung, Mitarbeiter, Eigentümer, Mieter, Schulung und interne Einführung gedacht. Die Texte beschreiben den aktuellen Demo- und Schulungsstand sowie klar getrennt die Funktionen, die erst nach Kundendaten, Verträgen, API-Schlüsseln und Produktionsfreigabe live geschaltet werden.

**Was ist neu in Version 2:** Ein komplettes, bisher im Handbuch fehlendes Kapitel zum öffentlichen New-Level-Premium-Bereich (Landingpage, kontofreie Registrierung, Meldekanal, QR-Poster, öffentlicher KI-Assistent), Kapitel 5. Außerdem: die Beschreibung von „Müşteri Adayları" wurde korrigiert (zeigt keine klassische Lead-Liste, siehe 4.3), der Ein-Klick-Demo-Zugang ist jetzt eigenständig erklärt (2.3), das Zeitzugang-Panel für Mieter ist ergänzt (4.12), und mehrere „Worauf sollte ich achten"-Abschnitte wurden um Hinweise ergänzt, wo eine Funktion aktuell nur Anzeige/Demo ist, aber keine Erfassung oder Ausführung ermöglicht (u. a. Reservierung erstellen, Finanzbuchung erfassen, Foto-/Videonachweis hochladen).

---

# 1. Überblick und aktueller Stand

1Cati ist die zentrale Arbeitsoberfläche für Immobilienverwaltung, Service, Finanzen, Reservierung, Dokumente, Kommunikation, Rollen und Reporting. Der aktuelle Stand ist für Demo, Schulung und interne Einführung vorbereitet.

## Was ist jetzt verfügbar

- Rollenbasierter Login für Demo-Profile und produktionsbereite Supabase-Auth-Struktur, inklusive eines Ein-Klick-Demo-Zugangs ohne Passwort (siehe Kapitel 2.3).
- Dashboard mit Portfolioübersicht, Statuskarten, operativer Simulation und rollenabhängiger Navigation.
- Daire Matrix für Einheiten, Blöcke, Eigentümer, Bewohner, Preise, Schulden, Dokumente, Service- und Zugriffstatus.
- Leads/Kunden-Ansicht, Tickets, Reservierungen, Finanzen, Dokumente, Reports, Kommunikation, Offline-Sync, Benutzer und Einstellungen als eigene Arbeitsbereiche.
- Interne Ticketlogik mit SLA, Priorität, Freigaben, Schuldregeln, Außendiensthinweisen und Eskalationen.
- Dokumentenbereich mit Upload- und Review-Logik. Live Storage ist vorbereitet, aber produktive Bucket- und Retention-Entscheidung ist noch offen.
- **Ein öffentlicher, kontofreier Bereich** unter „New Level Premium" mit Registrierung, Meldekanal und eigenem QR-Poster für den Vor-Ort-Einsatz (neu in diesem Handbuch, siehe Kapitel 5).
- **Zwei miteinander verbundene KI-Assistenten:** ein interner, rollenabhängiger Assistent im Dashboard und ein öffentlicher, datenblinder Assistent auf der Landingpage/im New-Level-Premium-Bereich (siehe Kapitel 6).
- Ein eigentümer-gesponsertes Zeitzugangsmodell für Mieter im Benutzer-Bereich (siehe Kapitel 4.12), aktuell als Demo ohne dauerhafte Speicherung.

## Was später produktiv freigegeben werden muss

- Echte Kundendaten, Eigentümerdaten, Mieterdaten, Zahlungen, offene Salden und finale Regeln müssen vom Kunden geprüft oder bestätigt werden.
- Live-Anbindungen für Zahlung, Banking, SMS, E-Mail, Zugangskarten, Kameras und Dokumentenspeicher brauchen Verträge, API-Schlüssel und Freigabe.
- Rechtliche Regeln zu Zugangssperren, Schulden, Kautionen, Check-out und Rückerstattung müssen vom Kunden oder Fachberater freigegeben werden.
- Security Review, UAT, Schulung, Betriebsfreigabe und Launch Readiness sind vor produktiver Nutzung noch einzuplanen.
- **Neu ergänzt:** Eine neue Reservierung/Buchung anlegen, eine neue Finanzbuchung erfassen und ein Foto-/Videonachweis zu einem Serviceauftrag hochladen sind aktuell **technisch nicht möglich**, diese drei Punkte sind reine Anzeige- bzw. Board-Funktionen ohne Erfassungsmöglichkeit (Details in den jeweiligen Kapiteln 4.5, 4.7, 4.4).

## Wichtige Links

- Plattform öffnen: https://cati-blond.vercel.app/tr
- API-Spezifikation im Repository: `docs/api/openapi.json`
- Öffentlicher New-Level-Premium-Bereich (kein Login nötig): `/tr/new-level-premium`

---

# 2. Rollen und Rechte

Die Plattform arbeitet mit sechs Kernrollen. Jede Rolle sieht nur die Seiten und Aktionen, die für ihre Arbeit notwendig sind. So werden Eigentümer-, Mieter-, Finanz- und Betriebsdaten getrennt.

| Rolle | Zweck | Hauptseiten |
|---|---|---|
| Verwaltung | Gesamtverantwortung für Plattform, Einstellungen, Benutzer und sensible Kontrollen. | Alle Seiten |
| Verantwortlicher | Tägliche Standort- und Betriebsführung für New Level Premium. | Übersicht, Daire Matrix, Leads, Tickets, Reservierung, Zugang, Dokumente, Reports, Kommunikation, Offline-Sync, Benutzer, Einstellungen |
| Buchhaltung | Finanz- und Zahlungsprozesse, Gebühren, Kautionen, Inkasso und Reports. | Übersicht, Finanzen, Dokumente, Reports, Kommunikation |
| Mitarbeiter | Außendienst, Serviceausführung, Foto- und Videonachweise (Anzeige, Upload aktuell nicht funktionsfähig, siehe 4.4). | Übersicht, Tickets, Reservierung, Dokumente, Kommunikation, Offline-Sync |
| Eigentümer | Eigene Wohnung, Dokumente, Services, Reservierungen und Kommunikation. | Übersicht, Tickets, Reservierung, Dokumente, Kommunikation |
| Mieter | Berechtigte Wohnung, Services, Reservierungen, Chat und Dokumente. | Übersicht, Tickets, Reservierung, Dokumente, Kommunikation |

| Rolle | Darf | Darf nicht |
|---|---|---|
| Verwaltung | Konfigurieren, Benutzer verwalten, Reports prüfen, sensible Bereiche überwachen. | Keine Isolation umgehen. Finanz- und Zugangsvorgänge müssen nachvollziehbar bleiben. |
| Verantwortlicher | Services steuern, Aufgaben zuweisen, Reservierungen prüfen, Risiken und SLA überwachen. | Keine Buchungseinträge posten und keine globalen Systemeinstellungen ändern. |
| Buchhaltung | Saldo prüfen, Zahlungen und Gebühren vorbereiten, Export und Finanzberichte nutzen. | Keine Benutzerverwaltung und keine operative Ticket-Schließung ohne Nachweis. Neue Zahlungen erfassen ist aktuell auch für diese Rolle technisch nicht möglich (siehe 4.7). |
| Mitarbeiter | Zugewiesene Aufgaben bearbeiten, Status und Nachweise ergänzen. | Keine Finanzbücher sehen und keine Rückerstattung, Zugangssperre oder Rolle freigeben. |
| Eigentümer | Eigene Anfragen erstellen und eigene berechtigte Daten sehen. | Keine anderen Eigentümer, Mitarbeiterdaten, globale Reports oder interne Finanzen sehen. |
| Mieter | Service- und Reservierungsanfragen erstellen, wenn dies erlaubt ist. | Keine Eigentümerdaten, andere Wohnungen, Finanzbücher oder globale Reports sehen. |

## 2.1 Login mit Rollenprofil

1. Plattform öffnen und zur Login-Seite wechseln.
2. In der Demo- oder Schulungsumgebung das passende Rollenprofil auswählen, oder den Ein-Klick-Demo-Zugang nutzen (siehe 2.3).
3. Nach dem Login werden nur die Menüpunkte angezeigt, die zur Rolle passen.
4. Eine Seite öffnen und die benötigte Aufgabe ausführen.
5. Bei falscher Sichtbarkeit oder fehlender Berechtigung die zuständige Projekt- oder Systemverantwortung informieren.

## 2.2 Wie die Rollenprüfung funktioniert (für Schulungszwecke)

Jede Seite und jede Aktion wird zweifach geprüft: einmal in der Anwendung selbst (bevor eine Seite überhaupt angezeigt wird) und einmal zusätzlich in der Datenbank. Ein Nutzer ohne Berechtigung sieht die Seite also gar nicht erst, es ist kein reines „Ausblenden eines Buttons", sondern eine echte Zugriffssperre auf zwei Ebenen.

## 2.3 Ein-Klick-Demo-Zugang (ohne Passwort)

Auf der Login-Seite steht in kontrollierten Demo-/Schulungsumgebungen ein Button „Demo başlat" (Demo starten) zur Verfügung. Ein Klick meldet sofort mit voller Administratorrolle an, ohne Passwort, ohne echtes Nutzerkonto. Dieser Button ist ausschließlich für Präsentationen, Schulungen und interne Vorführungen gedacht und ist in einer echten Produktionsumgebung standardmäßig gesperrt, sofern dafür nicht eine ausdrückliche, dokumentierte Ausnahme aktiviert wurde. **Wichtig für die Präsentation:** Wer diesen Button nutzt, sieht die Plattform aus Sicht der mächtigsten Rolle (Verwaltung), für eine realistischere Vorführung einer bestimmten Rolle (z. B. Eigentümer) sollte stattdessen die reguläre Rollenauswahl aus Schritt 2.1 verwendet werden.

---

# 3. Grundbedienung

## Linke Navigation

Die linke Navigation zeigt die Arbeitsbereiche, die zur aktuellen Rolle passen. Wenn eine Seite nicht sichtbar ist, ist das meistens eine bewusste Rollenbeschränkung.

- Übersicht: täglicher Startpunkt mit Portfoliozustand, Risiken und Arbeitskarten.
- Daire Matrix: zentrale Liste der Einheiten und operativen Daten.
- Müşteri Adayları: Kunden-/Bewohner-Übersicht mit Kommunikationspriorität (siehe 4.3, kein klassisches Verkaufs-Lead-Modul).
- Servis Talepleri: interne Tickets, Serviceaufträge und SLA.
- Reservasyon: Buchung, Check-in, Check-out und Aufgaben (Anzeige-Board, siehe 4.5).
- Erişim & Uyum: Zugang, Einschränkungen, EIDS und Compliance.
- Finans & Aidat: Gebühren, Zahlungen, Schulden und Kautionen (Anzeige, siehe 4.7).
- Belgeler: Dokumente, Upload, Pakete, Review und Nachweise.
- Raporlar: Management-, Finanz-, Betriebs- und AI-Berichte.
- İletişim: Nachrichten, Vorlagen, Benachrichtigungen und Sprachlogik.
- Offline Senkron: Offline-Warteschlange, Konflikte und Feldarbeit.
- Kullanıcılar & Roller: Team, Bewohner, Rollen, Berechtigungen und Mieter-Zeitzugang.
- Ayarlar: Provider-Status, Systemkontrollen und Konfiguration.

## Suche und Filter

Die globale Such- und Filterleiste dient dazu, Datensätze schnell zu finden. Nutzer können nach Einheiten, Personen, Services, Dokumenten, Nachrichten oder Status suchen. Nach dem Anwenden eines Filters muss klar sichtbar sein, dass die Ergebnisliste aktualisiert wurde.

## Sprache

Die Plattform unterstützt Türkisch, Englisch, Deutsch und Russisch. Türkisch ist die Betriebssprache. Die Sprache kann oben rechts gewechselt werden.

## Hell-/Dunkelmodus

Die Plattform unterstützt einen manuellen Hell-/Dunkel-Umschalter. **Dieser Umschalter ist aktuell ausschließlich im eingeloggten Dashboard verfügbar** (oben rechts neben der Sprachauswahl). Auf öffentlichen Seiten (Landingpage, Plattform-Seite, Demo-Center, Login, Registrierung, New-Level-Premium-Bereich) folgt die Darstellung ausschließlich automatisch der Systemeinstellung des Geräts, dort gibt es keinen sichtbaren Schalter.

## Audit und Nachvollziehbarkeit

Kritische Aktionen wie Freigabe, Zahlungslogik, Zugangsbeschränkung, Dokumentprüfung und Rollenänderung sollen immer mit Nutzer, Rolle, Zeitpunkt, Grund und Status nachvollziehbar bleiben.

---

# 4. Seiten und Funktionen (Dashboard)

## 4.1 Übersicht

Täglicher Startpunkt für den Verantwortlichen. Zeigt Portfolio, offene Arbeit, Risiken, Blöcke, Live-Ereignisse und Rollenarbeitsbereiche.

**Hinweis zum Reifegrad:** Die Kernkennzahlen (Einheiten, offene Schulden, Tickets, Reservierungen) sind live-fähig, sie zeigen echte Datenbankwerte, sobald die Plattform mit Kundendaten verbunden ist. Die Kacheln „Erwartete Monatszahlung" und „Depotrisiko" bleiben dagegen unabhängig davon immer Demo-Werte. Für die Rollen Buchhaltung, Mitarbeiter, Eigentümer und Mieter zeigt die Übersicht grundsätzlich ausschließlich Demo-Werte, unabhängig vom Anbindungsstatus, nur Verwaltung und Verantwortlicher sehen die live-fähige Ansicht.

### Was kann ich hier tun

- Portfolio und aktiven Standort prüfen.
- Blockrisiken und Statuskarten lesen.
- Offene Tickets, Schulden, Zugriffrisiken und Check-outs priorisieren.
- Rollenabhängige Arbeitskarten öffnen.
- Daten aktualisieren und operative Simulation prüfen.
- Aufklappbare Modul-/Phasenstatus-Übersicht einsehen (zeigt den internen Lieferstand aller 15 Projektphasen, eine interne Projektsteuerungsansicht, keine Kundenfunktion).

### Worauf sollte ich achten

- Menüpunkt ist für berechtigte Rollen sichtbar.
- Karten zeigen plausible Zahlen und führen zu passenden Seiten.
- Blockauswahl verändert die angezeigten Kontextdaten.
- Live-Ereignisse sind lesbar und nicht abgeschnitten.

## 4.2 Daire Matrix

Zentrale operative Matrix für Einheiten, Blöcke, Eigentümer, Bewohner, Preise, Schulden, Dokumente, Service- und Zugangsdaten.

### Was kann ich hier tun

- Einheiten nach Block, Nummer, Eigentümer, Bewohner, Status und Preisquelle suchen.
- Kategorien wie Daire, Servis, Finans, Belge, Mesaj, Uyum und Rapor als Schnellfilter nutzen.
- Index und Folgeaufgaben prüfen.
- Daten aktualisieren, Datenprüfung starten und Änderungswunsch anlegen.
- Einheiten aus Sicht von Verkauf, Betrieb, Finanzen und Service lesen.

### Worauf sollte ich achten

- Suche liefert passende Ergebnisse und zeigt bei leeren Treffern einen verständlichen Hinweis.
- Filterdialog öffnet verständlich, schließt sauber und zeigt angewendete Kriterien.
- Index und Kategoriechips ändern die Ergebnislogik ohne Seitenbruch.
- Leere Ergebnisse zeigen einen hilfreichen Zustand.
- **Neu:** Die Hauptansicht dieser Seite zeigt aktuell durchgehend Demo-Daten, auch wenn die Plattform bereits mit einer Kunden-Datenbank verbunden ist. Ob eine Aktion (Datenprüfung, Änderungswunsch) tatsächlich in die echte Datenbank schreibt, hängt vom jeweiligen Button ab, im Zweifel bei der Projektleitung nachfragen.

## 4.3 Müşteri Adayları (korrigierte Beschreibung)

**Wichtiger Hinweis zu dieser Version:** Diese Seite ist trotz des Namens **keine klassische Verkaufs-Lead-Liste** mit Budget, Quelle und Temperatur-Einstufung. Sie zeigt eine CRM-artige Aufbereitung der bestehenden Eigentümer- und Bewohnerdatensätze: aktive Bewohner, risikobehaftete Datensätze, WhatsApp-Kommunikationspräferenz und eine „KI-Kommunikationspriorität"-Liste, die vorschlägt, wen Betrieb/Verwaltung als Nächstes kontaktieren sollten.

### Was kann ich hier tun

- Bewohner-/Eigentümerdatensätze nach Risiko, Kommunikationspräferenz und Priorität prüfen.
- Vorgeschlagene nächste Kontaktaufnahme sehen.
- Mehrsprachige Beratungskontexte für Russisch, Türkisch, Deutsch und Englisch berücksichtigen.

### Worauf sollte ich achten

- Suche und Sortierung funktionieren.
- Statuslabels sind verständlich.
- Rollen ohne entsprechendes Recht sehen diese Seite nicht.
- Diese Seite ist reine Demo-Anzeige ohne Datenbankanbindung, unabhängig vom Verbindungsstatus der Plattform.

## 4.4 Servis Talepleri

Interner Ticketbereich für Wartung, Service, Beschwerden, SLA, Außendienst und Freigaben.

### Was kann ich hier tun

- Tickets nach Priorität, Status, SLA, Kategorie und Verantwortlichem prüfen.
- Ticketdetails öffnen und nächste Aktion lesen.
- Schuldenregel und Freigabepflicht erkennen.
- Einen neuen Serviceauftrag über den Katalog anfragen, die Anfrage geht in eine Freigabe-Warteschlange, aus der Verantwortliche/Verwaltung sie bestätigen.
- Außendienstnachweise wie Foto, Video oder Notiz **vorbereiten**.

### Worauf sollte ich achten

- Ticketkarten und Tabellen sind klickbar, fokussierbar und verständlich.
- SLA-Verletzungen und hohe Priorität sind sichtbar.
- Nicht berechtigte Rollen können keine Freigaben ausführen.
- **Wichtig:** Ein tatsächlicher Foto-/Video-Upload ist aktuell **nicht möglich**, die angezeigte Zahl bei „Medya kanıtı" ist ein reiner Platzhalterzähler, kein hochgeladener Nachweis. Diese Funktion ist für eine spätere Ausbaustufe vorgesehen.
- Die Zuweisung eines Mitarbeiters zu einer Feldaufgabe und der Statuswechsel (angenommen/erledigt) sind im Board sichtbar, aber aktuell nicht per Klick veränderbar, Änderungen erfolgen bislang außerhalb der Plattform.

## 4.5 Reservasyon

Buchung, Check-in, Check-out, Deposit, Aufgaben und Gästekommunikation.

### Was kann ich hier tun

- Buchungen und Reservierungsstatus prüfen.
- Check-in-Aufgaben, Zugangsvorbereitung und Dokumentanforderungen verfolgen.
- Check-out, Schaden, Reinigung, Kautionsprüfung und Rückerstattung vorbereiten.
- Sperren wegen Schulden oder fehlenden Nachweisen erkennen.

### Worauf sollte ich achten

- Buchungsdaten sind chronologisch und verständlich.
- Deposit- und Check-out-Informationen sind nicht versteckt.
- **Wichtig:** Eine **neue Reservierung/Buchung lässt sich auf dieser Seite aktuell nicht anlegen**, es gibt kein Formular dafür. Die Seite zeigt ausschließlich ein festes Set an Beispielbuchungen zu Demo-Zwecken; das gilt unabhängig davon, ob die Plattform mit einer Kunden-Datenbank verbunden ist.
- Edge Cases wie verspätete Anreise, Schaden, fehlender Ausweis und Schuldenblocker sind als Konzept sichtbar, aber ebenfalls nur an den Demo-Buchungen demonstriert.

## 4.6 Erişim & Uyum

Zugangs- und Compliance-Bereich für EIDS, Zugangskarten, Einschränkungen, Audits und Freigaben. Enthält zusätzlich einen Bereich zur Käufer-Eignungs-Vorprüfung (Budget, Bezirksprüfung, Gutachtenpflicht) für Vertriebsinteressenten, ausdrücklich ohne Rechtsgarantie.

### Was kann ich hier tun

- Gesperrte oder eingeschränkte Einheiten prüfen.
- Grund für Zugangsbeschränkung lesen.
- Compliance-Status und nächste Freigabe erkennen.
- Käuferakten zur Eignungs-Vorprüfung einsehen (Ziel, Budget, Status, nächste Aktion).
- Provider-Platzhalter für Zugangskarten und Kameras später mit Live-System verbinden.

### Worauf sollte ich achten

- Sensible Zugangsdaten sind nur für berechtigte Rollen sichtbar.
- Zugangssperren sind mit Grund, Status und Verantwortlichem nachvollziehbar.
- Eine Zugangssperre wird nicht automatisch ohne Freigabe ausgelöst, und aktuell überhaupt nicht automatisch ausgeführt, unabhängig von einer Freigabe (reine Anzeige der Empfehlung).
- Die Käufer-Eignungsprüfung ist eine reine Vertriebs-Vorqualifizierung ohne rechtliche Verbindlichkeit.

## 4.7 Finans & Aidat

Finanzbereich für Gebühren, Salden, Zahlungen, Schulden, Kautionen, Rückerstattung und Inkasso.

### Was kann ich hier tun

- Offene Salden und Schuldstatus prüfen.
- Zahlungs- und Gebührenstatus nachvollziehen.
- Kautions- und Rückerstattungsstatus prüfen.
- Schuldrestriktionen für Service, Zugang oder Reservierung erkennen.
- Finanzdaten exportieren, wenn die Rolle berechtigt ist, dies erzeugt aktuell einen Freigabe-/Prüfvermerk, keine tatsächlich exportierte Datei.

### Worauf sollte ich achten

- Buchhaltungsrolle sieht Finanzdetails, andere Rollen nur ihre erlaubten Auszüge.
- Summen, Währung und Status wirken plausibel.
- Freigabe- und Exportaktionen sind klar beschriftet.
- Demo-Daten sind klar von echten produktiven Zahlungen getrennt.
- **Wichtig:** Es gibt aktuell **keine Möglichkeit, auf dieser Seite eine neue Zahlung oder Buchung zu erfassen**, die Ansicht ist ein reiner Kontoauszug über bereits vorhandene (Demo-)Daten. Die oberen Kennzahlenkarten (erwartete Monatszahlung, Cashflow) bleiben unabhängig vom Anbindungsstatus immer Demo-Werte; nur die darunterliegende Ledger-Liste kann bei Kunden-Datenbankanbindung echte Werte zeigen.
- Eine Kaution wird nicht automatisch mit offenen Schulden verrechnet, dies bleibt eine manuell zu prüfende Empfehlung.

## 4.8 Belgeler

Dokumentenbereich für Upload, Dokumentpakete, KYC, TAPU, Service-Nachweise, Verträge, Review und Retention.

### Was kann ich hier tun

- Dokumente je Einheit, Person, Kategorie und Status suchen.
- Dokumentpakete für Move-in, Check-out, Eigentümerstatement, KYC/TAPU und Service prüfen.
- Dateien in der Demo- oder Schulungsumgebung hochladen und Reviewstatus verfolgen.
- Ablaufdaten, Retention-Klasse und Berechtigungen prüfen.

### Worauf sollte ich achten

- Upload validiert Pflichtfelder, Typ und Größe (max. 25 MB).
- Dokumente anderer Eigentümer oder Mieter sind nicht sichtbar.
- Reviewstatus ist klar: offen, genehmigt oder abgelehnt.
- **Wichtig:** Ein hochgeladenes Dokument wird nur dann tatsächlich gespeichert, wenn die Plattform ausdrücklich für produktiven Dokumentenspeicher freigeschaltet ist. Ist das nicht der Fall (Standardzustand), wird die Datei nur geprüft (Typ, Größe, Prüfsumme), aber **nicht abgelegt**, die Oberfläche meldet dennoch einen Erfolg. Für Demo/Schulung ist das unkritisch, sollte aber bei einer Live-Vorführung klar kommuniziert werden.

## 4.9 Raporlar

Reporting für Management, Betrieb, Finanzen, Zugang, Gäste, Services und AI-gestützte Zusammenfassungen.

### Was kann ich hier tun

- Berichte nach Bereich, Frequenz, Verantwortlichem und Metrik prüfen.
- Management- und Finanzkennzahlen lesen.
- Exportierte Berichte als kontrollierte Aktion behandeln (erzeugt einen Freigabevermerk, keine tatsächliche Exportdatei).
- KI-Premium-Empfehlungskarten (Daily Briefing, Service-Triage, Zahlungsrisiko, Buchungsprüfung u. a.) ansehen.

### Worauf sollte ich achten

- Diagramme und Kennzahlen sind modern, lesbar und nicht dekorativ überladen.
- Rollen sehen nur erlaubte Reports.
- Ein eigenständiger Mitarbeiterleistungs-Report fehlt aktuell (nur indirekt über die Tickets-Seite erkennbar).
- Der angezeigte Cashflow ist monatlich aggregiert, nicht täglich, wie ursprünglich vom Kunden gewünscht.
- **Wichtig:** Die KI-Premium-Karten (inkl. angezeigter „Konfidenz"-Prozentwerte) sind vollständig vorgefertigte Demo-Inhalte, es findet dahinter aktuell **keine echte KI-Berechnung** statt. Bei einer Präsentation sollten diese Karten ausdrücklich als Konzept-/Zielbild kommuniziert werden, nicht als bereits funktionierende KI-Auswertung.

## 4.10 İletişim

Kommunikation für Nachrichten, Vorlagen, Benachrichtigung, Sprache, Ankündigungen und Servicekommunikation.

### Was kann ich hier tun

- Nachrichten und Vorlagen nach Sprache und Anwendungsfall prüfen.
- Kommunikation zu Buchung, Check-in, Check-out, Service, Zahlung und Dokumenten vorbereiten.
- Mehrsprachige Texte prüfen, ohne Nutzer zu überfluten.

### Worauf sollte ich achten

- Texte sind kurz, professionell und rollenbezogen.
- Sprache bleibt konsistent.
- **Wichtig:** Es wird aktuell **keine echte Nachricht versendet**, weder per WhatsApp, E-Mail noch SMS. Jede „Antwort vorbereiten"/„Zustellung erneut versuchen"-Aktion erzeugt nur einen internen Protokolleintrag, keinen tatsächlichen Versand. Live-Versand ist erst nach Provider-Freigabe vorgesehen.

## 4.11 Offline-Sync

Offline-Warteschlange für Feldarbeit, schwache Verbindung, Konflikte und spätere Synchronisation.

### Was kann ich hier tun

- Offline-Einträge und Sync-Status prüfen.
- Konflikte, Wiederholungen und letzte Synchronisation lesen.
- Für Außendienst testen, ob Aufgaben auch bei instabiler Verbindung verständlich bleiben.

### Worauf sollte ich achten

- Der Bereich erklärt klar, ob Daten synchronisiert oder nur vorbereitet sind, dieser Hinweis ist bereits zutreffend im Code umgesetzt.
- Fehlerzustände sind verständlich.
- Die Plattform selbst ist bereits als installierbare Web-App (PWA) mit Grundgerüst-Cache nutzbar, das funktioniert schon jetzt unabhängig vom Demo-Status. Die eigentliche **Offline-Schreibsynchronisation und Push-Benachrichtigungen sind dagegen noch nicht umgesetzt**.

## 4.12 Benutzer & Rollen

Verwaltung von Mitarbeitern, Rollen, Bewohnerbeziehungen, Sprachen, Workload und Freigabeberechtigungen.

### Was kann ich hier tun

- Teammitglieder und aktive Aufgaben prüfen.
- Rollen, Freigabelimits und Zuständigkeiten lesen.
- Eigentümer, Mieter und Gäste als getrennte Beziehungen verstehen.
- **Kiracı zaman erişimi (Mieter-Zeitzugang):** Eigentümer-gesponserte, zeitlich begrenzte Zugangseinladungen für Mieter einsehen, verlängern (z. B. um 90 Tage) oder widerrufen.

### Worauf sollte ich achten

- Rollenlabels stimmen mit dem RBAC-Modell überein.
- Benutzer- und Bewohnerdaten sind sauber getrennt.
- Keine Rolle bekommt mehr Sichtbarkeit als notwendig.
- **Wichtig:** Das Mieter-Zeitzugang-Panel ist aktuell eine **reine Vorführ-Simulation ohne dauerhafte Speicherung**, jede neu erstellte, verlängerte oder widerrufene Einladung geht beim Neuladen der Seite verloren. Für eine Schulung/Demo ist das unproblematisch, sollte aber nicht als bereits produktiv nutzbare Funktion dargestellt werden.

## 4.13 Einstellungen

Konfiguration, Provider-Status, Systemkontrollen, Integrationen, Sicherheit und Projektparameter.

### Was kann ich hier tun

- Provider-Readiness für Zahlung, SMS, E-Mail, Banking, Zugang, Kamera und Dokumentenspeicher prüfen.
- System- und Sicherheitskontrollen lesen.
- Einstellungen als vorbereitete Produktionsplanung verstehen.

### Worauf sollte ich achten

- Demo-Status und Live-Status sind klar unterscheidbar.
- Sensible Werte wie API-Schlüssel werden nicht angezeigt.
- Einstellungen sind für nicht berechtigte Rollen nicht änderbar.
- Von den angezeigten Integrationskategorien ist ausschließlich die Datenbank-Anbindung (Supabase) selbst tatsächlich aktiv, alle externen Provider-Kategorien (Zahlung, Banking, SMS, E-Mail, Zugang, Kamera) sind Platzhalter/Konzept ohne echte Verbindung.

---

# 5. New Level Premium, öffentlicher Bereich (neu in diesem Handbuch)

Dieses Kapitel war in Version 1 des Handbuchs nicht enthalten, obwohl der Bereich bereits vollständig entwickelt und getestet ist. Er ist **ohne Login erreichbar** und richtet sich an Interessenten, Eigentümer, Mieter, Gäste und Dienstleister, die noch keinen Systemzugang haben.

## 5.1 Öffentliche Landingpage

Erreichbar unter `/[sprache]/new-level-premium` (z. B. `/tr/new-level-premium`). Die Seite ist nach der AIDA-Methode aufgebaut (Aufmerksamkeit, Interesse, Wunsch, Handlung, mit zusätzlichem Fokus auf Loyalität/Weiterempfehlung) und stellt das Referenzprojekt New Level Premium vor. Ziel ist es, Besucher zur Registrierung oder zu einer Meldung zu führen.

## 5.2 Kontofreie Registrierung

Im Abschnitt „Registrieren" kann sich jede Person ohne bestehenden Account für einen von drei Zugängen bewerben: **Eigentümer**, **Mieter** oder **Mitarbeiter**. Eine Bewerbung als Verwaltung, Verantwortlicher oder Buchhaltung ist über dieses öffentliche Formular technisch ausgeschlossen, das ist eine bewusste Sicherheitsgrenze, kein Fehler. Owner/Tenant müssen zusätzlich einen Identitätsnachweis (Ausweis- oder Passnummer plus Ausstellungsland) angeben.

**Was danach passiert:** Die Anfrage wird in eine interne Warteschlange gestellt und wartet auf Prüfung durch das Team. **Wichtiger Hinweis:** Aktuell gibt es noch keine eigene Dashboard-Ansicht, in der Verantwortliche diese eingehenden Anfragen sammeln und freigeben können, die Prüfung muss vorerst außerhalb der Plattform organisiert werden, bis diese Ansicht nachgebaut ist.

## 5.3 Identitätsprüfung

Im Registrierungsformular kann die Identität über einen Button „Kimliğimi doğrula" (Identität bestätigen) geprüft werden. Ohne angebundenen externen Prüfdienst erfolgt dies aktuell **simuliert** (eine plausibel aussehende Ausweisnummer wird als „bestätigt" markiert, eine zu kurze als „zu prüfen"). Es wird dabei kein Ausweisfoto oder Selfie hochgeladen oder gespeichert, das Formular enthält aktuell keine entsprechende Funktion.

## 5.4 Öffentlicher Meldekanal

Im Abschnitt „Melden" kann jede Person, auch ohne Registrierung, ein Problem melden (Reinigung, Technik, Sicherheit, Garten, Amenity, Lärm, Sonstiges), mit Ort, Kurzbeschreibung und optionalem Kontakt. Die Meldung wird ausschließlich intern weitergeleitet; es werden keine internen Daten an den Melder zurückgegeben. **Wichtiger Hinweis:** Eine Meldung wird nicht automatisch in ein Serviceticket umgewandelt, das muss das Team manuell nachvollziehen, bis dieser Schritt automatisiert ist.

## 5.5 QR-Poster für den Vor-Ort-Einsatz

Unter `/[sprache]/new-level-premium/report-poster` lässt sich ein druckfertiges Poster mit QR-Code öffnen und ausdrucken, das direkt zum Meldeformular (5.4) führt, gedacht zum Aushängen vor Ort (z. B. am Eingang oder im Aufzug). **Hinweis:** Dieses Poster ist aktuell nicht von der Landingpage aus verlinkt; es muss direkt über die URL oder den bereits gedruckten QR-Code aufgerufen werden.

## 5.6 Öffentlicher KI-Assistent (Concierge)

Auf der Landingpage und im New-Level-Premium-Bereich steht ein Chat-Assistent zur Verfügung, der Interessenten bei allgemeinen Fragen hilft und zur Registrierung ermutigt. Siehe Kapitel 6 für die genaue Funktionsweise und die Verbindung zum internen Assistenten.

---

# 6. KI-Assistenten, Integrationen und Grenzen

## 6.1 Zwei miteinander verbundene KI-Assistenten

1Cati verwendet **zwei unterschiedliche, aber verbundene** KI-Assistenten, dieser Zusammenhang war in Version 1 des Handbuchs nicht erklärt:

| | Interner Assistent | Öffentlicher Assistent (Concierge) |
|---|---|---|
| Wo sichtbar | Im eingeloggten Dashboard | Auf der Landingpage und im New-Level-Premium-Bereich |
| Wer nutzt ihn | Eingeloggte Rollen (rollenabhängige Antworten) | Anonyme Besucher, ohne Login |
| Datenzugriff | Greift auf Kontext der eigenen Rolle zu (z. B. offene Tickets, Schulden) | Hat **grundsätzlich keinen Zugriff** auf interne Kundendaten, konstruktionsbedingt datenblind |
| Zweck | Zusammenfassungen, Prioritäten, Textentwürfe, Rollenhinweise | Interessenten helfen, sich zu registrieren, allgemeine Fragen beantworten |
| Verbindung | Erhält als „Interesse-Analytics" anonymisierte Themen aus den Fragen des öffentlichen Assistenten (keine persönlichen Daten), um besser zu verstehen, welche Fragen Interessenten häufig stellen | Speist diese Analytics an das interne System zurück |

Beide Assistenten sind an denselben, austauschbaren KI-Gateway-Mechanismus angeschlossen. Ist kein solcher Dienst konfiguriert (Standardzustand), antworten beide Assistenten mit vorbereiteten, regelbasierten Antworten statt mit einer freien KI-Antwort, die Qualität bleibt dabei zuverlässig, ist aber nicht durch ein Sprachmodell erzeugt.

## 6.2 Grenzen beider Assistenten

- KI darf keine Zahlung buchen.
- KI darf keine Rückerstattung freigeben.
- KI darf keine Zugangssperre aktivieren.
- KI darf keine Rolle ändern.
- KI darf sensible Daten nur im Rahmen der aktuellen Rolle verwenden, der öffentliche Assistent hat gar keinen Zugriff auf solche Daten.
- KI-Antworten sind Vorschläge und müssen bei kritischen Entscheidungen menschlich geprüft werden.
- Beide Assistenten antworten in der Sprache, in der die Frage gestellt wurde.

## 6.3 Externe Anbieter

Die Plattform ist für Integrationen vorbereitet. Live-Anbindungen werden erst aktiviert, wenn Verträge, API-Schlüssel, technische Freigaben und fachliche Freigaben vorliegen.

| Bereich | Aktueller Stand | Produktionsfreigabe nötig |
|---|---|---|
| Zahlung | Provider-ready und Demo-Kontext | Vertrag, API-Key, Webhook, Refund-Regel, Buchhaltungstest |
| Banking | Konzept und Platzhalter | Bankfreigabe, API-Zugriff, Konto-Mapping, Abstimmung |
| SMS | Vorlagen und Providerplanung | SMS-Vertrag, Sender-ID, Kostenfreigabe, Opt-in-Regeln |
| E-Mail | Vorlagen und Benachrichtigungskonzept | Domain, SPF, DKIM, DMARC, Provider-Key |
| **Push-Benachrichtigungen** *(neu ergänzt)* | **Noch nicht umgesetzt**, auch nicht als Platzhalter | Konzept, Provider, technische Umsetzung stehen noch aus |
| Dokumentenspeicher | Upload- und DB-Pfad vorbereitet, technisch funktionsfähig aber standardmäßig inaktiv | Supabase Storage oder S3 Bucket, Retention, Zugriffspolitik |
| Zugangskarten | Compliance- und Statusmodell vorbereitet | Hardwareanbieter, API, Rollenfreigabe, Notfallprozess |
| Kameras | Nur konzeptionell und datenschutzsensibel | Rechtsprüfung, Kameraanbieter, Zugriffsbeschränkung |

---

# 7. Demo-Center (Vertrieb), kurzer Hinweis

Zusätzlich zum Dashboard existiert eine öffentliche Vertriebs-/Präsentationsseite unter `/[sprache]/pitch`. Sie richtet sich an Vertriebsgespräche und Stakeholder-Präsentationen (Preismodell, Kaufargumente, Rollenübersicht, Demo-Ablaufplan) und ist kein Teil des operativen Tagesgeschäfts. Sie wird hier nur erwähnt, damit Team-Mitglieder wissen, dass sie existiert, für die tägliche Arbeit sind die Kapitel 1–6 relevant.

---

# 8. Wichtige Arbeitsabläufe

## Tagesstart Verantwortlicher

| Schritt | Aktion | Erwartetes Ergebnis |
|---|---|---|
| 1 | Übersicht öffnen | Portfolio, Blockrisiko, offene Tickets, Schulden und Check-outs sind sichtbar. |
| 2 | Kritische Karten prüfen | SLA-Verstoß, Zugangssperre, Zahlung oder Check-out wird priorisiert. |
| 3 | In Detailseite wechseln | Klick auf Karte führt zur passenden Seite. |
| 4 | Nächste Aktion dokumentieren | Aktion ist im Kontext der Rolle nachvollziehbar. |

## Einheit finden und Auskunft geben

| Schritt | Aktion | Erwartetes Ergebnis |
|---|---|---|
| 1 | Daire Matrix öffnen | Such- und Filterbereich ist sichtbar. |
| 2 | Block, Einheit oder Person suchen | Passende Einheiten erscheinen, leere Suche zeigt verständliche Meldung. |
| 3 | Status prüfen | Preis, Zahlung, Dokumente, Service und Zugang sind zusammen lesbar. |
| 4 | Änderung anfordern | Wenn Daten fehlen, wird ein Änderungswunsch statt stiller Änderung ausgelöst. |

## Service-Ticket bearbeiten

| Schritt | Aktion | Erwartetes Ergebnis |
|---|---|---|
| 1 | Servis Talepleri öffnen | Ticketliste und Prioritäten sind sichtbar. |
| 2 | Ticket auswählen | Beschreibung, SLA, Verantwortlicher, Schuldregel und nächste Aktion sind verständlich. |
| 3 | Nachweis ergänzen | Notiz kann vorbereitet werden; Foto-/Video-Upload ist aktuell nicht funktionsfähig. |
| 4 | Freigabe prüfen | Hohe Kosten, Zugang oder Schuldenblock erzeugen Manager- oder Buchhaltungsprüfung. |

## Registrierungsanfrage aus dem New-Level-Premium-Bereich bearbeiten *(neu)*

| Schritt | Aktion | Erwartetes Ergebnis |
|---|---|---|
| 1 | Interessent registriert sich öffentlich (Kapitel 5.2) | Anfrage wird in die interne Warteschlange gestellt. |
| 2 | Team wird informiert (aktuell außerhalb der Plattform zu organisieren) | Identität und Berechtigung werden geprüft. |
| 3 | Freigabe/Ablehnung | Aktuell nur als Status-Vermerk möglich, die eigentliche Konto-/Zugangsanlage muss derzeit noch manuell erfolgen. |

## Rückfrage oder Problem melden

| Schritt | Aktion | Erwartetes Ergebnis |
|---|---|---|
| 1 | Problem kurz beschreiben | Seite, Rolle und Sprache sind genannt. |
| 2 | Screenshot oder kurze Notiz ergänzen | Die zuständige Person kann den Fall schnell verstehen. |
| 3 | An verantwortliche Person weitergeben | Management, Admin oder Projektteam erhält alle nötigen Informationen. |
| 4 | Rückmeldung abwarten | Korrektur, Erklärung oder nächste Aktion wird nachvollziehbar geklärt. |

---

# 9. Hilfe und Support

Wenn eine Funktion unklar ist, Daten fehlen oder eine Aktion nicht wie erwartet möglich ist, sollte zuerst der zuständige Verantwortliche informiert werden. Die Plattform ist rollenbasiert aufgebaut. Deshalb ist es normal, dass nicht jeder Nutzer jede Seite oder jede Aktion sieht.

## Was sollte ich bei einer Rückfrage angeben

- Welche Seite ist betroffen, zum Beispiel Daire Matrix, Tickets, Finanzen oder Dokumente.
- Mit welcher Rolle wurde gearbeitet.
- Welche Sprache war aktiv.
- Welche Einheit, welches Ticket, welche Reservierung oder welches Dokument war betroffen.
- Was sollte passieren und was ist tatsächlich passiert.
- Falls möglich: ein Screenshot ohne unnötige private Daten.

## Wichtige Grenzen

| Bereich | Regel |
|---|---|
| Finanzen | Zahlungen, Rückerstattungen, Kautionen und Schuldrestriktionen brauchen fachliche Prüfung und Freigabe, und sind aktuell technisch ohnehin nur als Anzeige/Empfehlung umgesetzt, nicht als automatischer Vollzug. |
| Zugang | Zugangssperren, Zugangskarten und sicherheitsrelevante Änderungen dürfen nicht automatisch oder ohne Freigabe erfolgen. |
| Dokumente | Produktive Dokumente dürfen erst nach Speicher-, Berechtigungs- und Datenschutzfreigabe verwendet werden. |
| Rollen | Rollen und Berechtigungen dürfen nur durch berechtigte Administratoren geändert werden. |
| KI | Beide KI-Assistenten unterstützen nur mit Vorschlägen. Kritische Entscheidungen bleiben bei Menschen. |
| Öffentlicher Bereich | Registrierungen und Meldungen aus dem New-Level-Premium-Bereich benötigen aktuell eine manuelle Nachbearbeitung außerhalb der Plattform (siehe Kapitel 5.2, 8). |

---

# 10. Kurz-FAQ

| Frage | Antwort |
|---|---|
| Ist das System produktiv live? | Nein. Es ist als Demo- und Einführungsstand vorbereitet. Produktivbetrieb braucht finale Daten, Provider, Security, UAT und Launch-Freigabe. |
| Sind Zahlungen echt? | Nein. Finanzdaten und Zahlungen sind Demo-Daten, bis der Kunde Live-Provider bestätigt. |
| Kann ich eine neue Reservierung anlegen? | Nein, aktuell nicht, die Reservierungsseite zeigt nur bestehende Beispielbuchungen (siehe 4.5). |
| Kann ich eine neue Zahlung/Buchung im Finanzbereich erfassen? | Nein, aktuell nicht, der Finanzbereich ist ein reiner Kontoauszug über vorhandene Daten (siehe 4.7). |
| Kann ich ein Foto zu einem Serviceticket hochladen? | Nein, aktuell nicht, nur ein Zähler wird angezeigt, kein echter Upload (siehe 4.4). |
| Kann ich echte Dokumente hochladen? | Für Demo und Schulung bitte nur Beispieldokumente verwenden. Ohne produktive Speicherfreigabe wird eine Datei zwar geprüft, aber nicht dauerhaft abgelegt. |
| Wie unterscheiden sich die zwei KI-Assistenten? | Der interne Assistent im Dashboard kennt den Kontext der eingeloggten Rolle; der öffentliche Assistent auf der Landingpage kennt grundsätzlich keine internen Daten und hilft nur bei allgemeinen Fragen und der Registrierung (siehe Kapitel 6). |
| Kann sich jemand ohne Account registrieren? | Ja, im öffentlichen New-Level-Premium-Bereich als Eigentümer, Mieter oder Mitarbeiter (siehe Kapitel 5.2). Eine interne Freigabe-Ansicht dafür fehlt aktuell noch. |
| Warum sehe ich eine Seite nicht? | Die Rolle hat wahrscheinlich keine Berechtigung. Das ist Teil des RBAC-Sicherheitsmodells. |
| Was mache ich bei einem Problem? | Die zuständige Person informieren und Seite, Rolle, Sprache, kurze Beschreibung und wenn möglich einen Screenshot angeben. |
| Darf KI Entscheidungen treffen? | Nein. KI unterstützt nur. Kritische Finanz-, Zugangs-, Refund- und Rollenentscheidungen bleiben menschlich. |

---

# 11. Änderungsnotizen

- **Version 1** (01. Juli 2026): Erste Fassung, basierend auf dem Entwicklungsstand zu diesem Zeitpunkt, den vorhandenen Dashboardseiten, dem RBAC-Modell und den Screenshots aus der lokalen Demo-Umgebung.
- **Version 2** (07. Juli 2026): Ergänzt um den öffentlichen New-Level-Premium-Bereich (Kapitel 5, war komplett unbeschrieben), die Erklärung der zwei verbundenen KI-Assistenten (Kapitel 6.1, war unvollständig), den Ein-Klick-Demo-Zugang (Kapitel 2.3), das Mieter-Zeitzugang-Panel (Kapitel 4.12) und das Demo-Center (Kapitel 7). Korrigiert: die Beschreibung von „Müşteri Adayları" (Kapitel 4.3, beschrieb zuvor ein nicht mehr aktives Datenmodell), sowie mehrere „Worauf sollte ich achten"-Hinweise, wo eine Funktion nur Anzeige, aber keine Erfassung/Ausführung erlaubt (Reservierung, Finanzbuchung, Foto-Upload, Nachrichtenversand, Dokumentenspeicher).
- Bei Änderungen an Rollen, Navigation, API, Dokumentenablage, Providerstatus oder produktivem Betriebsablauf muss dieses Handbuch erneut aktualisiert werden.
