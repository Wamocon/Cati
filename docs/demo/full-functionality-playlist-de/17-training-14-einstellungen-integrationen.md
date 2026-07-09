# Video 17 - Training 14: Einstellungen und Integrationen

Stand: 8. Juli 2026  
Sprache: Deutsch  
Vertraulichkeit: STRICTLY CONFIDENTIAL  
Videotitel: Training 14: Einstellungen und Integrationen  
Playlist-Position: 17 / Property-Manager-Playlist  
Zielzeit: 4 Minuten  
Zielgruppe: Admin, Management, WAMOCON Delivery  
Recorder-Szenen: S16  
Route(n): `/dashboard/settings`  
Zweck: Eigenständiges Trainingskapitel für Review, Aufnahme, Übersetzung und spätere Aktualisierung.  
Quelle: `../1cati-full-functionality-playlist-script-de.md`

## Skript

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
