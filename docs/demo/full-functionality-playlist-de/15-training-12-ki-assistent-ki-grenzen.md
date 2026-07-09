# Video 15 - Training 12: Zwei KI-Assistenten und KI-Grenzen

Stand: 8. Juli 2026  
Sprache: Deutsch  
Vertraulichkeit: STRICTLY CONFIDENTIAL  
Videotitel: Training 12: Zwei KI-Assistenten und KI-Grenzen  
Playlist-Position: 15 / Property-Manager-Playlist  
Zielzeit: 5-6 Minuten  
Zielgruppe: Management, alle Rollen  
Recorder-Szenen: S14 plus öffentlicher Concierge auf Landing/New-Level-Seite  
Route(n): `/dashboard`, `/new-level-premium`, `/api/ai/chat`, `/api/ai/public-chat`, öffnende Assistenten im UI  
Zweck: Eigenständiges Trainingskapitel für Review, Aufnahme, Übersetzung und spätere Aktualisierung.  
Quelle: `../1cati-full-functionality-playlist-script-de.md`

## Skript

Länge: 5-6 Minuten  
Route: `/dashboard`, `/new-level-premium`, `/api/ai/chat`, `/api/ai/public-chat`  
Szenen: S14 plus öffentlicher Concierge auf Landing/New-Level-Seite  
Zielgruppe: Management, alle Rollen  

#### Hook

KI ist nur dann wertvoll, wenn sie hilft, ohne die Kontrolle zu übernehmen.

#### Warum ist das wichtig?

In einem Immobilienbetrieb sind Finanzen, Zugang, Rollen und Dokumente sensible Bereiche. KI darf dort nicht blind handeln.

#### Sprecherfassung

1Cati hat zwei KI-Erlebnisse, die unterschiedlich abgesichert sind.

Der erste Assistent ist öffentlich auf der Landing Page und auf New Level Premium sichtbar. Er beantwortet Fragen von Internetbesuchern zu Produkt, Registrierung, Sprachen, Sicherheit, Service und New Level Premium. Er ist bewusst datenblind: Er kann keine internen Bewohner-, Finanz-, Dokument- oder Wohnungsdaten sehen.

Der zweite Assistent ist im geschlossenen Dashboard. Er arbeitet rollenbasiert für Admin, Manager, Buchhaltung, Service-Team, Eigentümer oder Mieter. Er kann Fragen beantworten, Informationen zusammenfassen, Serviceanfragen vorbereiten, Risiken markieren und nächste Schritte vorschlagen.

Die Verbindung zwischen beiden Ebenen ist nicht unkontrollierter Datenaustausch. Der öffentliche Assistent protokolliert anonymisierte Themen, Sprache, Antwortqualität und Eskalationsbedarf. Diese Erkenntnisse helfen, Produktwissen und interne Antworten zu verbessern, ohne private Daten offenzulegen.

Wichtig ist: Die interne KI arbeitet rollenbasiert. Ein Mieter darf nicht durch eine KI-Antwort globale Finanzdaten bekommen. Ein Mitarbeiter darf keine Aktionen auslösen, für die er keine Berechtigung hat.

Die KI kann zum Beispiel aus einer Nachricht einen Ticket-Entwurf erstellen. Sie erkennt Einheit, Priorität und Kategorie. Bei Wasser-, Tür-, Reinigungs- oder Premium-Service-Themen kann sie die passende Zuständigkeit vorschlagen. Aber dieser Entwurf wird nicht automatisch als kritische Aktion ausgeführt. Er bleibt prüfbar.

Bei Finanzen, Zugang, Rückerstattung, Sperren oder Rollenwechsel ist menschliche Freigabe Pflicht.

Das ist kein Nachteil. Das ist der richtige Sicherheitsstandard für eine Plattform, die echte Betriebsentscheidungen vorbereitet.

#### Beispiel-Szenario

Ein Internetbesucher fragt auf der New Level Premium Seite: "Welche Services kann ich als Eigentümer nutzen?" Der öffentliche Assistent erklärt Service, Registrierung und Sprachen, ohne private Daten zu sehen.

Später schreibt ein Manager im Dashboard: "Bitte erstelle ein dringendes Serviceticket für Wohnung A-011, weil Wasser aus dem Hahn läuft." Die interne KI erkennt die Anfrage, Kategorie, Einheit und Priorität und erstellt einen Entwurf. Danach entscheidet der Manager, ob daraus ein freigegebener Arbeitsablauf wird.

#### Live vs. UAT / Provider-abhängig

Öffentlicher AI Concierge, interne Dashboard-KI, Sprachlogik, rollenbasierte Schutzgrenzen, öffentliche Themen-Telemetrie und Ticket-Entwürfe sind UAT-ready beziehungsweise im aktuellen System sichtbar. Erweiterte Lernschleifen, Prognosen, automatische externe Provider-Beauftragung und produktive KI-Governance brauchen fachliche Freigabe.

#### Management-Takeaway

Die zwei KI-Assistenten verbinden öffentliche Fragen und internen Betrieb, aber private Daten und kritische Entscheidungen bleiben geschützt.
