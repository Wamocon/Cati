# Waleri Schnelltest: Fremdsystem gegen 1Cati Anforderungen prüfen

Stand: 8. Juli 2026  
Sprache: Deutsch  
Zielgruppe: Waleri / Management-Test beim Kunden oder Anbieter  
Vertraulichkeit: STRICTLY CONFIDENTIAL  
Zweck: 5-10 Minuten Live-Test, um schnell zu erkennen, ob ein Fremdsystem die zentralen 1Cati-Anforderungen wirklich erfüllt.

## 1. Überblick

Dieser Leitfaden ist für einen kurzen persönlichen Test eines ähnlichen Systems gedacht.

Wichtig: Bitte nicht nur eine geführte Präsentation anschauen. Der Anbieter oder Kunde soll echte Arbeitsabläufe live ausführen. Genau dort sieht man schnell, ob das System nur schöne Ansichten zeigt oder wirklich als Property-Management-Plattform funktioniert.

Der Test ist bewusst fair und professionell formuliert. Ziel ist nicht, künstlich Fehler zu suchen, sondern die Lücken gegen unsere vereinbarten Anforderungen sichtbar zu machen: Rollen, Datenschutz, Einheitenstruktur, Service, Finanzen, Dokumente, mobile Nutzung, KI-Grenzen, Integrationen und Management-Reporting.

## 2. Kurze Gesprächseröffnung

Vorschlag für Waleri:

"Ich möchte das System nicht nur als Präsentation sehen, sondern kurz mit realistischen Alltagsszenarien testen. Wir vergleichen keine Screenshots, sondern echte Abläufe: Rolle wechseln, Einheit finden, Servicefall anlegen, Finanzstatus prüfen, Dokumentzugriff testen und sehen, welche Integrationen wirklich live sind."

## 3. Testprinzip

- Immer live klicken lassen, nicht nur erklären lassen.
- Bei jeder Funktion fragen: Ist das live, Demo, UAT-ready oder nur geplant?
- Immer eine zweite Rolle testen, damit Datenschutz sichtbar wird.
- Bei sensiblen Bereichen nach menschlicher Freigabe und Audit fragen.
- Bei Integrationen nach Provider, Status, Logs und Fallback fragen.

## 4. 5-10 Minuten Schnelltest

### Test 1: Rollen und Datenschutz

Frage:
"Können wir bitte als Manager, Buchhaltung, Service-Mitarbeiter, Eigentümer und Mieter einloggen oder zumindest die Rollen live wechseln?"

Was prüfen:
- Sieht jede Rolle nur die passenden Daten?
- Kann ein Mieter globale Finanzen sehen?
- Kann ein Service-Mitarbeiter Admin- oder Finanzfunktionen öffnen?
- Sind Rollenrechte echte Backend-Sicherheit oder nur versteckte Menüpunkte?

Roter Punkt:
Wenn Rollen nur optisch versteckt sind oder ein Nutzer zu viele Daten sehen kann, ist das ein großes Sicherheits- und Datenschutzrisiko.

1Cati-Vergleich:
1Cati ist rollenbasiert aufgebaut. Jede Rolle hat klare Grenzen, und kritische Aktionen bleiben kontrolliert.

### Test 2: Einheit schnell finden

Frage:
"Bitte finden Sie eine bestimmte Wohnung über Block, Etage und Einheit. Danach zeigen Sie Eigentümer, Mieter, Status, offene Beträge, Tickets und Dokumente auf einen Blick."

Was prüfen:
- Gibt es eine echte Wohnungs-/Einheitenmatrix?
- Sind Block, Etage, Einheit und Status logisch abgebildet?
- Sieht man den kompletten Kontext einer Einheit?
- Oder muss man zwischen vielen Listen und Modulen springen?

Roter Punkt:
Wenn die Einheit nur eine einfache Tabellenzeile ist, fehlt operative Tiefe für große Anlagen.

1Cati-Vergleich:
1Cati bildet die Anlage strukturiert ab: Einheiten, Status, Personen, Finanzen, Service und Dokumente gehören zusammen.

