# Video 04 - Training 01: Login, Rollen und Datenschutz

Stand: 8. Juli 2026  
Sprache: Deutsch  
Vertraulichkeit: STRICTLY CONFIDENTIAL  
Videotitel: Training 01: Login, Rollen und Datenschutz  
Playlist-Position: 04 / Property-Manager-Playlist  
Zielzeit: 3 Minuten  
Zielgruppe: Management, Tester, alle Rollen  
Recorder-Szenen: S02  
Route(n): `/login`  
Zweck: Eigenständiges Trainingskapitel für Review, Aufnahme, Übersetzung und spätere Aktualisierung.  
Quelle: `../1cati-full-functionality-playlist-script-de.md`

## Skript

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
