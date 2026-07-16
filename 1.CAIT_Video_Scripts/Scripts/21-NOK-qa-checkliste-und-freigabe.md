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
6. Am Ende Englisch, Russisch und Türkisch aus der freigegebenen deutschen Struktur ableiten, nicht aus einer rohen Maschinenübersetzung.

## 14. Kurzfassung für interne Abstimmung

Wir produzieren keine einzelne lange Schulung, sondern eine professionelle Video-Playlist.

Jedes Kapitel beginnt mit Kontext, nicht direkt mit Funktionen. Das ist für nicht-technische Zuschauer entscheidend.

Die Struktur erklärt zuerst das Problem, dann den geschäftlichen Nutzen, dann die Oberfläche und erst danach das konkrete Beispiel.

Dadurch versteht Management nicht nur, wo man klickt, sondern warum die Funktion für Betrieb, Kontrolle, Kosten und Kundenerlebnis relevant ist.
