# 1Cati Full Functionality Playlist - German Master Script

Stand: 8. Juli 2026  
Sprache: Deutsch  
Ziel: Vollständige Video-Playlist für Management, Kundentest und Property-Management-Schulung  
Vertraulichkeit: STRICTLY CONFIDENTIAL  
App-Stand: aktuelle `apps/web` Anwendung nach Jira-Bugfix-Paket, `main` Commit `538b1f8d`  

Hinweis: Die produktionsfähige Split-Version mit einem separaten Dokument pro Video liegt unter `docs/demo/full-functionality-playlist-de/README.md`.

## 1. Zweck

Dieses Dokument ist die deutsche Master-Vorlage für die vollständige 1Cati Video-Playlist.

Die Playlist soll drei Zielgruppen gleichzeitig bedienen:

1. Geschäftsführung und Auftraggeber, die schnell verstehen müssen, warum 1Cati wirtschaftlich sinnvoll ist.
2. Management und Projektleitung, die sehen müssen, wie die Plattform im Alltag gesteuert wird.
3. Property Manager, Buchhaltung, Service-Team und Kundentestende, die lernen müssen, wie man das System Schritt für Schritt benutzt.

Der Stil ist bewusst einfach. Die Zuschauer sollen nicht das Gefühl haben, eine technische Software-Schulung zu sehen. Sie sollen verstehen: Welches Problem löst dieses Modul, wer arbeitet damit, was sieht man im System, und wo liegt der geschäftliche Nutzen?

## 2. Produktionsprinzip

Die Videos werden nicht als ein langer Monolog produziert. Die richtige Struktur ist eine Playlist mit klaren Kapiteln.

Das hat drei Vorteile:

- Die Geschäftsführung kann nur den Überblick anschauen.
- Ein Property Manager kann gezielt einzelne Module lernen.
- Spätere Änderungen können pro Kapitel neu aufgenommen werden, ohne die gesamte Produktion zu wiederholen.

Die Produktion folgt aktuellen Video- und Lern-Best-Practices:

- Kurzer Einstieg statt langer Begrüßung. Der Wert muss in den ersten Sekunden klar werden.
- Reale Produktaufnahmen statt abstrakter Folien.
- Ein Gedanke pro Kapitel.
- Kurze Kapitel für Orientierung, längere Kapitel nur dort, wo ein echter Arbeitsablauf erklärt wird.
- Immer klare Trennung zwischen live nutzbar, UAT-ready und provider-abhängig.
- Avatar oder Sprecher nur als Führung durch die Demo, nicht als Ersatz für die Produktansicht.

Referenzquellen für diese Struktur:

