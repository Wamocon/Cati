# Produktionsdatei 21 - QA-Checkliste und Freigabe

Stand: 8. Juli 2026  
Sprache: Deutsch  
Vertraulichkeit: STRICTLY CONFIDENTIAL  
Zweck: Inhaltliche, sprachliche, visuelle und fachliche Freigabe vor HeyGen-Verbrauch und Kundenversand.  
Quelle: `../1cati-full-functionality-playlist-script-de.md`

## QA-Checkliste

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
- Alle Videos werden für Türkisch, Russisch, Englisch und Deutsch geplant.
- Pro Sprache müssen Titel, Hook, Sprechertext, Untertitel und Overlays geprüft werden.
- Bei Zeit- oder HeyGen-Credit-Limit hat Türkisch Priorität, weil es die primäre Kundensprache ist.
- Übersetzungen werden aus der freigegebenen deutschen Struktur abgeleitet, aber sprachlich pro Zielgruppe geprüft.

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
- Deutsche Version nutzt Valeris in HeyGen gespeicherte Stimme.
- Die Stimme bleibt ruhig, professionell und nicht werblich.

### Laufzeit

- Wortzahl pro Skript wurde vor der Aufnahme geprüft.
- Erwartete Länge basiert auf 125-140 deutschen Wörtern pro Minute plus Klick-/Scroll-Puffer.
- Tatsächliche Länge wird nach Screen Recording gemessen.
- Kapitel über 7 Minuten werden geteilt oder im Schnitt klar kapitelweise getrennt.

## 13. Empfohlene nächste Schritte

1. Dieses deutsche Masterdokument fachlich freigeben.
2. Automatisierten Screen-Recorder `npm run record:playlist` für die freigegebenen Kapitel ausführen; Compliance, New Level Premium und Public AI Concierge sind als eigene Szenen enthalten.
3. Deutsche Sprecherfassung in HeyGen testen, zuerst mit Pitch und Kapitel 00.
4. Nach Freigabe die CEO-Version produzieren.
5. Danach die Property-Manager-Kapitel einzeln produzieren.
6. Am Ende Englisch und Türkisch aus der freigegebenen deutschen Struktur ableiten, nicht aus einer rohen Maschinenübersetzung.

## 14. Kurzfassung für interne Abstimmung

Wir produzieren keine einzelne lange Schulung, sondern eine professionelle Video-Playlist.

Jedes Kapitel beginnt mit Kontext, nicht direkt mit Funktionen. Das ist für nicht-technische Zuschauer entscheidend.

Die Struktur erklärt zuerst das Problem, dann den geschäftlichen Nutzen, dann die Oberfläche und erst danach das konkrete Beispiel.

Dadurch versteht Management nicht nur, wo man klickt, sondern warum die Funktion für Betrieb, Kontrolle, Kosten und Kundenerlebnis relevant ist.