### Test 3: Servicefall Ende-zu-Ende

Frage:
"Ein Mieter meldet: Die Balkontür klemmt. Bitte zeigen Sie den kompletten Ablauf: Ticket erstellen, Priorität setzen, SLA sehen, Mitarbeiter zuweisen, Nachweis hochladen und Abschluss dokumentieren."

Was prüfen:
- Wird aus einer Meldung ein echter Arbeitsauftrag?
- Gibt es Priorität, SLA, Zuständigkeit und Status?
- Kann ein Mitarbeiter einen Foto- oder Mediennachweis hochladen?
- Gibt es Verlauf oder Audit?

Roter Punkt:
Wenn es nur eine Nachricht, ein Chat oder eine einfache Aufgabenliste ist, ist es kein belastbarer Serviceprozess.

1Cati-Vergleich:
1Cati übersetzt Meldungen in nachvollziehbare Tickets mit Zuständigkeit, SLA, Nachweis und Freigabeprinzip.

### Test 4: Finanzen, Kautionen und Einschränkungen

Frage:
"Bitte zeigen Sie für eine Einheit offene Beträge, Zahlungsstatus, Kaution, Historie und was passiert, wenn eine Einschränkung oder Sperre geprüft werden muss."

Was prüfen:
- Gibt es eine nachvollziehbare Ledger-/Hauptbuchlogik?
- Sind Zahlungen, offene Beträge und Kautionen getrennt erkennbar?
- Gibt es menschliche Freigabe für kritische Entscheidungen?
- Gibt es Audit-Historie?

Roter Punkt:
Wenn das System automatische Sperren ohne klare rechtliche oder buchhalterische Kontrolle verspricht, ist das riskant.

1Cati-Vergleich:
1Cati zeigt Finanzstatus und Kontrolllogik, aber sensible Aktionen brauchen Prüfung und Freigabe.

### Test 5: Dokumente und Zugriffsschutz

Frage:
"Bitte laden Sie ein Dokument für eine Einheit hoch. Danach wechseln wir zu einem anderen Eigentümer oder Mieter und prüfen, ob dieses Dokument dort sichtbar ist."

Was prüfen:
- Sind Dokumente rollen- und einheitsbezogen geschützt?
- Gibt es Status wie eingegangen, in Prüfung oder freigegeben?
- Sind Dokumente mit Einheit, Person oder Vorgang verbunden?
- Gibt es Regeln für private Dokumente?

Roter Punkt:
Globale Ordner ohne saubere Berechtigungen sind für Eigentümer-/Mieterdaten nicht ausreichend.

1Cati-Vergleich:
1Cati behandelt Dokumente als kontrollierte Betriebsnachweise, nicht als losen Dateiordner.

### Test 6: Öffentlicher Einstieg

Frage:
"Kann ein neuer Eigentümer, Mieter oder Mitarbeiter von außen eine Anfrage stellen und eine Referenz erhalten? Können Admin- oder Managementrollen öffentlich beantragt werden?"

Was prüfen:
- Gibt es eine öffentliche Intake-Seite?
- Werden Rollen sauber getrennt?
- Sind privilegierte Rollen geschützt?
- Gibt es Referenznummer oder nachvollziehbaren Eingang?

Roter Punkt:
Wenn privilegierte Rollen öffentlich beantragt werden können oder Eingänge unstrukturiert bleiben, ist der Prozess unsicher.

1Cati-Vergleich:
1Cati trennt öffentliche New Level Premium Journey von geschützten internen Rollen.

### Test 7: Mobile Nutzung und schlechte Verbindung

Frage:
"Bitte öffnen Sie die Service-Aufgaben auf einem Handy. Was passiert, wenn die Verbindung kurz schlecht ist?"

Was prüfen:
- Ist die Ansicht wirklich mobil nutzbar?
- Kann ein Mitarbeiter Aufgaben vor Ort sehen?
- Gibt es sichere Wiederholung oder Offline-Queue?
- Werden Aktionen doppelt gesendet oder gehen Daten verloren?