- [Wyzowl Video Marketing Statistics 2026](https://wyzowl.com/video-marketing-statistics/): kurze Videos, Explainer und Produktdemos erhöhen Verständnis und Vertrauen.
- [Nielsen Norman Group Video Usability](https://www.nngroup.com/articles/video-usability/): Einstieg kurz halten, Wert sofort zeigen, Videos knapp und klar schneiden.
- [TechSmith Instructional Video Guide 2026](https://www.techsmith.com/blog/instructional-videos/): Tutorials brauchen Plan, Skript, Storyboard und klare Lernziele.
- [HeyGen Pricing](https://www.heygen.com/pricing): 1080p reicht für die erste Produktion; 4K oder sehr lange Videos nur bei Pro/Business relevant.

## 3. Status-Wording für alle Videos

Diese Begriffe müssen in jedem Kapitel konsistent verwendet werden.

| Begriff | Bedeutung im Video |
|---|---|
| Live im Demo-System | Die Funktion ist in der aktuellen Anwendung sichtbar und nutzbar. |
| UAT-ready | Die Grundlage ist gebaut, muss aber mit Kundendaten, Fachabteilung oder Testfreigabe validiert werden. |
| Provider-abhängig | Die Oberfläche und der Ablauf sind vorbereitet, aber echte Aktivierung braucht Anbieter, Vertrag, API-Key, Rechts-/Finanzfreigabe oder Produktionsfreigabe. |
| Menschliche Freigabe | Kritische Aktionen werden nicht autonom von KI oder Automatisierung ausgeführt. Eine berechtigte Rolle muss prüfen und bestätigen. |

Nicht sagen:

- "Alle Zahlungen laufen automatisch live", solange kein echter Zahlungsanbieter freigegeben ist.
- "KI entscheidet selbst", weil die Plattform absichtlich mit menschlicher Kontrolle arbeitet.
- "Native App ist fertig", weil die aktuelle Strategie PWA/mobile Web zuerst ist.
- "Produktionslaunch abgeschlossen", solange Phase 15, UAT, Security und Provider-Freigaben offen sind.

## 4. Gesamtpaket der Videos

| Ebene | Video | Länge | Ziel |
|---|---:|---:|---|
| 1 | Pitch-Video | 1:20-1:30 | Schneller Eindruck für Entscheider. |
| 2 | CEO/Management-Walkthrough | 8-10 Min. | Geschäftsmodell, Kontrolle, Rollen, Nutzen, Grenzen. |
| 3 | Property-Manager-Playlist | 35-45 Min. gesamt | Training und vollständige Funktionsführung. |
| 4 | Einzelclips je Modul | 2-6 Min. | Nachschlagen und gezieltes Lernen. |

## 5. Standard-Kapitelstruktur

Jedes Funktionskapitel folgt dieser Struktur.

1. Kurzer Hook  
   Ein reales Problem aus dem Alltag: Was passiert ohne System?

2. Warum ist das wichtig?  
   Business-Kontext: Zeit, Kosten, Risiko, Transparenz, Kontrolle.

3. Was lernen wir in diesem Kapitel?  
   Ein Satz, der Orientierung gibt.

4. Ziel der Funktion  
   Was macht das Modul?

5. Wer nutzt sie?  
   Rollen und Abteilungen.

6. Was sieht man im System?  
   Einfache Erklärung der Oberfläche.

7. Beispiel-Szenario  
   Ein realistischer Ablauf aus dem Tagesgeschäft.

8. Live vs. UAT / Provider-abhängig  
   Saubere Erwartungshaltung.

9. Management-Takeaway  
   Ein kurzer Satz, der den Wert zusammenfasst.

Diese Struktur ist absichtlich wiederholbar. Wiederholung hilft nicht-technischen Zuschauern, sich in einer komplexen Plattform sicher zu orientieren.

## 6. Recording Backbone

Die aktuelle Anwendung enthält bereits einen Playwright Recorder:

`apps/web/scripts/demo-record.mjs`

Dieser Recorder ist die technische Basis für die Produktaufnahmen. Er enthält verifizierte Szenen, Rollen, Routen und Statusangaben. Für die deutsche Masterproduktion werden primär diese Szenen verwendet.

| Szene | Route | Rolle | Thema |
|---|---|---|---|
| S00 | `/pitch` | Manager | Angebot und Demo Center |
| S01 | `/dashboard` | Manager | Was 1Cati ist |
| S02 | `/login` | Manager | Login und Rollen |
| S03 | `/dashboard` | Manager | Dashboard und 15-Phasen-Status |
| S04 | `/dashboard/listings` | Manager | 769 Einheiten, Blöcke, Wohnungen |
| S05 | `/dashboard/users` | Admin | Personen, Eigentümer, Mieter, Team |
| S06 | `/dashboard/finance` | Accountant | Finanz-Hauptbuch |
| S07 | `/dashboard/finance` | Accountant | Zahlungen, Kautionen, Sperren |
| S08 | `/dashboard/tickets` | Manager | Servicekatalog und Tickets |
| S09 | `/dashboard/tickets` | Staff | Feldaufgaben, SLA, Mediennachweis |
| S10 | `/dashboard/calendar` | Manager | Kalender, Reservierung, Check-in/Checkout |
| S11 | `/dashboard/communications` | Manager | Kommunikation und Benachrichtigungen |
| S12 | `/dashboard/documents` | Manager | Dokumente und Compliance |
| S13 | `/dashboard/reports` | Manager | Reports und Analytics |
| S14 | `/dashboard` | Manager | KI-Assistent und KI-Hinweise |
| S15 | `/dashboard/offline` | Staff | Mobile/PWA und Offline-Queue |
| S16 | `/dashboard/settings` | Admin | Einstellungen und Integrationen |
| S17 | `/dashboard` | Manager | Roadmap und Abschluss |

## 7. Pitch-Video: 1:20-1:30

### Ziel

Dieses Video ist der schnelle Einstieg. Es soll nicht trainieren. Es soll Interesse, Vertrauen und Verständnis erzeugen.

### Deutsche Sprecherfassung

Eine große Wohnanlage lässt sich heute nicht mehr sauber mit Excel, WhatsApp und einzelnen Dateien steuern.

Es geht nicht nur um Daten. Es geht darum, dass die richtige Person zur richtigen Zeit die richtige Information sieht.

1Cati ist die digitale Betriebszentrale für moderne Wohnanlagen.

Management, Buchhaltung, Service-Team, Eigentümer und Mieter arbeiten in einem gemeinsamen System. Aber jede Rolle sieht nur das, was sie wirklich sehen darf.

Im Dashboard erkennt das Management sofort: Welche Einheiten sind aktiv? Welche Zahlungen sind offen? Welche Services warten? Welche Aufgaben sind kritisch? Wo entsteht ein Risiko?

Die Wohnungsmatrix zeigt die Anlage mit Blöcken, Etagen und Einheiten. Serviceanfragen werden zu Aufgaben. Zahlungen, Kautionen und Sperren werden nachvollziehbar. Dokumente, Kommunikation und Berichte bleiben an einem Ort.

Die KI unterstützt beim Zusammenfassen, Priorisieren und Vorbereiten. Aber kritische Entscheidungen, zum Beispiel Finanzen, Zugang oder Rollenrechte, bleiben immer unter menschlicher Kontrolle.

Für den Kunden bedeutet das: weniger Chaos, mehr Transparenz, schnellere Entscheidungen und ein professioneller Betrieb ohne eigenes schweres IT-Projekt.

Das ist 1Cati: Einheiten, Menschen, Services, Finanzen und Entscheidungen in einer Plattform.

### Visuals

- Start mit Dashboard-KPIs.
- Kurzer Schnitt auf Login/Rollen.
- Wohnungsmatrix mit 769 Einheiten.
- Service-Tickets und SLA.
- Finanzmodul.
- KI-Hinweise.
- Abschluss mit Angebot und Demo Center.

## 8. CEO/Management-Walkthrough: 8-10 Minuten

### Ziel

Dieses Video ist für Auftraggeber, Geschäftsführung und nicht-technisches Management. Es erklärt nicht jede Schaltfläche, sondern die wirtschaftliche Logik und die Steuerbarkeit.

### Kapitel

1. Warum 1Cati gebraucht wird.
2. Was die Plattform grundsätzlich macht.
3. Rollen und Datenschutz.
4. Dashboard als Entscheidungszentrale.
5. Betrieb der 769 Einheiten.
6. Service, Finanzen und Dokumente.
7. KI mit menschlicher Kontrolle.
8. WAMOCON Modell und klare Grenzen.

### Deutsche Sprecherfassung

Willkommen zur Management-Übersicht von 1Cati.

In diesem Video geht es nicht um technische Details. Es geht um die Frage, wie eine moderne Wohnanlage im Alltag kontrolliert, transparent und professionell geführt werden kann.

Eine Anlage mit vielen Einheiten, Eigentümern, Mietern, Servicefällen, Zahlungen, Dokumenten und Mitarbeitern erzeugt jeden Tag viele kleine Entscheidungen. Wenn diese Informationen in Excel-Listen, E-Mails, WhatsApp-Gruppen und einzelnen Ordnern verteilt sind, verliert das Management Zeit und Kontrolle.

1Cati bringt diese Bereiche in eine gemeinsame Betriebszentrale.

Das System verbindet Einheiten, Menschen, Finanzen, Service, Dokumente, Kommunikation und Berichte. Jede Rolle arbeitet mit derselben Plattform, aber mit anderen Berechtigungen.

Ein Admin sieht die gesamte Systemsteuerung. Ein Manager steuert den operativen Alltag. Die Buchhaltung sieht Finanzdaten und Freigaben. Das Service-Team sieht Aufgaben und Nachweise. Eigentümer und Mieter sehen nur ihre eigenen berechtigten Informationen.

Das ist wichtig, weil ein gutes System nicht nur mehr Daten anzeigen darf. Es muss die Daten auch sicher begrenzen.

Im Dashboard sieht das Management zuerst die Lage der Anlage. Offene Forderungen, Servicefälle, Belegung, Aufgaben, Risiken und KI-Hinweise werden an einem Ort sichtbar. Das Dashboard ist damit nicht nur eine Übersicht. Es ist der tägliche Startpunkt für Entscheidungen.

Die Wohnungsmatrix zeigt die reale Struktur der Anlage. Blöcke, Etagen und Einheiten werden so dargestellt, dass ein Property Manager schnell erkennt: Welche Einheit ist frei, belegt, reserviert, in Wartung oder gesperrt? Wer ist Eigentümer? Gibt es offene Zahlungen? Gibt es Dokumente oder aktive Tickets?

Im Servicebereich werden Anfragen in geregelte Arbeitsabläufe übersetzt. Eine Meldung wird nicht mehr nur in einem Chat geschrieben und vergessen. Sie wird als Ticket erfasst, bekommt Priorität, SLA, Zuständigkeit und Nachweis.

Für die Buchhaltung ist entscheidend, dass Zahlungen, offene Beträge, Kautionen und Einschränkungen nachvollziehbar werden. Das Finanzmodul ersetzt keine rechtliche oder buchhalterische Freigabe. Es macht sichtbar, was geprüft werden muss.

Dokumente, Kommunikation und Berichte unterstützen denselben Gedanken: weniger Suche, weniger doppelte Arbeit, bessere Nachvollziehbarkeit.

Die KI ist dabei eine unterstützende Ebene. Sie kann Anfragen zusammenfassen, Risiken markieren, Antworten vorbereiten und tägliche Hinweise geben. Aber sie führt keine sensiblen Aktionen allein aus. Geld, Zugang, Rückerstattung, Einschränkung und Rollenwechsel bleiben menschliche Entscheidungen.

Das ist ein wichtiger Punkt für Vertrauen: 1Cati ist modern, aber nicht unkontrolliert.

Das WAMOCON Modell macht die Umsetzung für den Kunden planbarer. Der Kunde muss kein eigenes schweres Softwareprojekt tragen. WAMOCON übernimmt Aufbau, Betrieb, Wartung und Weiterentwicklung. Für den Kunden entsteht ein klarer monatlicher Serviceansatz statt eines großen Entwicklungsrisikos.

Gleichzeitig bleiben wir ehrlich in der Darstellung. Einige Bereiche sind im System sichtbar und UAT-ready, brauchen aber vor der Produktion noch Kundendaten, Provider, Verträge, API-Keys oder finale Freigaben. Dazu gehören zum Beispiel echte Zahlungsanbieter, Bankanbindung, SMS/E-Mail Versand, Zugangshardware und finale Produktionsprozesse.

Der Nutzen für das Management ist klar: 1Cati macht den Betrieb sichtbarer, Entscheidungen schneller, Verantwortlichkeiten klarer und die Kommunikation professioneller.

Das ist nicht nur eine Softwareoberfläche. Es ist ein Betriebsmodell für moderne Wohnanlagen.

## 9. Property-Manager-Playlist

Die folgende Playlist ist die vollständige Trainings- und Lernstruktur. Jedes Kapitel kann einzeln produziert und später als eigenständiges Video veröffentlicht werden.

### 00 - Orientierung für Zuschauer

Länge: 3-4 Minuten  
Routen: `/pitch`, `/dashboard`  
Szenen: S00, S01, S17  
Zielgruppe: alle Zuschauer  

#### Hook

Bevor wir Funktionen zeigen, müssen wir klären, wie man 1Cati richtig betrachtet.

#### Warum ist das wichtig?

1Cati ist kein einzelnes Modul. Es ist ein Betriebssystem für eine Wohnanlage. Wer ohne Kontext in einzelne Seiten springt, sieht viele Tabellen und Karten, versteht aber nicht automatisch den Zusammenhang.

#### Was lernen wir?

Wir lernen, welche Rollen es gibt, welche Bereiche live sind, was UAT-ready bedeutet und warum die Playlist in Kapiteln aufgebaut ist.

#### Sprecherfassung

Willkommen zur vollständigen 1Cati Playlist.

Diese Playlist ist wie eine geführte Schulung aufgebaut. Sie können sie komplett anschauen oder einzelne Kapitel nutzen, wenn Sie nur ein bestimmtes Modul verstehen möchten.

Wichtig ist: 1Cati ist nicht nur eine Webseite und nicht nur ein CRM. Es ist eine digitale Betriebszentrale für eine Wohnanlage.

Die Plattform verbindet Einheiten, Eigentümer, Mieter, Mitarbeiter, Servicefälle, Finanzen, Dokumente, Kommunikation und Entscheidungen.

Jede Rolle sieht nur das, was sie sehen darf. Das macht das System sicherer und einfacher. Ein Manager braucht andere Informationen als ein Buchhalter. Ein Mitarbeiter im Feld braucht andere Informationen als ein Eigentümer.

In den Videos verwenden wir drei Statusbegriffe.

Wenn wir sagen "live im Demo-System", dann ist die Funktion heute sichtbar und nutzbar.

Wenn wir sagen "UAT-ready", dann ist die Grundlage gebaut, muss aber mit Kundendaten und Fachabteilung getestet werden.

Wenn wir sagen "provider-abhängig", dann ist die Oberfläche vorbereitet, aber die echte Aktivierung braucht einen externen Anbieter, einen Vertrag oder Produktionsfreigaben.

Diese Unterscheidung ist wichtig, damit niemand die Demo falsch versteht.

Wir beginnen mit Orientierung, Rollen und Dashboard. Danach gehen wir Schritt für Schritt durch Wohnungen, Menschen, Service, Kalender, Finanzen, Dokumente, Kommunikation, Compliance, Berichte, KI, mobile Nutzung und Integrationen.

Am Ende soll jeder Zuschauer verstehen: Was kann 1Cati heute zeigen, wie arbeitet man damit, und welche nächsten Entscheidungen sind vor dem Produktivbetrieb nötig?

#### Management-Takeaway

Die Playlist ist kein Werbevideo, sondern eine klare Lern- und Entscheidungsgrundlage.

### 01 - Login, Rollen und Datenschutz

Länge: 3 Minuten  
Route: `/login`  
Szenen: S02  
Zielgruppe: Management, Tester, alle Rollen  

#### Hook

Ein System ist nur dann professionell, wenn nicht jeder alles sehen kann.

#### Warum ist das wichtig?

In einer Wohnanlage gibt es Finanzdaten, Eigentümerdaten, Mieterdaten, Dokumente und interne Aufgaben. Diese Informationen müssen sauber getrennt werden.

#### Sprecherfassung

In diesem Kapitel geht es um Rollen und Zugriff.

Auf der Login-Seite sieht man die verschiedenen Zugangsprofile. Für die Demo können wir Rollen direkt auswählen, damit das System ohne echte Zugangsdaten getestet werden kann.

Die Plattform kennt sechs Hauptrollen.

Der Admin verwaltet das gesamte System.

Der Manager steuert den Betrieb der Anlage.

Die Buchhaltung arbeitet mit Zahlungen, offenen Beträgen, Kautionen und Berichten.

Das Service-Team sieht Aufgaben, Routen, SLA-Zeiten und Nachweise.

Eigentümer sehen nur Informationen zu ihren eigenen Einheiten.

Mieter sehen ihre erlaubten Anfragen, Reservierungen, Dokumente und Kommunikation.

Der wichtigste Punkt ist nicht nur, welche Menüpunkte sichtbar sind. Der wichtigste Punkt ist, dass jede Rolle auch innerhalb eines Moduls nur die passenden Aktionen sieht.

Ein Mieter darf zum Beispiel kein globales Finanzmodul öffnen. Ein Mitarbeiter darf keine Rollen ändern. Ein Manager kann operativ steuern, aber nicht automatisch sensible Finanzaktionen durchführen.

Für die Demo ist dieser Rollenwechsel sehr nützlich. Für die Produktion wird echte Authentifizierung mit Supabase und Kundenvorgaben verwendet. Die lokalen Demo-Profile sind für kontrollierte QA- und Demo-Umgebungen gedacht.

#### Beispiel-Szenario

Ein Tester meldet sich zuerst als Manager an und sieht alle operativen Module. Danach meldet er sich als Mieter an und sieht nur eigene Servicefälle, Kalender, Dokumente und Kommunikation. So wird sichtbar, dass die Plattform nicht nur Funktionen hat, sondern auch Schutzgrenzen.

#### Live vs. UAT / Provider-abhängig

Rollenlogik und Demo-Zugriffe sind live im System. Produktionsauthentifizierung, finale Nutzeranlage und organisatorische Rechtevergabe müssen vor Launch mit dem Kunden freigegeben werden.

#### Management-Takeaway

Rollenbasierter Zugriff macht 1Cati sicherer, einfacher und besser testbar.

### 02 - Dashboard und Tagessteuerung

Länge: 4 Minuten  
Route: `/dashboard`  
Szenen: S01, S03, S17  
Zielgruppe: Management, Property Manager  

#### Hook

Ohne zentrale Übersicht beginnt jeder Arbeitstag mit Nachfragen: Was ist offen, was ist kritisch, wer muss handeln?

#### Warum ist das wichtig?

Ein Property Manager braucht nicht mehr Informationen, sondern schnellere Orientierung.

#### Sprecherfassung

Das Dashboard ist der Startpunkt für den täglichen Betrieb.

Hier sieht das Management in einem Bild, was in der Anlage passiert. Es geht um Einheiten, offene Beträge, Servicefälle, Termine, Aufgaben und Risiken.

Die Kennzahlen helfen, den Tag zu priorisieren. Welche Forderungen sind offen? Welche Servicefälle sind dringend? Welche Aufgaben laufen außerhalb des SLA? Gibt es Hinweise, die geprüft werden müssen?

Das Dashboard ist nicht als reine Statistikseite gedacht. Es ist eine Entscheidungszentrale.

Darunter zeigt die Plattform den aktuellen Phasen- und Modulstatus. Das ist für Management und Kunde wichtig, weil man nicht raten muss, was bereits gebaut ist und was noch UAT oder Provider-Freigabe braucht.

Ein gutes ERP-System muss nicht nur Funktionen zeigen. Es muss auch klar machen, welche Funktionen stabil, testbereit oder abhängig von externen Entscheidungen sind.

#### Beispiel-Szenario

Der Property Manager öffnet morgens das Dashboard. Er sieht offene Servicefälle, überfällige Aufgaben und Finanzhinweise. Danach entscheidet er, ob zuerst das Service-Team, die Buchhaltung oder die Kommunikation angesprochen werden muss.

#### Live vs. UAT / Provider-abhängig

Dashboard, KPI-Struktur, Rollenansicht und Phasenstatus sind live im Demo-System. Produktionszahlen müssen mit echten Kundendaten validiert werden.

#### Management-Takeaway

Das Dashboard macht aus verteilten Informationen eine steuerbare Tageslage.

### 03 - 769 Einheiten, Blöcke und Wohnungsmatrix

Länge: 5 Minuten  
Route: `/dashboard/listings`  
Szenen: S04  
Zielgruppe: Property Manager, Management, Admin  

#### Hook

Bei 769 Einheiten reicht eine Liste nicht mehr. Man braucht Struktur.

#### Warum ist das wichtig?

Die Verwaltung muss schnell wissen, welche Einheit frei, belegt, reserviert, in Wartung oder eingeschränkt ist.

#### Sprecherfassung

In diesem Kapitel sehen wir die Wohnungsmatrix.

Die Anlage wird nicht als lose Tabelle dargestellt, sondern als echte Struktur: Blöcke, Etagen und Einheiten.

Für jede Einheit kann das Team erkennen: Wo liegt sie, welchen Status hat sie, wer ist zugeordnet, gibt es offene Beträge, gibt es aktive Servicefälle, und welche Dokumente oder Einschränkungen sind relevant?

Der Vorteil ist einfach: Ein Property Manager muss nicht in verschiedenen Dateien suchen. Er öffnet die Einheit und sieht den Kontext.

Die Filter helfen, schnell bestimmte Einheiten zu finden. Zum Beispiel kann man nach einer Einheit wie A-42 suchen oder nach Statusgruppen arbeiten.

Für Management ist diese Sicht besonders wichtig, weil sie zeigt: Die Plattform kann eine große Anlage operativ abbilden, nicht nur einzelne Kundenkarten.

#### Beispiel-Szenario

Ein Eigentümer ruft an und fragt nach dem Status seiner Wohnung. Der Manager sucht die Einheit, öffnet den Eintrag und sieht sofort Belegung, Servicekontext, Zahlstatus und relevante Hinweise.

#### Live vs. UAT / Provider-abhängig

Matrix, Suche und Demo-Daten sind live. Finale Kundendatenmigration und Datenbereinigung müssen vor Produktion gesondert geprüft werden.

#### Management-Takeaway

Die Wohnungsmatrix macht eine große Anlage operativ greifbar.

### 04 - Menschen: Eigentümer, Mieter, Personal

Länge: 4 Minuten  
Route: `/dashboard/users`  
Szenen: S05  
Zielgruppe: Admin, Manager  

#### Hook

Immobilienverwaltung ist nicht nur Verwaltung von Einheiten. Es ist Verwaltung von Beziehungen.

#### Warum ist das wichtig?

Eigentümer, Mieter und Mitarbeiter brauchen unterschiedliche Daten, Rechte und Kommunikationswege.

#### Sprecherfassung

Das Nutzermodul zeigt, welche Personen im System arbeiten oder vom System betreut werden.

Eigentümer sind mit ihren Einheiten verbunden. Mieter haben eine begrenzte Sicht auf ihre gemietete Einheit. Mitarbeiter gehören zu Rollen, Teams und Aufgaben.

Das System ist deshalb nicht nur eine Adressliste. Es ist der Ort, an dem Rollen, Verantwortlichkeiten und Zugriffsgrenzen zusammenkommen.

Für die Verwaltung bedeutet das: Wenn eine Person etwas sehen oder tun darf, muss das mit ihrer Rolle übereinstimmen.

Ein Eigentümer soll seine eigenen Dokumente sehen können, aber keine fremden Einheiten. Ein Mitarbeiter soll seine Aufgabe sehen, aber keine Finanzdetails. Ein Manager soll Aufgaben zuweisen können, aber nicht jedes Systemrecht besitzen.

#### Beispiel-Szenario

Ein neuer Mitarbeiter wird dem Service-Team zugeordnet. Das Management prüft, welche Rolle er bekommt und welche Module sichtbar werden. Danach kann er in der mobilen Ansicht seine Aufgaben sehen, aber keine Finanzdaten.

#### Live vs. UAT / Provider-abhängig

Rollenmodell, Nutzeransicht und Demo-Profile sind live. Bulk-Onboarding und finale Kundendaten müssen vor Launch mit echten Daten getestet werden.

#### Management-Takeaway

Das Nutzermodul verbindet Menschen, Rollen und Verantwortlichkeiten in einem kontrollierten System.

### 05 - Service-Tickets, SLA und Aufgaben

Länge: 6 Minuten  
Route: `/dashboard/tickets`  
Szenen: S08, S09  
Zielgruppe: Manager, Service-Team, Property Manager  

#### Hook

Ein Servicefall, der nur in WhatsApp steht, ist kein kontrollierter Arbeitsauftrag.

#### Warum ist das wichtig?

Servicequalität entsteht nicht durch schnelle Antworten allein. Sie entsteht durch Zuständigkeit, Priorität, SLA und Nachweis.

#### Sprecherfassung

Im Service-Modul werden Anfragen in echte Arbeitsabläufe übersetzt.

Ein Service kann aus einer Meldung entstehen: zum Beispiel eine defekte Klimaanlage, ein Wasserproblem, eine Tür, die nicht richtig schließt, oder eine Reinigungsaufgabe.

Das System zeigt Servicekatalog, Priorität, SLA, mögliche Kostenlogik, Zuständigkeit und Status.

Der Manager sieht, welche Anfragen offen sind, welche überfällig sind, welche durch offene Zahlungen blockiert sein können und welche Nachweise fehlen.

Das Service-Team sieht eine andere Perspektive. Mitarbeiter sehen ihre Aufgaben, die wichtigsten Details, den SLA-Zeitpunkt und ob Mediennachweise erforderlich sind.

Die Plattform ist so aufgebaut, dass ein Servicefall nicht in einer Nachricht endet. Er wird geplant, zugewiesen, erledigt und dokumentiert.

Die KI kann dabei helfen, eine Anfrage zusammenzufassen oder einen Ticket-Entwurf zu erstellen. Aber der Entwurf bleibt kontrolliert und braucht bei kritischen Abläufen menschliche Prüfung.

#### Beispiel-Szenario

Ein Mieter meldet, dass die Balkontür klemmt. Das System erstellt einen Ticket-Entwurf, ordnet Priorität und Kategorie zu, zeigt die betroffene Einheit und hält fest, dass menschliche Freigabe nötig ist. Der Manager prüft, bestätigt und weist die Aufgabe dem Service-Team zu.

#### Live vs. UAT / Provider-abhängig

Ticketlisten, Servicekatalog, SLA-Ansichten, Aufgaben und Freigabeprinzip sind live beziehungsweise UAT-ready. Echte Zahlungs-/Provider-Abhängigkeiten müssen vor Produktion bestätigt werden.

#### Management-Takeaway

Das Service-Modul verwandelt lose Meldungen in nachvollziehbare Arbeit.

### 06 - Kalender, Reservierung, Check-in und Checkout

Länge: 4 Minuten  
Route: `/dashboard/calendar`  
Szenen: S10  
Zielgruppe: Manager, Property Manager, Service-Team  

#### Hook

Reservierungen sind nicht nur Termine. Sie lösen Reinigung, Zugang, Kaution, Dokumente und Übergabe aus.

#### Warum ist das wichtig?

Wenn diese Schritte getrennt laufen, entstehen Fehler am kritischsten Punkt: beim Gast, Mieter oder Eigentümer vor Ort.

#### Sprecherfassung

Der Kalender zeigt Reservierungen, Termine und Übergaben im Kontext der Anlage.

Für das Management ist wichtig zu sehen, welche Einheit belegt ist, welche Übergaben anstehen, welche Check-outs vorbereitet werden müssen und welche Aufgaben daran hängen.

Ein guter Kalender ist nicht nur ein Datum. Er verbindet Verfügbarkeit, Service, Zugang, Dokumente und Abrechnung.

In 1Cati ist diese Grundlage sichtbar. Die Plattform zeigt, wie Reservierungen, Aufgaben und Übergaben zusammen gedacht werden.

Für das Service-Team bedeutet das: Reinigung, Kontrolle, Mediennachweis und Abschluss sind nicht mehr manuell zu koordinieren. Sie werden Teil eines gemeinsamen Ablaufs.

#### Beispiel-Szenario

Eine Einheit hat morgen Checkout. Das Management sieht den Termin, den Übergabestatus, mögliche offene Aufgaben und kann prüfen, ob Reinigung, Schadenserfassung oder Kautionslogik vorbereitet werden muss.

#### Live vs. UAT / Provider-abhängig

Kalender, Reservierungsansicht und Betriebslogik sind UAT-ready. Vollständige automatische Zugangsfreischaltung, Zahlungs-/Kautionsabwicklung und Checkout-Abrechnung sind provider- und freigabeabhängig.

#### Management-Takeaway

Der Kalender macht aus Terminen koordinierte Betriebsprozesse.

### 07 - Finanzen, Zahlungen, Kautionen und Sperren

Länge: 6 Minuten  
Route: `/dashboard/finance`  
Szenen: S06, S07  
Zielgruppe: Buchhaltung, Management, Admin  

#### Hook

Wenn Zahlungen, Kautionen und offene Beträge in Excel liegen, entstehen Diskussionen, Verzögerungen und Risiko.

#### Warum ist das wichtig?

Finanzen brauchen Nachvollziehbarkeit. Wer hat bezahlt? Was ist offen? Welche Aktion braucht Freigabe?

#### Sprecherfassung

Das Finanzmodul zeigt die finanzielle Lage der Anlage und einzelner Einheiten.

Hier geht es um Beiträge, Zahlungen, offene Beträge, Kautionen, Einschränkungen und Prüfprozesse.

Für die Buchhaltung ist wichtig, dass Einträge nicht einfach als Text in einer Tabelle stehen. Sie müssen einem Konto, einer Einheit, einem Status und einer Prüfung zugeordnet sein.

Das System zeigt Hauptbuch-Logik, Zahlungspläne, offene Forderungen und Kontrollbereiche.

Ein sensibler Bereich sind Sperren oder Einschränkungen. Wenn eine Einheit offene Beträge hat, kann das System Hinweise geben oder Einschränkungen markieren. Aber solche Regeln müssen fachlich, rechtlich und buchhalterisch freigegeben werden.

Deshalb ist die Plattform bewusst kontrolliert. Sie macht sichtbar, was geprüft werden muss. Sie ersetzt nicht die Freigabe durch die verantwortliche Rolle.

#### Beispiel-Szenario

Ein Eigentümer hat offene Beträge. Die Buchhaltung sieht die Positionen im Finanzmodul. Der Manager sieht, ob ein Service dadurch blockiert sein könnte. Eine kritische Entscheidung wird dokumentiert und bleibt nachvollziehbar.

#### Live vs. UAT / Provider-abhängig

Finanzansicht, Ledger-Struktur, Kontrollkarten und Audit-Prinzip sind UAT-ready. Echte Bank-, Zahlungsanbieter- und rechtliche Sperrlogik brauchen Provider- und Kundengenehmigung.

#### Management-Takeaway

Das Finanzmodul schafft Transparenz, bevor Entscheidungen oder Sperren ausgelöst werden.

### 08 - Dokumente, Uploads und Nachweise

Länge: 4 Minuten  
Route: `/dashboard/documents`  
Szenen: S12  
Zielgruppe: Manager, Buchhaltung, Service-Team, Eigentümer  

#### Hook

Ein Dokument, das nicht gefunden wird, ist im Betrieb fast so schlecht wie ein Dokument, das nicht existiert.

#### Warum ist das wichtig?

Verträge, Ausweise, Zahlungsnachweise, Servicefotos und Übergabeunterlagen müssen strukturiert, sicher und rollenbasiert zugänglich sein.

#### Sprecherfassung

Das Dokumentenmodul sammelt wichtige Dateien an einem kontrollierten Ort.

Dazu gehören Verträge, Zahlungsunterlagen, Nachweise, Reports und Dokumentpakete.

Die Plattform zeigt nicht einfach einen Ordner. Sie verbindet Dokumente mit Rollen, Einheiten, Prozessen und Freigaben.

Ein Manager kann prüfen, welche Dokumente fehlen. Die Buchhaltung kann finanzrelevante Unterlagen sehen. Das Service-Team kann Nachweise hochladen. Eigentümer sehen nur erlaubte Dokumente zu ihrer Einheit.

Uploads werden im System sichtbar und können als ausstehend oder in Prüfung erscheinen. Dadurch ist klar, dass ein Dokument eingegangen ist, auch wenn es noch geprüft werden muss.

#### Beispiel-Szenario

Ein Mitarbeiter lädt nach einem Serviceeinsatz ein Foto oder einen Nachweis hoch. Der Manager sieht, dass der Nachweis eingegangen ist und kann den Vorgang später im Ticket- oder Dokumentenkontext prüfen.

#### Live vs. UAT / Provider-abhängig

Dokumentenansicht, Upload-Feedback und Rollenlogik sind live beziehungsweise UAT-ready. Produktive Speicher-Bucket-Regeln, Retention, Virenscan und finale Freigabeprozesse müssen vor Launch bestätigt werden.

#### Management-Takeaway

Das Dokumentenmodul reduziert Suche, Unsicherheit und fehlende Nachweise.

### 09 - Kommunikation und Benachrichtigungen

Länge: 4 Minuten  
Route: `/dashboard/communications`  
Szenen: S11  
Zielgruppe: Manager, Service-Team, Eigentümer-/Mieterbetreuung  

#### Hook

Wenn Kommunikation nur über private Chats läuft, verliert die Verwaltung den Überblick.

#### Warum ist das wichtig?

Service, Finanzen, Reservierungen und Dokumente brauchen nachvollziehbare Kommunikation.

#### Sprecherfassung

Die Kommunikationszentrale bündelt Nachrichten, Vorlagen und operative Hinweise.

Hier sieht die Verwaltung, welche Gespräche zu Einheiten, Aufgaben, Dokumenten oder Finanzthemen gehören.

Ein wichtiger Punkt ist Mehrsprachigkeit. Die Zielgruppe von Ataberk Estate ist international. Deshalb muss Kommunikation nicht nur schnell, sondern auch sprachlich verständlich sein.

Die Plattform kann Kommunikationsflüsse vorbereiten und strukturieren. Dadurch bleiben Antworten konsistent, und der Kontext geht nicht verloren.

Für die Produktion ist wichtig: Echte SMS-, E-Mail- oder Push-Provider müssen vor dem Go-live final verbunden und getestet werden. Im Demo-System zeigen wir die Struktur und den Ablauf.

#### Beispiel-Szenario

Ein Eigentümer fragt nach einem Dokument und einem offenen Servicefall. Die Verwaltung sieht die Kommunikation im Kontext der Einheit und kann die nächste Antwort vorbereiten, ohne zwischen Chat, E-Mail und Excel zu wechseln.

#### Live vs. UAT / Provider-abhängig

Kommunikationszentrum und Vorlagenlogik sind UAT-ready. Echter Versand über SMS, E-Mail oder Push ist provider-abhängig.

#### Management-Takeaway

Kommunikation wird vom Einzelchat zum nachvollziehbaren Betriebsprozess.

### 10 - Zugang, Compliance und Audit

Länge: 4 Minuten  
Route: `/dashboard/compliance`  
Szenen: ergänzend manuell oder über zukünftige Recorder-Erweiterung  
Zielgruppe: Management, Security, Admin  

#### Hook

Zugang ist keine einfache Türentscheidung. Zugang hängt an Identität, Zahlung, Kaution, Reservierung und Verantwortung.

#### Warum ist das wichtig?

Bei Wohnanlagen können falsche Zugangsentscheidungen rechtliche, finanzielle und operative Risiken erzeugen.

#### Sprecherfassung

Das Compliance-Modul zeigt, wie Zugang und Kontrolllogik gedacht werden.

Die Plattform verbindet Themen wie Identität, offene Beträge, Kaution, Reservierungsstatus, Fahrzeug- oder Türzugang und Audit.

Das Ziel ist nicht, automatisch jeden Zugang zu sperren oder freizugeben. Das Ziel ist, eine nachvollziehbare Entscheidungsgrundlage zu schaffen.

Wenn eine Person Zugang bekommen soll, muss klar sein: Wer ist sie? Zu welcher Einheit gehört sie? Gibt es eine gültige Reservierung oder Rolle? Gibt es offene finanzielle oder dokumentarische Themen? Wer hat die Entscheidung getroffen?

Der Audit Trail ist dafür entscheidend. Er hält fest, wer wann welche Entscheidung vorbereitet oder bestätigt hat.

#### Beispiel-Szenario

Ein Mieter möchte Zugang zu einer Einheit. Das System zeigt Rolle, Einheit, mögliche offene Punkte und Entscheidungskontext. Eine berechtigte Person prüft und bestätigt, statt dass eine kritische Aktion unkontrolliert passiert.

#### Live vs. UAT / Provider-abhängig

Compliance-Ansicht und Audit-Logik sind UAT-ready. Echte Zugangshardware, Kamera, Schranke, Karte oder Türsystem sind provider-abhängig.

#### Management-Takeaway

Compliance schafft nachvollziehbare Entscheidungen statt manueller Ausnahmen.

### 11 - Reports und Management-Auswertungen

Länge: 4 Minuten  
Route: `/dashboard/reports`  
Szenen: S13  
Zielgruppe: Management, Buchhaltung, Eigentümerkommunikation  

#### Hook

Ein Bericht ist nur wertvoll, wenn er Entscheidungen vorbereitet.

#### Warum ist das wichtig?

Management braucht keine unendliche Tabelle. Management braucht klare Kennzahlen, Trends, Ausnahmen und nächste Schritte.

#### Sprecherfassung

Das Report-Modul macht Daten lesbar.

Hier werden Finanzberichte, Serviceauswertungen, Personalaktivität, Schuldenlisten, Cashflow und weitere Kennzahlen in eine Managementsicht gebracht.

Der Vorteil ist, dass Berichte aus dem Systemkontext entstehen. Servicefälle, Zahlungen, Aufgaben und Dokumente sind nicht getrennte Welten.

Für die Geschäftsführung ist besonders wichtig: Berichte helfen, Muster zu erkennen. Wo häufen sich Servicefälle? Welche Forderungen sind kritisch? Welche Prozesse brauchen mehr Kontrolle?

KI kann hier unterstützen, indem sie Hinweise oder Entwürfe vorbereitet. Aber finale Reports und Entscheidungen bleiben beim Menschen.

#### Beispiel-Szenario

Am Monatsende öffnet die Buchhaltung die Reports. Sie sieht offene Beträge, geplante Auswertungen und Hinweise, welche Punkte noch Prüfung brauchen. Das Management erhält dadurch eine bessere Entscheidungsgrundlage.

#### Live vs. UAT / Provider-abhängig

Report-Ansichten und Demo-Auswertungen sind UAT-ready. Finale Berichtsformate und Exportprozesse müssen mit Kundenvorgaben geprüft werden.

#### Management-Takeaway

Reports übersetzen Betriebsdaten in Managemententscheidungen.

### 12 - KI-Assistent und KI-Grenzen

Länge: 5 Minuten  
Route: `/dashboard`, `/api/ai/chat`, öffnender Assistent im UI  
Szenen: S14  
Zielgruppe: Management, alle Rollen  

#### Hook

KI ist nur dann wertvoll, wenn sie hilft, ohne die Kontrolle zu übernehmen.

#### Warum ist das wichtig?

In einem Immobilienbetrieb sind Finanzen, Zugang, Rollen und Dokumente sensible Bereiche. KI darf dort nicht blind handeln.

#### Sprecherfassung

Der KI-Assistent ist eine unterstützende Ebene in 1Cati.

Er kann Fragen beantworten, Informationen zusammenfassen, Serviceanfragen vorbereiten, Risiken markieren und nächste Schritte vorschlagen.

Wichtig ist: Die KI arbeitet rollenbasiert. Ein Mieter darf nicht durch eine KI-Antwort globale Finanzdaten bekommen. Ein Mitarbeiter darf keine Aktionen auslösen, für die er keine Berechtigung hat.

Die KI kann zum Beispiel aus einer Nachricht einen Ticket-Entwurf erstellen. Sie erkennt Einheit, Priorität und Kategorie. Aber dieser Entwurf wird nicht automatisch als kritische Aktion ausgeführt. Er bleibt prüfbar.

Bei Finanzen, Zugang, Rückerstattung, Sperren oder Rollenwechsel ist menschliche Freigabe Pflicht.

Das ist kein Nachteil. Das ist der richtige Sicherheitsstandard für eine Plattform, die echte Betriebsentscheidungen vorbereitet.

#### Beispiel-Szenario

Ein Manager schreibt: "Bitte erstelle ein dringendes Serviceticket für Wohnung A-011, weil die Balkontür klemmt." Die KI erkennt die Anfrage und erstellt einen Entwurf. Danach entscheidet der Manager, ob daraus ein freigegebener Arbeitsablauf wird.

#### Live vs. UAT / Provider-abhängig

KI-Assistent, Sprachlogik, rollenbasierte Schutzgrenzen und Ticket-Entwürfe sind UAT-ready. Erweiterte KI-Automatisierung, Prognosen und Provider-KI-Workflows brauchen Governance und Freigabe.

#### Management-Takeaway

Die KI beschleunigt Arbeit, aber die Plattform behält menschliche Kontrolle.

### 13 - Mobile Web, PWA und Offline-Queue

Länge: 4 Minuten  
Route: `/dashboard/offline`  
Szenen: S15  
Zielgruppe: Service-Team, Property Manager, Management  

#### Hook

Eine Plattform ist im Immobilienbetrieb nur gut, wenn sie auch außerhalb des Büros funktioniert.

#### Warum ist das wichtig?

Mitarbeiter arbeiten auf Wegen, in Wohnungen, Technikräumen, Empfangsbereichen und Außenanlagen. Dort ist Verbindung nicht immer stabil.

#### Sprecherfassung

1Cati ist als mobile-freundliche Web-App gedacht.

Das bedeutet: Mitarbeiter und Nutzer können das System im Browser auf dem Handy verwenden. Für den aktuellen Stand ist das der sinnvollste Weg, weil keine separate native App gepflegt werden muss.

Der Offline-Bereich zeigt, wie Aktionen sicher vorbereitet und später synchronisiert werden können.

Wenn die Verbindung schlecht ist, darf das System nicht unkontrolliert doppelt senden oder Daten verlieren. Aktionen müssen in eine Queue, sauber angezeigt und später verarbeitet werden.

Für das Service-Team ist das besonders wichtig. Ein Mitarbeiter kann Aufgaben sehen, Nachweise vorbereiten und den Status kontrolliert aktualisieren.

#### Beispiel-Szenario

Ein Techniker ist in einem Bereich mit schwacher Verbindung. Er dokumentiert einen Einsatz, und die Aktion wird in der Offline-Queue gehalten, bis die Verbindung wieder stabil ist.

#### Live vs. UAT / Provider-abhängig

Mobile Layout, PWA-Grundlage und Offline-Queue sind UAT-ready. Native iOS-/Android-App ist nicht Teil des aktuellen bestätigten Kernumfangs.

#### Management-Takeaway

Mobile/PWA macht den Betrieb nicht nur im Büro, sondern vor Ort steuerbar.

### 14 - Einstellungen und Integrationen

Länge: 4 Minuten  
Route: `/dashboard/settings`  
Szenen: S16  
Zielgruppe: Admin, Management, WAMOCON Delivery  

#### Hook

Eine Plattform wird erst produktionsreif, wenn klar ist, welche externen Systeme wirklich verbunden sind.

#### Warum ist das wichtig?

Zahlungen, Bankdaten, SMS, E-Mail, Zugangshardware, Identitätsprüfung und Storage hängen von Anbietern, Verträgen und Zugangsdaten ab.

#### Sprecherfassung

Das Einstellungsmodul zeigt die Plattformsteuerung und Integrationsbereitschaft.

Hier geht es nicht nur um kleine UI-Einstellungen. Es geht um die Frage: Welche externen Systeme sind vorbereitet, welche sind aktiv, und welche brauchen noch Entscheidung?

Die Plattform kann Bereiche wie Zahlung, Bank, Messaging, Zugang, Identität und Dokumentenspeicher abbilden.

Für die Produktion muss aber klar sein: Wer ist der Anbieter? Wer besitzt die Zugangsdaten? Welche rechtlichen Regeln gelten? Welche Kosten sind freigegeben? Welche Fallbacks gibt es, wenn ein Anbieter nicht verfügbar ist?

Deshalb ist dieses Modul wichtig für Management und WAMOCON. Es zeigt nicht nur Technik. Es zeigt Betriebsverantwortung.

#### Beispiel-Szenario

Vor dem Go-live prüft das Team, ob Zahlungsanbieter, SMS, E-Mail, Storage und Zugriffssysteme freigegeben sind. Alles, was nicht final aktiv ist, bleibt als vorbereitet oder manuell fallback-fähig markiert.

#### Live vs. UAT / Provider-abhängig

Einstellungsansicht und Provider-Statuslogik sind UAT-ready. Viele echte Integrationen sind provider-abhängig und dürfen erst nach Freigabe produktiv geschaltet werden.

#### Management-Takeaway

Einstellungen und Integrationen machen sichtbar, was technisch vorbereitet und was geschäftlich noch zu entscheiden ist.

### 15 - Öffentliche New Level Premium Journey

Länge: 5 Minuten  
Route: `/new-level-premium`  
Szenen: aktuell ergänzend über vorhandene New-Level-Tests und separate Recording-Skripte  
Zielgruppe: Management, Vertrieb, Eigentümer-/Mieter-Onboarding  

#### Hook

Der erste Kontakt mit einer Plattform passiert oft nicht im Dashboard, sondern auf einer öffentlichen Seite.

#### Warum ist das wichtig?

Eigentümer, Mieter und Mitarbeiter brauchen einen einfachen Einstieg, bevor sie Teil des internen Systems werden.

#### Sprecherfassung

Die New Level Premium Seite zeigt die öffentliche Seite der Plattform.

Sie erklärt die Anlage, den Nutzen und den Einstieg in 1Cati. Besucher können Rollen wie Eigentümer, Mieter oder Personal auswählen und eine Anfrage starten.

Wichtig ist: Privilegierte Rollen wie Admin, Management oder Buchhaltung können nicht öffentlich beantragt werden. Das schützt die Plattform.

Die Seite enthält außerdem einen öffentlichen Meldeweg. Ein Problem kann mit Ort, Beschreibung und Zustimmung gemeldet werden. Das System gibt eine Referenz zurück.

Für den Betrieb ist das wertvoll, weil öffentliche Meldungen nicht unstrukturiert irgendwo landen. Sie werden kontrolliert aufgenommen.

Zusätzlich gibt es einen QR-Poster-Ansatz. Ein QR-Code kann an der Anlage genutzt werden, damit Bewohner oder Besucher Probleme direkt melden können.

#### Beispiel-Szenario

Ein Bewohner entdeckt ein Problem im Lobbybereich. Er scannt den QR-Code, öffnet die Meldeseite, gibt Ort und Beschreibung ein und erhält eine Referenznummer. Die Verwaltung kann den Vorgang später prüfen.

#### Live vs. UAT / Provider-abhängig

New Level Premium Seite, öffentliche Registrierung, öffentliche Meldung und Referenzlogik sind live im Demo-System. Produktionsidentitätsprüfung, Missbrauchsschutz, Retention und echte Triage müssen vor Launch final freigegeben werden.

#### Management-Takeaway

Die öffentliche Journey verbindet Marketing, Onboarding und Betrieb in einem kontrollierten Einstieg.

### 16 - Abschluss: Was ist live, was braucht Freigabe?

Länge: 3 Minuten  
Route: `/dashboard`  
Szenen: S17  
Zielgruppe: Management, Kunde, WAMOCON Delivery  

#### Hook

Eine gute Demo zeigt nicht nur, was möglich ist. Sie zeigt auch ehrlich, was vor dem Produktivbetrieb entschieden werden muss.

#### Warum ist das wichtig?

Vertrauen entsteht durch Klarheit. Gerade bei ERP, Finanzen, Zugang und KI darf nichts überversprochen werden.

#### Sprecherfassung

Zum Abschluss fassen wir die Plattform ein.

1Cati zeigt heute eine starke, zusammenhängende Grundlage für den Betrieb einer modernen Wohnanlage.

Live sichtbar sind die zentrale App, die öffentlichen Seiten, Login und Rollen, Dashboard, Wohnungsmatrix, Service, Kalender, Finanzen, Dokumente, Kommunikation, Reports, KI-Oberflächen, mobile Nutzung und Integrationsbereiche.

Viele dieser Bereiche sind UAT-ready. Das bedeutet: Sie können jetzt mit Kundendaten, Fachabteilungen und realen Abläufen geprüft werden.

Vor Produktion braucht das Projekt aber klare Entscheidungen.

Welche Zahlungs- und Bankanbieter werden genutzt? Welche SMS- und E-Mail-Provider werden aktiviert? Welche Regeln gelten für Zugang und Sperren? Wie lange werden Dokumente, Medien und KI-Protokolle gespeichert? Wer gibt finale Rollen und produktive Daten frei?

Diese Fragen sind kein technischer Fehler. Sie sind normale Go-live-Fragen eines professionellen ERP-Projekts.

Der wichtigste Punkt ist: 1Cati macht den Betrieb sichtbar, strukturiert und kontrollierbar.

Die Plattform reduziert manuelle Suche, verteilt Verantwortung sauber, unterstützt das Team mit KI und hält kritische Entscheidungen beim Menschen.

Das ist der nächste Schritt von einer klassischen Immobilienverwaltung zu einem modernen Betriebsmodell.

#### Management-Takeaway

1Cati ist bereit für strukturierte Kundentests und Management-Validierung, mit klarer Grenze zwischen Demo, UAT und Produktion.

## 10. Kapitelübersicht für HeyGen / Schnitt

| Datei | Titel | Zielzeit | Szenen |
|---|---:|---:|---|
| `1cati-pitch-de` | Pitch | 1:20-1:30 | S00, S03, S04, S08, S06, S14 |
| `1cati-ceo-walkthrough-de` | Management-Walkthrough | 8-10 Min. | S00-S04, S06-S08, S14, S17 |
| `1cati-training-00-orientierung-de` | Orientierung | 3-4 Min. | S00, S01, S17 |
| `1cati-training-01-login-rollen-de` | Login und Rollen | 3 Min. | S02 |
| `1cati-training-02-dashboard-de` | Dashboard | 4 Min. | S01, S03 |
| `1cati-training-03-einheiten-de` | 769 Einheiten | 5 Min. | S04 |
| `1cati-training-04-menschen-de` | Personen und Rollen | 4 Min. | S05 |
| `1cati-training-05-service-de` | Service und SLA | 6 Min. | S08, S09 |
| `1cati-training-06-kalender-de` | Kalender und Checkout | 4 Min. | S10 |
| `1cati-training-07-finanzen-de` | Finanzen und Sperren | 6 Min. | S06, S07 |
| `1cati-training-08-dokumente-de` | Dokumente | 4 Min. | S12 |
| `1cati-training-09-kommunikation-de` | Kommunikation | 4 Min. | S11 |
| `1cati-training-10-compliance-de` | Zugang und Compliance | 4 Min. | Compliance route, manual clip |
| `1cati-training-11-reports-de` | Reports | 4 Min. | S13 |
| `1cati-training-12-ki-de` | KI-Assistent | 5 Min. | S14 |
| `1cati-training-13-mobile-de` | Mobile/PWA | 4 Min. | S15 |
| `1cati-training-14-integrationen-de` | Einstellungen und Integrationen | 4 Min. | S16 |
| `1cati-training-15-new-level-de` | Öffentliche Journey | 5 Min. | New Level route |
| `1cati-training-16-abschluss-de` | Abschluss und UAT-Grenzen | 3 Min. | S17 |

## 11. Aufnahmehinweise

### Allgemein

- Bildschirmaufnahme in 1920 x 1080, 30 fps.
- Keine echten Kundendaten zeigen.
- Keine privaten Namen zeigen, wenn sie nicht Teil der Seed-Demo sind.
- Mausbewegungen langsam, keine hektischen Scrolls.
- Jede Szene beginnt mit 2 Sekunden Ruhe.
- Jede Szene endet mit einem sauberen Standbild.
- Untertitel immer aktivieren oder später als `.vtt` bereitstellen.

### HeyGen

- Avatar nur für Intro, Übergänge und Abschluss einsetzen.
- Produktaufnahme bleibt der Hauptinhalt.
- Deutsche Stimme ruhig, professionell, nicht werblich.
- Geschwindigkeit 0,92-0,96, weil Deutsch länger ist.
- Lange Kapitel in einzelne HeyGen-Szenen teilen.
- Erst finalen Text freigeben, dann Credits verwenden.

### Schnitt

- Kurze Titelkarten pro Kapitel.
- Keine überladenen Animationen.
- Bei komplexen Bildschirmen sanfte Zooms auf die relevante Karte.
- Kritische Grenzen als dezente Text-Overlays zeigen: "UAT-ready", "Provider-abhängig", "menschliche Freigabe".

## 12. QA-Checkliste

### Inhalt

- Jede Aussage ist im aktuellen System oder in der Dokumentation belegbar.
- Keine Produktionsbehauptung ohne Freigabe.
- Rollen und Rechte stimmen mit `apps/web/lib/rbac.ts` überein.
- Modulreihenfolge stimmt mit der Dashboard-Navigation überein.
- Live/UAT/Provider-Grenzen sind klar.

### Sprache

- Deutsch ist einfach und geschäftlich.
- Keine unnötigen technischen Begriffe.
- Wenn ein Begriff nötig ist, wird er erklärt.
- 1Cati wird konsistent ausgesprochen und geschrieben.
- Keine Mischsprache in Sprechertext oder Untertiteln.

### Bild

- Texte auf dem Bildschirm sind lesbar.
- Keine UI-Überlappungen.
- Keine Konsole, Dev-Fehler oder lokale Debug-Ausgaben.
- Keine echten personenbezogenen Daten.
- Mobile Sequenzen zeigen echte mobile Nutzbarkeit.

### Audio

- Keine langen Pausen.
- Musik leise unter der Stimme.
- Stimme klar und nicht zu schnell.
- Untertitel passen zur Sprecherfassung.

## 13. Empfohlene nächste Schritte

1. Dieses deutsche Masterdokument fachlich freigeben.
2. Fehlende Recorder-Szenen für Compliance und New Level Premium als eigene Szenen ergänzen oder mit bestehenden HeyGen-Skripten aufnehmen.
3. Deutsche Sprecherfassung in HeyGen testen, zuerst mit Pitch und Kapitel 00.
4. Nach Freigabe die CEO-Version produzieren.
5. Danach die Property-Manager-Kapitel einzeln produzieren.
6. Am Ende Englisch und Türkisch aus der freigegebenen deutschen Struktur ableiten, nicht aus einer rohen Maschinenübersetzung.

## 14. Kurzfassung für interne Abstimmung

Wir produzieren keine einzelne lange Schulung, sondern eine professionelle Video-Playlist.

Jedes Kapitel beginnt mit Kontext, nicht direkt mit Funktionen. Das ist für nicht-technische Zuschauer entscheidend.

Die Struktur erklärt zuerst das Problem, dann den geschäftlichen Nutzen, dann die Oberfläche und erst danach das konkrete Beispiel.

Dadurch versteht Management nicht nur, wo man klickt, sondern warum die Funktion für Betrieb, Kontrolle, Kosten und Kundenerlebnis relevant ist.