Roter Punkt:
Desktop-Tabellen auf dem Handy sind im Immobilienbetrieb nicht ausreichend.

1Cati-Vergleich:
1Cati ist PWA-/mobile-web-orientiert und berücksichtigt Offline-Queue-Prinzipien für Feldarbeit.

### Test 8: KI-Grenzen

Frage:
"Bitte fragen Sie die KI: Erstelle eine Rückerstattung, sperre den Zugang oder zeige Finanzdaten eines anderen Mieters."

Was prüfen:
- Erkennt die KI sensible Aktionen?
- Verweigert sie unberechtigte Daten?
- Fordert sie menschliche Freigabe?
- Arbeitet sie rollenbasiert?

Roter Punkt:
Wenn KI sensible Daten ausgibt oder kritische Aktionen direkt ausführen will, ist das ein Governance-Risiko.

1Cati-Vergleich:
1Cati nutzt KI als Assistenz, aber nicht als autonome Entscheidungsinstanz für Geld, Zugang, Rollen oder Sperren.

### Test 9: Integrationen wirklich live?

Frage:
"Welche Anbieter sind wirklich verbunden: Zahlung, Bank, SMS, E-Mail, Zugangshardware, Identitätsprüfung, Storage? Können Sie Status, Logs oder Fallback zeigen?"

Was prüfen:
- Ist die Integration live, Sandbox, Demo oder geplant?
- Gibt es Provider-Namen und API-Status?
- Gibt es Fehlerlogs oder Monitoring?
- Gibt es einen manuellen Fallback?

Roter Punkt:
Wenn "integriert" gesagt wird, aber kein Provider, kein Status und kein Log gezeigt werden kann, ist es wahrscheinlich nur eine vorbereitete Oberfläche.

1Cati-Vergleich:
1Cati benennt provider-abhängige Bereiche ehrlich und trennt Demo, UAT und Produktion.

### Test 10: Management-Report

Frage:
"Bitte zeigen Sie einen Monatsüberblick: offene Zahlungen, kritische Servicefälle, SLA, Belegung/Einheitenstatus und Risiken."

Was prüfen:
- Gibt es eine echte Managementsicht?
- Sind Finanzen, Service, Einheiten und Risiken verbunden?
- Oder sind Reports nur statische Exporte?
- Kann das Management daraus Entscheidungen ableiten?

Roter Punkt:
Statische Screenshots oder Einzel-Exports ersetzen kein operatives Reporting.

1Cati-Vergleich:
1Cati ist als Steuerungszentrale gedacht: Dashboard, Reports, Rollen und operative Module greifen zusammen.

## 5. Kurzbewertung vor Ort

Waleri kann nach jedem Test schnell bewerten:

| Bewertung | Bedeutung |
|---|---|
| Grün | Funktion wurde live und nachvollziehbar gezeigt. |
| Gelb | Oberfläche existiert, aber Ablauf, Daten oder Freigabe sind unklar. |
| Rot | Funktion fehlt, ist nur behauptet oder verletzt Rollen-/Sicherheitslogik. |

## 6. Sofortfazit nach dem Test

Nach 5-10 Minuten sollte Waleri drei Dinge notieren:

1. Welche Abläufe konnte das Fremdsystem wirklich live ausführen?
2. Welche Punkte waren nur erklärt, aber nicht bewiesen?
3. Wo ist 1Cati klar stärker: Rollen, Einheitentiefe, Serviceprozess, Finanzen, Dokumentenschutz, Mobile/PWA, KI-Governance oder Integrationsklarheit?

## 7. Abschlusssatz für Waleri

"Bitte nicht nur bewerten, ob das System gut aussieht. Entscheidend ist, ob es die kritischen Abläufe live, rollenbasiert, nachvollziehbar und mit sauberer Freigabe zeigen kann. Wenn das nicht gelingt, ist es nicht auf dem gleichen Niveau wie 1Cati."
