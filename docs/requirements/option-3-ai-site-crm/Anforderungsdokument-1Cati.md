# WAMOCON GMBH

# Anforderungsdokument

# 1Çatı, Property-Management- und Real-Estate-ERP für Ataberk Estate

| Feld | Wert |
|---|---|
| Projekt | 1Çatı (Cati), Property-Management- und Real-Estate-ERP-Plattform |
| Auftraggeber | Ataberk Estate, Türkei |
| Umsetzung/Beratung | WAMOCON GmbH |
| Referenzobjekt | New Level Premium, Avsallar/Alanya |
| Plattform-Version | 1Çatı ERP v2.5.0 |
| Implementierungsstand | Phase 1–9 Fundament (Foundation/UAT-reif) + New-Level-Premium-Modul umgesetzt; Phase 10–15 in Arbeit |
| Erstellt von | WAMOCON GmbH – Projektteam |
| Eingereicht an | Ataberk Estate Geschäftsführung |
| Datum | 04.07.2026 |
| Vertraulichkeit | STRICTLY CONFIDENTIAL |
| Status | Konsolidiertes Anforderungsdokument, Living Document, wird bei jedem Phasenabschluss fortgeschrieben |

---

**Hinweis zur Dokumentenhierarchie:** Dieses Dokument fasst den aktuellen Stand des 1Çatı-Projekts konsolidiert zusammen, in Anlehnung an das WAMOCON-Standardformat für Anforderungsdokumente. Es ersetzt nicht die bestehende, tiefere Fachdokumentation unter `docs/requirements/option-3-ai-site-crm/` (BRD, PRD, TRD, Security-Compliance-Plan, Data-Migration-Plan, QA-UAT-Launch-Plan, Third-Party-Integration-And-Vendor-Plan, Source-Register), bei Detailfragen zu einzelnen Anforderungen gelten diese Fachdokumente sowie `docs/PROJECT-HANDBOOK.md` als maßgeblich. Bei Widerspruch zwischen diesem Dokument und dem tatsächlichen Code gilt gemäß `CLAUDE.md` Abschnitt 0 immer der Code.

---

## Kapitel 1: Zusammenfassung

### 1.1 Die Idee, und der heutige Stand

1Çatı ("Ein Dach") ist eine webbasierte Property-Management- und Real-Estate-ERP-Plattform für Ataberk Estate, umgesetzt durch WAMOCON GmbH. Ausgangspunkt war die Digitalisierung der Betriebsführung für ein konkretes Referenzobjekt, New Level Premium in Avsallar/Alanya, ein Neubauprojekt mit 769 Wohneinheiten, und die Ablösung der bislang üblichen manuellen Koordination über Excel, WhatsApp und Vor-Ort-Absprachen durch ein rollenbasiertes, mehrsprachiges Betriebssystem für Eigentümer, Mieter, Personal, Buchhaltung und Geschäftsführung.

Im Unterschied zu einem reinen Erstanforderungsdokument beschreibt dieses Kapitel bewusst nicht nur die ursprüngliche Zielsetzung, sondern den **tatsächlich erreichten Stand**: Die Plattform deckt heute als Implementierungsfundament die Phasen 1–9 des 15-Phasen-Liefermodells ab (Discovery, UX/RBAC-Design, Plattform-Fundament mit Auth/RLS/Audit, Site-/Block-/Floor-/Flat-Modell mit Importvalidierung, Nutzer-/Eigentümer-/Mieter-/Personal-Verwaltung, Finanz-Ledger-Engine, Zahlungs-/Depot-/Schuldner-Kontrollen, Service-Katalog und Service-Order-Flow sowie Task-/Workforce-/SLA-/Feldreporting) mit API-, UI- und Test-Harness-Nachweis. Phase 10 (Booking/Move-in/Checkout) ist der nächste aktive Build; Phasen 11–15 (Kommunikation/Dokumente, Mobile PWA, externe Integrationen, KI-Premium-Layer, Launch-Hardening) befinden sich in einem beschleunigten Lieferfenster.

Zusätzlich zum ursprünglichen 15-Phasen-Fahrplan wurde das Produkt seither um ein eigenständiges Modul erweitert, das im ursprünglichen Anforderungsumfang nicht vorgesehen war: die **New-Level-Premium-Landingpage** (`/[locale]/new-level-premium`) mit kontofreiem, öffentlichem Registrierungs- und Meldekanal, geräteunabhängiger Identitätsprüfung, einem eigentümer-gesponserten Zeitzugangsmodell für Mieter, einem datenblind konstruierten öffentlichen KI-Concierge sowie einem QR-Code-Poster für den Vor-Ort-Einsatz. Dieses Modul ist demo-sicher umgesetzt (kein produktiver Login erforderlich, alle Schreibpfade laufen über eine allowlisted, ausschließlich anonyme Security-Definer-Funktion) und wird in Kapitel 7.2 im Detail beschrieben.

Wichtige Einordnung, die für dieses Dokument durchgehend gilt: **Foundation ist nicht gleich Produktionsreife.** Jede Aussage zu Zahlungen, Zugang, Identitätsprüfung, Behördenmeldung oder KI-Automatisierung in diesem Dokument bezieht sich auf einen funktionsfähigen, mit deterministischen Seed-/Demo-Daten lauffähigen Entwicklungsstand, nicht auf einen produktiv freigegebenen Kundenbetrieb. Produktionsreife erfordert zusätzlich Kundendaten-Validierung, Provider-Entscheidungen, Accounting-/Legal-Review und UAT-Sign-off (siehe Kapitel 6 und 8).

### 1.2 Warum jetzt?

Die Timing-Begründung für die Weiterentwicklung von 1Çatı stützt sich auf zwei gegenläufige Marktbewegungen, die beide direkt die Zielgruppe von Ataberk Estate/New Level Premium betreffen.

Erstens schrumpft der für Ataberk Estate zentrale Auslandsimmobilienmarkt in der Provinz Antalya/dem Landkreis Alanya beschleunigt weiter. Landesweit verkaufte die Türkei 2025 nur noch 21.534 Wohnungen an Ausländer, ein Rückgang von 9,4 % gegenüber 2024 und der niedrigste Jahreswert seit neun Jahren; der Ausländeranteil am Gesamtmarkt fiel auf nur noch 1,3 %, den tiefsten Stand seit voller Wirkung des Reziprozitätsgesetzes 2013 (Quelle 1, 2). Im Mai 2026, dem aktuellsten verfügbaren Berichtsmonat, beschleunigte sich der Rückgang bei Ausländerverkäufen sogar auf −27 % (Quelle 3). Der Landkreis Alanya ist davon besonders betroffen: Bei russischen Käufern, historisch die größte Einzelgruppe, fiel die Zahl von 6.640 Einheiten (2022) auf nur noch 1.662 Einheiten (2025), ein Rückgang von rund 75 % (Quelle 4). Gleichzeitig bleibt Alanya seit vier Jahren in Folge der von russischen Käufern in der gesamten Türkei meistgewählte Landkreis (Quelle 4), der Markt wird kleiner, aber Alanya verteidigt seine relative Führungsposition. In einem schrumpfenden Markt entscheidet operative Exzellenz und digitales Vertrauen stärker über Kundenbindung und Weiterempfehlung als in einem wachsenden Markt, in dem Nachfrageüberschuss Servicemängel verzeiht.

Zweitens beschleunigt sich global und speziell im Property-Management-Software-Segment der Wettbewerb um KI-gestützte Differenzierung. In den USA stieg die aktive KI-Nutzung unter Property-Managern von 21 % (2024) auf 34 % (2025) (Quelle 5, 6). Etablierte globale Anbieter wie Buildium (Lumina-AI-Agentensuite, Zeitersparnis-Behauptung von 83 %) und DoorLoop (AI Assistant, laut Anbieterangabe bis zu 80 % automatisiert gelöste Mieteranfragen) haben 2025/2026 KI-Layer nachgerüstet (Quelle 7, 8, 9). Im türkischen Markt selbst positioniert sich der stärkste lokale Wettbewerber Apsiyon bereits seit 2024 mit zwei WhatsApp-KI-Assistenten (ASYA für Manager, ADA für Bewohner) (Quelle 10), und mit Çardak und Odyosi sind 2025/2026 zwei neue, KI-native türkische Site-Management-Anbieter entstanden (Quelle 11, 12). 1Çatıs bereits umgesetzter Ansatz, ein rollenbewusster KI-Assistent, der Finanz-/Zugangs-/Berechtigungsaktionen niemals selbst ausführt, sondern ausschließlich mit menschlicher Freigabe empfiehlt, ist strukturell deckungsgleich mit der Positionierung, die auch Buildium für seine sensiblen Workflows explizit kommuniziert ("always requires human review"). Wer diese vertrauensbildende, aber technisch anspruchsvolle Differenzierung jetzt ausbaut, sichert sich einen Vorsprung, während der Gesamtmarkt kleiner wird und Kunden wählerischer werden.

---

## Kapitel 2: Marktanalyse

### 2.1 Zielgruppe in Zahlen, der Auslandsimmobilienmarkt Alanya/Antalya

Der Auslandsimmobilienmarkt bleibt rückläufig, ist aber weiterhin das relevante Fundament für Ataberk Estates Zielgruppe. 2025 wurden in der Türkei insgesamt 21.534 Wohnungen an Ausländer verkauft (−9,4 % gegenüber 2024, ein Neunjahrestief); der Ausländeranteil am Gesamtmarkt fiel auf 1,3 % (Quelle 1, 2). Der Rückgang beschleunigte sich 2026: Im März 2026 sanken die Verkäufe an Ausländer landesweit um 20 % auf 1.353 Einheiten (Russland 229, Iran 130, Deutschland 84) (Quelle 13); im Mai 2026, dem aktuellsten TÜİK-Berichtsmonat zum Zeitpunkt dieser Recherche, betrug der Rückgang bereits 27 % auf 1.387 Einheiten bei nur noch 1,5 % Marktanteil (Russland 268, Iran 125, Ukraine 88) (Quelle 3). Zum Vergleich: Der türkische Gesamtwohnungsmarkt (alle Käufergruppen) verzeichnete 2025 mit 1.688.910 Verkäufen ein Plus von 14,3 % (Quelle 14), der Rückgang bei ausländischen Käufern ist also keine allgemeine Marktschwäche, sondern eine spezifische, sich verschärfende Entwicklung.

Auf Provinzebene war Antalya 2025 die Nummer 2 bei Verkäufen an Ausländer (7.118 Einheiten, hinter Istanbul mit 7.989) und blieb im November 2025 mit 662 Einheiten weiterhin zweitplatziert (Quelle 14). Für den Landkreis Alanya selbst liegen keine offiziellen TÜİK-Zahlen auf Landkreisebene vor (TÜİK berichtet nur auf Provinzebene); Sekundärquellen mit Bezug auf Kataster-/Tapu-Daten zeigen jedoch, dass Alanya seit vier Jahren in Folge (2022–2025/26) der von russischen Käufern in der gesamten Türkei meistgewählte Landkreis ist. Der jährliche Rückgang russischer Käufe in Alanya verläuft dabei proportional zum landesweiten Trend: 6.640 (2022) → 4.203 (2023) → 2.352 (2024) → 1.662 Einheiten (2025), ein Rückgang von rund 75 % (Quelle 4), kumuliert 14.857 Einheiten für die vier vollen Jahre 2022–2025. Für 2026 (Januar–April) kauften russische Käufer in Alanya bereits weitere 368 Wohnungen bei einem Türkei-weiten Volumen von 902 Einheiten, ein Alanya-Anteil von rund 41 %, konsistent mit dem historischen Muster der letzten vier Jahre (Quelle 15). Über den gesamten Zeitraum 2022 bis April 2026 ergibt sich damit eine kumulierte Summe von 15.225 Einheiten (Quelle 4, 15).

Als Hauptursachen für den anhaltenden Rückgang werden in mehreren 2025/26-Quellen genannt: stark gestiegene Immobilienpreise in der Türkei, die Anhebung der Mindestinvestitionssumme für die Staatsbürgerschaft durch Immobilienkauf auf 400.000 USD, erschwerte Aufenthaltsgenehmigungsverfahren sowie öffentliche Debatten über eine mögliche Abschaffung des Citizenship-by-Investment-Programms (Quelle 16).

Für die Erreichbarkeit dieser Zielgruppe über digitale Kanäle gilt: In der Türkei nutzen laut amtlicher TÜİK-Haushaltsbefragung 88,6 % der Bevölkerung WhatsApp, die mit Abstand meistgenutzte App im Land, vor YouTube (72,9 %) und Instagram (68,1 % nach TÜİK-Selbstauskunft; DataReportal und NapoleonCat kommen mit anderer Methodik auf 70,9–74,1 %) (Quelle 17, 18, 19, 20). Die Internetnutzungsrate der 16- bis 74-Jährigen erreichte 2025 laut TÜİK 90,9 % (Quelle 17); DataReportal weist für die Gesamtbevölkerung 88,3 % Internet-Penetration und 81,9 Millionen aktive Mobilfunkanschlüsse aus, davon 97,8 % breitbandfähig (3G/4G/5G) (Quelle 19), ein starker indirekter Beleg für die Tragfähigkeit von 1Çatıs PWA-first-Ansatz, auch wenn keine eigenständige PWA-Installationsstatistik für die Türkei verfügbar ist.

### 2.2 Infrastruktur/Marktwachstum, Property-Management-Software und PropTech

Für den globalen Property-Management-Software-Markt liegen mehrere, teils deutlich divergierende Marktforschungszahlen vor, was auf unterschiedliche Marktabgrenzungen hindeutet. Grand View Research beziffert den Markt 2025 auf 3,61 Mrd. USD mit Prognose auf 5,89 Mrd. USD bis 2033 (CAGR 6,4 %) (Quelle 21); Verified Market Research nennt 5,12 Mrd. USD bis 2032 (CAGR 5,93 %) (Quelle 22), Allied Market Research 7,8 Mrd. USD bis 2033 (CAGR 8,9 %) (Quelle 23). Für den breiter gefassten globalen PropTech-Markt (Software plus Plattformen/Services) nennt Precedence Research 47,08 Mrd. USD (2025) mit Prognose auf 185–209 Mrd. USD bis 2034/2035 (CAGR 16,4 %) (Quelle 24); Mordor Intelligence kommt auf 45,20 Mrd. USD (2025) bis 120,74 Mrd. USD (2031, CAGR 17,79 %), wobei Software-Plattformen 2025 einen Anteil von 66,85 % am PropTech-Markt hielten (Quelle 25).

Für die Türkei selbst konnte keine dedizierte Marktgrößenzahl speziell für Property-/Site-Management-Software gefunden werden. Die einzige Türkei-spezifische Zahl (Ken Research, 1,4 Mrd. USD) bezieht sich auf den breiteren Markt "Real Estate PropTech and Housing Platforms", also Immobilien-Listing-Plattformen wie Sahibinden, Hepsiemlak und Zingat, nicht auf Verwaltungssoftware für Hausverwaltungen wie 1Çatı, und wird hier deshalb nur als Kontext, nicht als direkte Marktgröße zitiert (Quelle 26). Für die Region Middle East & Africa liegen Einzelwerte für die VAE (68,2 Mio. USD 2023 → 112,3 Mio. USD 2030, CAGR 7,5 %) und Saudi-Arabien (46,7–94,1 Mio. USD, je nach Quelle) sowie eine Grand-View-Research-Gesamtzahl für MEA (163,8 Mio. USD bis 2033, CAGR 3,6 %) vor (Quelle 27, 28, 29), keine davon ist jünger als Basisjahr 2024.

Besonders relevant für 1Çatıs KI-Differenzierung: Der belastbarste, durch zwei unabhängige Quellen bestätigte Adoptionsindikator zeigt, dass die aktive KI-Nutzung unter US-Property-Managern von 21 % (2024) auf 34 % (2025) gestiegen ist, während der Anteil ohne jegliche KI-Pläne von 51 % auf 37 % sank (Quelle 5, 6). Eine oft zitierte höhere Zahl ("58 % bzw. 3 von 5 nutzen KI") ließ sich nicht auf eine verifizierbare Primärquelle zurückführen und wird hier bewusst nicht übernommen.

### 2.3 Das Kernproblem

Ataberk Estate koordinierte die Verwaltung mehrerer hundert Wohneinheiten sowie die Kommunikation mit international verteilten Eigentümern und Mietern bislang über eine Kombination aus Excel-Listen, WhatsApp-Chats und Vor-Ort-Absprachen, ein Modell, das mit wachsender Einheitenzahl (769 Wohnungen im Referenzobjekt New Level Premium) fehleranfällig wird: Zahlungsstände, Schuldnerlisten, Servicetickets und Zugangsberechtigungen sind ohne zentrales System nicht in Echtzeit nachvollziehbar, und internationale Eigentümer, die sich nicht dauerhaft vor Ort aufhalten, haben keinen strukturierten Einblick in den Status ihrer Einheit.

Der türkische Site-Management-Softwaremarkt bietet bereits eine Reihe etablierter Lösungen (Apsiyon, Senyonet, Yönetimcell, Aidatım, Siteplus), die Aidat-/Beitragsverfolgung, Bankintegration, Bewohnerportale und teilweise KI-Positionierung abdecken (Quelle 10; ausführliche Wettbewerbsanalyse in Kapitel 3). Keiner der etablierten türkischen Anbieter verbindet dies jedoch mit einer Finanz-Ledger-Engine im Buchhaltungssinn (unveränderliche, ausgeglichene Journaleinträge), einem strukturierten Service-Desk mit SLA-Eskalation nach globalem ITSM-Standard, einem öffentlichen, kontofreien Melde- und Registrierungskanal für ein konkretes Neubauprojekt sowie einer KI-Schicht, die Finanz- und Zugangsentscheidungen grundsätzlich nur empfiehlt statt selbst auszuführen. Genau diese Kombination, nicht ein einzelnes Feature, ist die Positionierung, in die 1Çatı stößt.

Zusätzlich adressiert das New-Level-Premium-Modul ein spezifisches Problem des Referenzprojekts: Vor dessen Einführung gab es keinen strukturierten, verifizierten Weg für Eigentümer und Mieter, sich für den Zugang zum System zu registrieren, und keinen niedrigschwelligen, kontofreien Kanal, über den Gäste, Besucher oder Dienstleister ein Problem melden können, ohne dass dafür ein vollwertiger Systemzugang bestehen muss.

### 2.4 Regulatorisches Umfeld

Als türkisches Unternehmen unterliegt Ataberk Estate in erster Linie dem KVKK (Kişisel Verilerin Korunması Kanunu, Gesetz Nr. 6698). Für 2026 gilt eine Neubewertungsrate von 25,49 % für alle festen Bußgeldobergrenzen nach Art. 18 KVKK, festgelegt durch das Allgemeine Kommuniqué Nr. 585 zum Steuerverfahrensgesetz, veröffentlicht im Amtsblatt Nr. 33090 vom 27.11.2025 (Quelle 30). Die Nichteinhaltung der VERBİS-Registrierungspflicht wird 2026 mit einem Bußgeld von minimal 341.809 TRY bis maximal 17.092.242 TRY geahndet, die höchste Bußgeldobergrenze aller KVKK-Verstoßkategorien (Quelle 31). Die VERBİS-Registrierungspflicht selbst greift bei mehr als 50 Mitarbeitenden oder einer Jahresbilanzsumme über 100 Mio. TRY, mit einer Mikro-Ausnahme für Unternehmen unter 10 Mitarbeitenden und unter 10 Mio. TRY Bilanzsumme (Quelle 32).

Da Ataberk Estate aktiv Dienstleistungen an Personen in der EU (insbesondere Deutschland, als eine der Zielnationalitäten internationaler Eigentümer) anbietet, greift zusätzlich Art. 3 Abs. 2 DSGVO unabhängig vom Firmensitz in der Türkei. Die Europäische Kommission listet die Türkei auf ihrer offiziellen Angemessenheits-Seite (Stand 10.02.2026) nicht unter den Ländern mit Angemessenheitsbeschluss nach Art. 45 DSGVO; die Kommission hatte am 13.12.2023 explizit festgestellt, dass die türkische Gesetzgebung nicht ausreichend DSGVO-äquivalent ist (Quelle 33, 34). Die EDPB-Leitlinien 3/2018 zum territorialen Anwendungsbereich der DSGVO enthalten ein einschlägiges Beispiel einer außerhalb der EU betriebenen Website, die gezielt Dienstleistungen für Personen in der Union anbietet und dadurch der DSGVO unterliegt (Quelle 35), was strukturell auf Ataberk Estates internationale Eigentümer-/Mieterzielgruppe zutrifft. Daraus folgt grundsätzlich eine Pflicht zur Benennung eines EU-Vertreters nach Art. 27 DSGVO in einem betroffenen Mitgliedstaat, sofern keine Ausnahme für nur gelegentliche, risikoarme Verarbeitung greift (Quelle 36). Verstöße gegen Art. 27 können mit bis zu 10 Mio. Euro oder 2 % des weltweiten Jahresumsatzes geahndet werden; der bekannteste Präzedenzfall bleibt die niederländische Aufsichtsbehörde gegen Locatefamily.com (525.000 Euro, 2021), ein neuer, spezifisch 2026 datierter Fall wegen fehlenden Art.-27-Vertreters konnte trotz Recherche nicht identifiziert werden, wohl aber ein von mehreren Fachquellen beschriebener allgemeiner Trend zunehmender Durchsetzung dieser bislang oft vernachlässigten Pflicht (Quelle 37, 38).

Speziell für das New-Level-Premium-Modul kommt eine weitere, türkeispezifische Regelungsebene hinzu: das Kimlik Bildirme Kanunu (Gesetz Nr. 1774), das für **kommerzielle Kurzzeit-/Ferienvermietung** eine sofortige elektronische Gästemeldung über KBS (Kimlik Bildirim Sistemi) bei Check-in/Check-out verlangt, mit Bußgeldern und im Wiederholungsfall Betriebsschließung als Sanktion. Für **Langzeit-Wohnmietverhältnisse** (12+ Monate, Hauptwohnsitz) gilt KBS dagegen nicht, sondern die Adres Kayıt Sistemi/MERNİS-Adressregistrierung, ein strukturell anderes System ohne Instant-Meldepflicht. Zusätzlich existiert seit 2024 ein separates Genehmigungsregime (Gesetz Nr. 7464) für touristische Kurzzeitvermietung mit Ministeriumsgenehmigung plus einstimmiger HOA-Zustimmung (interner Rechtsrecherchebrief, `docs/offers/kbs-identity-legal-brief.md`, ausdrücklich als Ingenieurs-Recherche, nicht als Rechtsberatung deklariert). 1Çatı setzt diese Unterscheidung bereits im Code um (180-Tage-Aufbewahrungsfrist für Intake-Identitätsdaten, reines Queueing statt echter Behördenübermittlung, siehe Kapitel 7.2); die endgültige Einordnung einzelner Einheiten als kommerziell vs. langfristig sowie die exakte Aufbewahrungsfrist für bestätigte Aufenthaltsdatensätze stehen noch unter dem Vorbehalt einer abschließenden Bestätigung durch einen lizenzierten türkischen Anwalt.

---

## Kapitel 3: Wettbewerb

### 3.1 Direkte Wettbewerber, türkische Site-Management-Software

| Anbieter | Stärken | Schwächen/Chance für 1Çatı | Preis/KI |
|---|---|---|---|
| **Apsiyon** | Stärkste lokale Referenz; breite Suite (Aidat-Tracking, Bank-/Kartenintegration, Bewohnerportal, Manager-Mobil-App); drei Pakettiers (Blue/Black/Kurumsal) mit gestaffelten Features bis Kennzeichenerkennung/CCTV/IVR im Corporate-Paket (Quelle 39, 10). | Betreibt seit Februar 2024 bereits zwei WhatsApp-KI-Assistenten (ASYA für Manager-Rechtsfragen, ADA für Bewohner-Zahlungsabfragen) (Quelle 10), der stärkste unmittelbare KI-Wettbewerber. 1Çatıs Differenzierung liegt in der Finanz-Ledger-Tiefe (unveränderliche, ausgeglichene Journaleinträge) und dem strikten Human-Approval-Gate für alle sensiblen KI-Aktionen, nicht nur bei Zahlungsabfragen. | Preise nicht öffentlich, nur auf Anfrage. |
| **Senyonet** | Verbundene Module PR/Finanzen/Buchhaltung/Sicherheit, Fokus auf Facility-Management-Firmen, Task-Management mit Performance-Bewertung (Quelle 40). | Keine öffentlich dokumentierten KI-Features gefunden (Negativbefund), Chance für 1Çatı über KI-gestützte Priorisierung/Briefings zu differenzieren. | Preise nicht öffentlich. |
| **Yönetimcell** | Einfachheit als Verkaufsargument, 30 Tage kostenlose Testphase, Excel-Export, Staff-Job-Tracking (Quelle 41). | Kein KI-Feature auffindbar; einfache Positionierung lässt Raum für 1Çatıs tiefere Rollenmatrix (6 Rollen × 14 Ressourcen × 8 Aktionen) und Audit-Trail. | Preise nicht öffentlich. |
| **Aidatım** | Software + Service-Hybrid, Smart Bank Matching, rechtliche/buchhalterische Unterstützung, Preisstaffelung nach Einheitenzahl (Quelle 42). | Kein KI-Feature auffindbar; Hybrid-Service-Modell bindet Kunden an manuelle Dienstleistung statt Selbstbedienungsportal. | Preise nach Einheitenzahl gestaffelt, konkrete Beträge nicht öffentlich. |
| **Siteplus** | Angrenzendes Facility-Management-Benchmark (Sicherheit, Reinigung, Wartung), kein reiner Softwarewettbewerber (Quelle 43). | Kein digitales Kundenportal im 1Çatı-Sinne; eher Dienstleistungsanbieter als Software-ERP. | Nicht öffentlich. |

### 3.2 Neue KI-native Wettbewerber (türkisch und global)

| Anbieter | Was er bietet | Relevanz für 1Çatı |
|---|---|---|
| **Çardak** (cardak.app) | Neuer türkischer Wettbewerber: KI-gestützte Site-Management-App auf Basis der Google-Gemini-API, kombiniert Aidat-Tracking, Kennzeichenerkennung, E-Auto-Ladestationsverwaltung und Besuchermanagement; KVKK-konform mit Datenhosting ausschließlich in der Türkei; gewann 2025 den 1. Platz beim Emlak Konut Ideathon (Quelle 11). | Bislang junger Markteintritt (Ideathon-Preisträger, keine bestätigten Marktanteile), Frühwarnsignal für eine sich formierende KI-native Konkurrenz im türkischen Site-Management-Markt. |
| **Odyosi** (odyosi.com) | Site-Management-Software mit Fokus auf KI-gestützte Vorbuchhaltung: automatische Personen-/Kontenzuordnung, Root-Cause-Analyse bei Transaktionsfehlern, Risikoberichte auf Basis von Zahlungsgewohnheiten (Quelle 12). | Direkte konzeptionelle Nähe zu 1Çatıs Finanz-Ledger + Schuldner-Risikologik, zeigt, dass Predictive-Risk-Funktionen (1Çatıs Phase-14-Roadmap, siehe Kapitel 7.4) auch lokal bereits nachgefragt werden. |
| **Buildium** (global) | "Lumina AI Workforce"-Suite mit fünf spezialisierten Agenten (Maintenance, Leasing, Accounting, Resident Experience, Business Operations); Anbieterangabe: 83 % Zeitersparnis bei manueller Prüfung; explizites Statement, dass sensible Entscheidungen immer menschliche Überprüfung erfordern (Quelle 7). | Strukturell fast identisches Human-Approval-Prinzip wie 1Çatı, bestätigt, dass dieser Ansatz Marktstandard für seriöse Anbieter wird, nicht nur eine 1Çatı-Eigenheit. |
| **DoorLoop** (global) | AI Assistant (Launch September 2025, "über die Hälfte" der Mieteranfragen automatisiert gelöst laut erster Pressemitteilung) plus AI Inspections (Februar 2026, Foto-Workflow-Automatisierung); in der neueren Pressemitteilung wird die Automatisierungsquote auf "bis zu 80 %" korrigiert (Quelle 8, 9). | Zeigt schnelle Iterationsgeschwindigkeit bei globalen Wettbewerbern, 1Çatıs KI-Premium-Layer-Roadmap (Phase 14) muss dieses Tempo im Blick behalten. |
| **EliseAI** (global, US-fokussiert) | Series-E-Finanzierung über 250 Mio. USD (August 2025, Lead a16z) bei 2,2 Mrd. USD Bewertung; KI-Automatisierung für Mieterkommunikation, Tour-Scheduling, Lease-Audits; laut Eigenangabe von rund 10 % des US-Apartmentmarkts genutzt (Quelle 44). | Zeigt das Investitionsvolumen, das in KI-native Property-Management-Konkurrenz fließt, kein unmittelbarer Wettbewerber in der Türkei, aber Beleg für die strategische Relevanz des Segments. |

### Marktlücke

Keiner der recherchierten türkischen oder globalen Anbieter verbindet (a) eine buchhalterisch belastbare, unveränderliche Finanz-Ledger-Engine, (b) ein strukturiertes, ITSM-artiges Service-Desk mit SLA-Eskalation, (c) einen öffentlichen, kontofreien Registrierungs- und Meldekanal für ein konkretes Neubauprojekt mit gestufter Identitätsprüfung und (d) eine KI-Schicht, die sensible Aktionen grundsätzlich nur empfiehlt statt auszuführen, in einem einzigen Produkt. Apsiyon kommt dieser Kombination am nächsten, deckt aber weder die Finanz-Ledger-Tiefe noch den öffentlichen Registrierungskanal ab. Genau diese Kombination, nicht ein einzelnes Feature, ist die Positionierung, in die 1Çatı stößt.

---

## Kapitel 4: Zielgruppe

### 4.1 Primäre Zielgruppe

Internationale Immobilienbesitzer bzw. -käufer und Mieter im Referenzobjekt New Level Premium (Avsallar/Alanya), vor allem aus Deutschland, Russland, der Ukraine und dem Iran (siehe Nationalitäten-Verteilung Kapitel 2.1), die eine Wohnung besitzen, kaufen oder mieten, sich aber häufig nicht dauerhaft vor Ort aufhalten und einen digitalen, mehrsprachigen (TR/EN/DE/RU) Einblick in Zahlungsstand, Servicetickets und Dokumente benötigen. Innerhalb der internen Betriebsorganisation von Ataberk Estate zählen zusätzlich sechs interne Rollen zur primären Zielgruppe: Administrator, Site Manager, Accountant, Staff/Technician, Security Staff und Support/Implementation-Team (vollständige Persona-Beschreibung in `BRD.md` Abschnitt 7).

### 4.2 Sekundäre Zielgruppe

Mieter, die über das eigentümer-gesponserte Zeitzugangsmodell (siehe Kapitel 7.2) Zugriff auf ihre Einheit erhalten, sowie Dienstleister/Vendoren, die über das Service-Desk-Modul eingebunden werden. In einer späteren Ausbaustufe (Phase 13, externe Integrationen) kommen Bank-, Zahlungs- und SMS-Provider als technische Sekundärzielgruppe der Integrationsschicht hinzu.

### 4.3 Nicht-Zielgruppe

1Çatı adressiert nicht den anonymen, kontofreien Immobilien-Massenmarkt außerhalb konkreter, vertraglich gebundener Referenzobjekte und nicht den vollständig automatisierten Zahlungs-/Zugangsbetrieb ohne menschliche Freigabe, dieser bleibt bewusst ausgeschlossen, solange Legal-/Accounting-Review und Provider-Entscheidungen (Kapitel 6, 8) nicht abgeschlossen sind.

---

## Kapitel 5: Nutzen

### 5.1 Nutzen für Ataberk Estate

Eine zentrale, rollenbasierte Datengrundlage für bis zu 769 Wohneinheiten ersetzt die bisherige Excel-/WhatsApp-Koordination; digitale Workflows mit Audit-Trail schaffen Nachvollziehbarkeit bei Zahlungen, Zugangsentscheidungen und Service-Vorgängen; das New-Level-Premium-Modul senkt die Einstiegshürde für internationale Eigentümer und Mieter durch einen verifizierten, mehrsprachigen Registrierungs-Front-Door, ohne dass ein Systemzugang Voraussetzung für eine erste Kontaktaufnahme oder Problemmeldung ist. Die KI-Schicht entlastet Manager und Buchhaltung bei Routineabfragen und Priorisierung, ohne dass Finanz- oder Zugangsentscheidungen aus der Hand gegeben werden.

### 5.2 Nutzen für WAMOCON GmbH

1Çatı liefert WAMOCON GmbH ein wiederverwendbares Referenzmodell für weitere Property-Management- bzw. Real-Estate-ERP-Mandate im türkischen Auslandsimmobilienmarkt (skalierbar auf andere Standorte). Die Kombination aus Finanz-Ledger-Engine, RBAC-/RLS-Doppelverteidigung, mehrsprachigem Dashboard und kontrolliertem KI-Layer mit Human-Approval-Gate lässt sich als technische Grundlage für weitere Kunden mit ähnlichem Geschäftsmodell (Site-Management plus internationale Eigentümer-/Mieterschaft) wiederverwenden. Strategischer Wert: Aufbau von Branchen-Know-how im Segment "KI-gestützte Property-Management-Plattformen für den türkischen Auslandsimmobilienmarkt", einem Segment, in dem laut Kapitel 2.2 die KI-Adoption 2024–2025 deutlich zunahm und laut Kapitel 3.2 auch lokal bereits neue, KI-native Wettbewerber entstehen.

---

## Kapitel 6: Abhängigkeiten und Machbarkeit

### 6.1 Architekturprinzip

1Çatı folgt laut technischer Zielarchitektur (`TRD.md`) bewusst dem Muster eines modularen Monolithen auf Next.js 16 + Supabase statt Microservices, da Finance, Service-Orders, Bookings und Access-Restrictions stark domänengekoppelt sind. Für externe Provider gilt ein Adapter-Layer-Prinzip: Jede Integrationskategorie (Zahlungen, SMS, E-Mail, Push, Zugang) hat einen stabilen internen Contract, sodass ein Provider ohne ERP-Rewrite ausgetauscht werden kann (`Third-Party-Integration-And-Vendor-Plan.md` Abschnitt 1).

### 6.2 Externe Abhängigkeiten, Shortlist, keine finale Entscheidung

| Kategorie | Kandidaten (Shortlist, nicht final) | Status |
|---|---|---|
| Cloud-Hosting/Datenbank | Supabase Cloud Pro (Auth, PostgreSQL, Realtime, Storage), Vercel Pro (Produktionshosting) | Bereits im Einsatz für lokale Entwicklung; Owner/Budget/Region/Backup-Policy für Produktion noch nicht final von Ataberk freigegeben (`Third-Party-Integration-And-Vendor-Plan.md` Kostenregister Abschnitt 2). |
| Zahlungen | iyzico, PayTR primär; Param, Sipay, Paycell als Alternativen nach Angebot | MVP startet mit Bank-Überweisung/CSV-Import statt Kartenzahlung; Kartenzahlung ist Phase-2/Phase-13-Ausbau. |
| SMS | Netgsm, İleti Merkezi | Nur für OTP/hochpriorisierte Meldungen vorgesehen; Routine-Kommunikation günstiger über Push/E-Mail. |
| E-Mail | Postmark oder Amazon SES, mit Brevo/Mailgun/SendGrid als Fallback | Noch nicht entschieden. |
| Push (PWA) | Firebase Cloud Messaging als Basis, OneSignal optional für nicht-technische Kampagnensteuerung | Noch nicht entschieden. |
| Zugang/Sicherheit-Hardware | Hikvision, Dahua, ZKTeco, dormakaba (nur Kandidatenfamilien) | Ausdrücklich "nur nach Standortbegehung", keine Vorauswahl ohne Inventar der installierten Systeme. |
| Accounting/E-Invoice | Logo, Mikro, Parasut, Uyumsoft | Export-first im MVP; Anbindung erst nach Bestätigung des Ziel-Workflows durch den Buchhalter. |
| Monitoring | Sentry (Fehler), Better Stack oder UptimeRobot (externe Uptime-Checks) | Sentry teilweise im Einsatz, externe Uptime-Prüfung noch offen. |
| KI-Gateway | Konfigurierbares, OpenAI-kompatibles Gateway plus optionales On-Prem-Modell, bewusst kein fester Anbieter | Aktueller Code nutzt Platzhalter-Modellnamen (`sokrates-fast`/`sokrates-pro`/`qwen3.6-35b`/`gemma4-31b`); ohne konfigurierten Endpunkt läuft alles deterministisch (kein produktiv aktiver LLM-Aufruf im untersuchten Code). |
| WhatsApp Business Platform | Meta Cloud API | Noch nicht Meta-business-verifiziert; Formularseiten sind bereits vorbereitet, WhatsApp-Buttons nutzen aktuell eine bewusst ungültige Platzhalternummer, damit im Demo-Betrieb niemand real angeschrieben wird. |

Kein Vendor aus dieser Liste ist final entschieden oder vertraglich gebunden, es handelt sich ausschließlich um Shortlists, die Ataberk-Freigabe, Angebot, Vertrags-/KVKK-Review und Produktionscredentials benötigen (`Third-Party-Integration-And-Vendor-Plan.md`, explizites Non-Goal Nr. 4).

### 6.3 Kanalkosten-Referenz (frisch recherchiert)

Seit 1. Juli 2025 rechnet Meta die WhatsApp Business Platform pro zugestellter Template-Nachricht ab (vier Kategorien: Marketing, Utility, Authentication, Service; Service-Antworten im 24-Stunden-Fenster sind seit 1.11.2024 kostenlos). Für die Türkei senkte Meta zum 1. April 2026 die Utility-/Authentication-Rate von 0,0053 USD auf 0,0009 USD pro Nachricht, ein Rückgang von über 80 % (Quelle 45, 46). Die Meta-Geschäftsverifizierung verlangt einen rechtlichen Entitätsnachweis (Handelsregister/Gewerbeschein/Steuerregistrierung) plus Adress-/Telefonnachweis mit exakt übereinstimmendem Namen; die Bearbeitungsdauer wird mit 1–6 Wochen angegeben (Quelle 47), dieser zeitliche Vorlauf ist bei jeder Phase-13-Zeitplanung zu berücksichtigen. Für ein KI-Gateway wäre laut aktueller OpenAI-Preisseite die günstigste beobachtete Nano-Tier-Modellvariante (0,20 USD Input/1,25 USD Output pro 1 Mio. Token, Preisstand 04.07.2026, zzgl. 90 % Rabatt auf zwischengespeicherte Eingabe-Token) die günstigste externe Referenz, sollte ein kommerzielles Gateway statt eines On-Prem-Modells gewählt werden (Quelle 48), dies ist ausdrücklich nur eine externe Vergleichsreferenz, da der 1Çatı-Code bewusst anbieterunabhängig konfiguriert ist und aktuell keinen produktiven Anthropic- oder OpenAI-Vertrag voraussetzt.

### 6.4 Gesamtbewertung

Der aktuelle Implementierungsstand hat keine Abhängigkeit, die von einem Wettbewerber blockiert werden könnte, keiner der recherchierten Wettbewerber hält exklusive Rechte an vergleichbarer Technologie. Die zeitkritischste externe Abhängigkeit bleibt die Meta-Business-Verifizierung für die WhatsApp Business Platform (1–6 Wochen Vorlauf) sowie, sofern eine kommerzielle KI-Anbindung gewünscht wird, die Provider-/Modellentscheidung für das KI-Gateway. Alle übrigen in Kapitel 6.2 gelisteten Abhängigkeiten sind kurzfristig einrichtbar, sobald die jeweilige Geschäfts-/Legal-Entscheidung getroffen ist.

---

## Kapitel 7: Anforderungen, aktueller Stand und Weiterentwicklung

Dieses Kapitel unterscheidet bewusst zwischen bereits umgesetzten Anforderungen (Status "Umgesetzt (Foundation/Demo)") und noch offenen, geplanten Anforderungen (Status "Geplant"). Kein hier als "Umgesetzt" markiertes Element ist gleichbedeutend mit "produktionsscharf", siehe die Einordnung in Kapitel 1.1 und die offenen Entscheidungen in Kapitel 8.2.

### 7.1 Plattform-Fundament (Phase 1–9)

| ID | Anforderung | Priorität | Status |
|---|---|---|---|
| F-01 | Rollenbasiertes Zugriffsmodell mit 6 Rollen (Admin, Manager, Accountant, Staff, Owner, Tenant), 14 Ressourcen, 8 Aktionen, serverseitig durchgesetzt (nicht nur UI-versteckt) über `lib/rbac.ts` und synchron gehaltene SQL-RBAC-Helper | Muss | Umgesetzt (Foundation) |
| F-02 | Postgres Row Level Security als zweite Verteidigungslinie zusätzlich zur App-RBAC-Prüfung an jedem Write-Endpoint | Muss | Umgesetzt (Foundation) |
| F-03 | Site-/Block-/Floor-/Flat-Domänenmodell mit 769-Einheiten-Referenzdatensatz und Importvalidierung (Import-Batches, Import-Findings) | Muss | Umgesetzt (Foundation) |
| F-04 | Nutzer-, Eigentümer-, Mieter- und Personal-Verwaltung inkl. rollenbasierter Sichtbarkeitsregeln (Finanzbeträge für Staff maskiert, Datensätze auf eigene Unit/Rolle beschränkt) | Muss | Umgesetzt (Foundation) |
| F-05 | Finanz-Ledger-Engine mit Buchungsunveränderlichkeit (gebuchte Einträge können nicht mutiert werden, auch nicht per Un-Posting/DELETE seit Migration 0007) | Muss | Umgesetzt (Foundation) |
| F-06 | Zahlungs-, Depot- und Schuldner-Restriktionskontrollen (Payment Restriction Control) | Muss | Umgesetzt (Foundation) |
| F-07 | Service-Katalog, Service-Order-Flow, Ticket-Lifecycle mit Ereignis-Historie | Muss | Umgesetzt (Foundation) |
| F-08 | Workforce-Tasks, SLA-Board, Medien-/Fotonachweis-Workflow für Feldpersonal | Muss | Umgesetzt (Foundation) |
| F-09 | Live-Dashboard mit Supabase-Realtime-Subscription und 30-Sekunden-Polling-Fallback | Soll | Umgesetzt (Foundation) |
| F-10 | Volltext-/Fuzzy-Suche über operative Datensätze (`operational_search_documents`) | Soll | Umgesetzt (Foundation) |
| F-11 | Audit-Log für sensible Aktionen (Finanz, Zugang, KI-Entscheidungen) mit Akteur, Modul, Grund, Risiko, Zeitstempel | Muss | Umgesetzt (Foundation) |
| F-12 | Sicherheits-Hardening: Signup-Trigger vertraut keinen Client-seitig gesetzten Rollen mehr, RLS-WITH-CHECK gegen Selbst-Eskalation, anon-Zugriff auf Security-Definer-RPCs entzogen (Migration 0007) | Muss | Umgesetzt (Foundation) |

### 7.2 New-Level-Premium-Modul (Erweiterung über den ursprünglichen Auftrag hinaus)

Dieses Modul ist die konkrete Umsetzung der vom Auftraggeber gewünschten Funktionalitätserweiterung und war im ursprünglichen 15-Phasen-Fahrplan nicht als eigenständiger Baustein vorgesehen.

| ID | Anforderung | Priorität | Status |
|---|---|---|---|
| N-01 | Öffentliche, mehrsprachige Landingpage `/[locale]/new-level-premium` nach AIDA-Trichter-Struktur (Attention/Interest/Desire/Action/Loyalty/Share/Love) | Muss | Umgesetzt (Demo-sicher) |
| N-02 | Kontofreie Registrierung für Owner/Tenant/Staff mit hart serverseitiger Rollen-Allowlist, Manager, Accountant, Admin sind serverseitig, nicht nur UI-seitig, von der öffentlichen Registrierung ausgeschlossen (403) | Muss | Umgesetzt (Demo-sicher) |
| N-03 | Identitätsprüfung bei Owner-/Tenant-Registrierung (TC Kimlik oder Passnummer + Ausstellungsland) mit provider-neutralem IDV-Gateway; ohne konfigurierten Provider deterministisch simuliert, niemals ein Rohdokumentbild speichernd ("verify-then-discard") | Muss | Umgesetzt (Demo-simuliert, kein echter IDV-Provider angebunden) |
| N-04 | Eigentümer-gesponsertes, zeitlich begrenztes Zugangsmodell für Mieter (Owner stellt Zugriffscode mit Start-/Enddatum aus, Scope als Teilmenge der eigenen Rechte, automatischer Ablauf, Owner bleibt für Mieter-Aktionen im Audit-Trail zurechenbar) | Muss | Umgesetzt (UI-Ebene) |
| N-05 | Kontofreier, öffentlicher Meldekanal (`public-report`) für Gäste/Besucher/Dienstleister ohne Systemzugang, mit Kategorien (Reinigung/Technik/Sicherheit/Garten/Amenity/Lärm/Sonstiges), ausschließlich schreibend, ohne interne Datenrückgabe | Muss | Umgesetzt (Demo-sicher) |
| N-06 | QR-Code-Poster für den Vor-Ort-Einsatz, serverseitig generiert, mit `robots: noindex/nofollow` | Soll | Umgesetzt |
| N-07 | Alle öffentlichen Schreibpfade (Registrierung, Meldung, KI-Interesse) laufen über eine einzige, allowlisted Security-Definer-Datenbankfunktion (`submit_public_intake`), die ausschließlich anonyme, geprüfte Aktionstypen akzeptiert und jede Anfrage als `queued` für menschliche Triage markiert | Muss | Umgesetzt (Foundation) |
| N-08 | KBS-/KVKK-bewusste Aufbewahrungsfrist für Identitätsdaten aus öffentlichem Intake: 180 Tage Standardwert im Code, reines Queueing einer möglichen Behördenmeldung in eine Integrations-Outbox, **keine tatsächliche Übermittlung an türkische Behörden implementiert** | Muss | Umgesetzt im Code; rechtliche Endfreigabe durch lizenzierten türkischen Anwalt noch offen (siehe Kapitel 8.2) |
| N-09 | Datenblind konstruierter öffentlicher KI-Concierge (`site-concierge` + `/api/ai/public-chat`): lädt konstruktionsbedingt niemals ein Nutzerprofil oder Repository-Daten, antwortet aus einer vierfach-mehrsprachigen, kuratierten Wissensbasis, mit hart verdrahtetem Ablehnungsverhalten bei privaten Datenanfragen | Muss | Umgesetzt (Demo-sicher) |
| N-10 | WhatsApp-Kontaktbutton mit sprachabhängigem Prefill; Platzhalternummer im Demo-Betrieb bewusst ungültig | Soll | Umgesetzt (Demo-Platzhalter) |
| N-11 | Zeitzugang-Verwaltungspanel im Users-Dashboard (Übersicht laufender/ablaufender/abgelaufener Mieter-Einladungen, Verlängern, Widerrufen) | Muss | Umgesetzt als reine Client-Simulation, **keine Backend-Persistenz**, jede Änderung geht bei Neuladen verloren |
| N-12 | Analytics zu öffentlichen KI-Concierge-Anfragen (Themenklassifikation, keine Identität) zur Produktlernschleife | Kann | Umgesetzt (Foundation) |

### 7.3 Basisfunktionalitäten

| ID | Anforderung | Priorität | Status |
|---|---|---|---|
| B-01 | Vollständige Mehrsprachigkeit in 4 Sprachen (Türkisch, Englisch, Deutsch, Russisch) über zwei ergänzende Übersetzungsschichten: next-intl-Messages für UI-Strukturtexte und ein eigenständiges Business-Copy-Wörterbuchsystem für Freitext-Seed-Daten | Muss | Umgesetzt |
| B-02 | Dunkel-/Hell-Modus | Soll | Umgesetzt |
| B-03 | Lokale Access-Profile für kontrollierte QA/Demo-Umgebungen ohne echte Supabase-Session (ausdrücklich nicht für Produktion vorgesehen) | Muss (für QA) | Umgesetzt, muss vor Produktionsfreigabe deaktiviert oder strikt gegated werden |
| B-04 | Interner, rollenbewusster KI-Assistent mit RBAC-Zugriffsprüfung vor jeder Antwort und hartem Verbot, Finanz-/Zugangs-/Berechtigungsaktionen selbst auszuführen | Muss | Umgesetzt (Foundation, deterministischer Fallback ohne konfiguriertes KI-Gateway) |
| B-05 | Responsive PWA-taugliche Web-App-Architektur (kein separates natives App-Repo) | Muss | Umgesetzt als Web-App; PWA-Hardening (Manifest, Offline, Push) ist Phase 12 |
| B-06 | Playwright-E2E-Testsuite über Landingpage, Login, Dashboard, Sprache, Responsivität | Muss | Umgesetzt |

### 7.4 Weiterentwicklung, Phase 10–15 (geplant)

| ID | Anforderung | Priorität | Status |
|---|---|---|---|
| W-01 (Phase 10) | Booking/Reservation, Move-in, Checkout unter Nutzung des Phase-5–9-Fundaments (Verfügbarkeit, Kaution, Reinigungsaufgaben, Zugangsaktivierung/-deaktivierung, Schadensabwicklung) | Muss | Geplant, nächster aktiver Build |
| W-02 (Phase 11) | Kommunikationszentrum: Chat, Ankündigungen, Benachrichtigungen, Dokumentenablage mit Berechtigungsprüfung | Muss | Geplant |
| W-03 (Phase 12) | Mobile-PWA-Hardening: Manifest, mobile Navigation, Performance-Optimierung, Push-Konzept | Soll | Geplant |
| W-04 (Phase 13) | Externe Integrationen: Zahlungs-/Bank-/SMS-/Zugangs-Adapter mit Retry-Queue und Integrations-Health-Dashboard, kein stiller Fehlerpfad | Muss | Geplant, Vendor-Entscheidungen offen (siehe Kapitel 6.2) |
| W-05 (Phase 14, Tier 1) | KI Grounded Operational Assistant: rollenbasierte Q&A mit Quellenangaben, vierfach mehrsprachig ("KPI erklären") | Soll | Geplant |
| W-06 (Phase 14, Tier 2) | KI Predictive Risk & Briefings: Zahlungsausfallrisiko je Einheit, Belegungs-/Cashflow-Prognose, tägliche Rollen-Briefings, Compliance-Frühwarnung | Kann | Geplant, Sichtbarkeit von Risiko-Scores je Rolle noch zu entscheiden |
| W-07 (Phase 14, Tier 3) | KI Advanced Analytics & Reporting: On-Demand-Berichte mit natürlichsprachigen Zusammenfassungen, Multi-Currency (TRY/EUR/USD), Trend-Erkennung | Kann | Geplant |
| W-08 (Phase 15) | Vollständige UAT mit realistischen Kundendaten, Security-/RLS-Review, Backup/Restore-Nachweis, Launch-Runbook, Hypercare-Woche | Muss | Geplant, explizit **nicht** im aktuellen beschleunigten Lieferfenster enthalten (siehe unten) |

**Zeitliche Einordnung:** Für die Implementierung, automatisierte Qualitätssicherung (Unit-Checks, E2E-/Regressionsskripte, Browser-Smoke-Checks) der Phasen 11–15 gilt laut internem Ausführungsplan ein Zielfenster bis Mittwoch, 8. Juli 2026, ausdrücklich **ohne** eine vollständige explorative manuelle QA-/UAT-Runde, die als separate, zusätzlich zu planende Aktivität behandelt wird (`docs/ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md`, `docs/PROJECT-HANDBOOK.md` Abschnitt 3.1).

### 7.5 Scope-Abgrenzung

**Aktuell demo-sicher umgesetzt:** Sämtliche in 7.1–7.3 gelisteten Punkte, lauffähig mit deterministischen Seed-Daten und ohne Abhängigkeit von einer produktiven Supabase-Cloud-Instanz.

**Explizit noch nicht produktionsscharf, unabhängig vom Umsetzungsgrad im Code:** Echte Behördenübermittlung (KBS/EGM), echter IDV-Provider, Backend-Persistenz des Zeitzugang-Panels, jede Zahlungs-, Bank- oder Zugangshardware-Integration, produktive Supabase-Cloud-Einrichtung, WhatsApp-Business-Verifizierung, jede Aussage zu "Live"-Status für KI-Automatisierung jenseits reiner Empfehlung. Diese Punkte sind nicht durch weitere Entwicklung allein lösbar, sondern erfordern die in Kapitel 8.2 gelisteten Kunden-/Legal-/Vendor-Entscheidungen.

---

## Kapitel 8: Chancen und Risiken

### 8.1 Chancen

| Chance | Begründung |
|---|---|
| Kombination aus Finanz-Ledger-Tiefe, strukturiertem Service-Desk und kontrolliertem KI-Layer ist am türkischen Markt ohne direktes Gegenstück | Keiner der fünf recherchierten türkischen Wettbewerber (Kapitel 3.1) bietet diese Kombination; nur Apsiyon hat vergleichbare KI-Reichweite, aber ohne die Finanz-Ledger-Tiefe von 1Çatı. |
| Steigende KI-Akzeptanz in der Zielbranche trifft auf ein bereits umgesetztes, vertrauensbildendes Human-Approval-Prinzip | Die KI-Nutzung unter Property-Managern verdoppelte sich in einem Jahr nahezu (21 %→34 %, Quelle 5); 1Çatıs Grundprinzip ("KI empfiehlt, Mensch entscheidet") ist bereits als hartes Sicherheits-Gate im Code umgesetzt (Foundation-Stand, deterministischer Fallback ohne aktives KI-Gateway) und deckt sich konzeptionell mit der Positionierung führender globaler Anbieter. |
| Schrumpfender Markt erhöht den relativen Wert operativer Exzellenz gegenüber Bestandskunden | In einem Markt mit -27 % Ausländerverkäufen (Mai 2026, Quelle 3) wiegt die Qualität der laufenden Verwaltung bestehender Einheiten stärker als reine Neukundenakquise, 1Çatıs Kernnutzen (Transparenz, Self-Service, verlässliches Ledger) zielt genau darauf. |
| New-Level-Premium-Modul als wiederverwendbares Muster für weitere Referenzprojekte | Der öffentliche, kontofreie Registrierungs-/Meldekanal mit gestufter Identitätsprüfung ist ein generisches, auf weitere Bauprojekte übertragbares Muster (siehe Kapitel 5.2). |

### 8.2 Risiken und offene Entscheidungen

Die folgenden 13 Punkte sind laut `docs/PROJECT-HANDBOOK.md` Abschnitt 6 bewusst nicht durch Dokumentation oder weitere Implementierung allein lösbar, sondern erfordern Kunden-, Legal-, Finance- oder Vendor-Entscheidung vor Produktionslaunch:

| Thema | Erforderliche Entscheidung |
|---|---|
| Supabase Cloud Pro | Projekt, Region, Environment-Variablen, RLS-Verifikation, Backup-Policy, Billing-Owner, Budgetobergrenze, Produktions-Credentials. |
| Lokale Access-Profile | Vor Produktion deaktivieren, sofern nicht explizit für eine kontrollierte Umgebung freigegeben. |
| Zahlungsanbieter | Provider wählen oder manuellen/bank-first-Workflow bestätigen. |
| Kostenregister externer Abhängigkeiten | Budget, Jira-Gruppierung, Billing-Owner und Beschaffungs-Owner für Supabase Cloud Pro, Vercel, Jira/Xray, Monitoring, E-Mail, SMS, Zahlungen, KI, Storage, Zugang/Sicherheit, Buchhaltungstools freigeben. |
| Drittanbieter-Vendor-Shortlist | Zahlungs-, SMS-, E-Mail-, Push-, Wallet-/Top-up-, Monitoring- und Zugangs-/Sicherheitsanbieter vor Ausstellung von Produktions-Credentials freigeben. |
| Bankabgleich | Quelldateien, Provider-Daten und Abgleichsregeln bestätigen. |
| Zugangssystem | Vendor-/API-/manuellen-Fallback und rechtliche Grenze für Restriktionsaktionen bestätigen. |
| Schuldenbasierte Restriktionen | Legal-/Accounting-Review und kundenfreigegebene Policy. |
| Datenretention | Aufbewahrungsfristen für Finanzen, Identität, Dokumente, Medien, Chat und KI-Ereignisse festlegen (für das New-Level-Premium-Modul zusätzlich die in Kapitel 2.4/7.2 beschriebene, noch nicht anwaltlich final bestätigte KBS-Einordnung). |
| Native App | Bestätigen, ob PWA-first weiterhin akzeptiert wird oder native Wrapper später nötig werden. |
| Historische Migration | Entscheiden, welche Historie nutzbar, rechtlich zulässig und ausreichend saubereist für einen Import. |
| Produktions-UAT | Verpflichtendes UAT mit realistischen Daten durchführen und Sign-off dokumentieren. |
| Jira Live Sync | Freigabe erteilen, wann vertrauliche Dokumente angehängt und Remote-Jira/Xray-Schreibzugriffe erlaubt werden dürfen; bis dahin ausschließlich Dry-Run. |

Zusätzliches, für das New-Level-Premium-Modul spezifisches Risiko: Die endgültige rechtliche Einordnung einzelner Einheiten als kommerzielle Kurzzeitvermietung (KBS-pflichtig) versus Langzeit-Wohnmiete (Adres Kayıt Sistemi) ist noch nicht anwaltlich final bestätigt; bis dahin bleibt jede KBS-Meldung im Code auf reines Queueing beschränkt, ohne tatsächliche Behördenübermittlung (Kapitel 2.4, 7.2).

---

## Kapitel 9: Umsetzungsplan

### 9.1 Entwicklungsansatz

Entwicklung auf Basis des bestehenden WAMOCON-Standard-Stacks (Next.js 16 App Router, TypeScript, Tailwind CSS v4, Supabase, Vercel), mit KI-gestützten Coding-Agenten als Entwicklungswerkzeug und einem festen, mehrstufigen Harness-Prozess (Scope Lock → Design Lock → Implementation Loop → Automated Quality Loop → Retry Loop → Manual Browser QA → Sign-off) je Phase. Jede Phase gilt erst als abgeschlossen, wenn dokumentierte Akzeptanzkriterien erfüllt **und** gespeicherte Qualitätsevidenz (Typecheck/Lint/Build/Playwright-E2E/Browser-Audit) vorliegt.

### 9.2 Fahrplan

| Phase | Fokus | Status |
|---|---|---|
| 1–9 | Discovery, UX/RBAC-Design, Plattform-Fundament, Site-/Unit-Modell, Nutzerverwaltung, Finanz-Ledger, Zahlungs-/Schuldnerkontrollen, Service-Katalog, Task-/SLA-/Feldreporting | Abgeschlossen als Implementierungsfundament (Foundation/UAT-reif) |
| New-Level-Premium-Modul | Öffentliche Landingpage, Registrierung, Meldekanal, Identitätsprüfung, Zeitzugang, öffentlicher KI-Concierge | Umgesetzt (Demo-sicher), außerhalb der ursprünglichen 15-Phasen-Nummerierung |
| 10 | Booking, Move-in, Checkout | Nächster aktiver Build |
| 11 | Kommunikation, Benachrichtigungen, Dokumente | Beschleunigtes Lieferfenster |
| 12 | Mobile PWA Hardening | Beschleunigtes Lieferfenster |
| 13 | Externe Integrationen | Beschleunigtes Lieferfenster, Vendor-Entscheidungen offen |
| 14 | KI-Premium-Layer, Advanced Analytics | Beschleunigtes Lieferfenster |
| 15 | QA, Security, Performance, UAT, Training, Launch | Beschleunigtes Lieferfenster für Implementierung/automatisierte QA; vollständige explorative manuelle UAT-Runde separat zu planen |

### 9.3 Realistische Einordnung

Der aktuelle Stand ist ein funktionsfähiges, mit deterministischen Seed-Daten lauffähiges Implementierungsfundament für interne Prüfung, Stakeholder-Demos und erste Kundenreaktionen, kein produktiv freigegebenes Endprodukt. Insbesondere Zahlungsabwicklung, Zugangskontrolle, Behördenmeldung (KBS) und jede Form von KI-Automatisierung starten bewusst mit manuellen Fallback-Prozessen bzw. reinem Empfehlungscharakter, die erst nach den in Kapitel 8.2 gelisteten Entscheidungen produktionsscharf geschaltet werden dürfen.

---

## Quellenverzeichnis

Alle Quellen wurden am 04.07.2026 recherchiert. Wo möglich, wird das Veröffentlichungsdatum der Quelle selbst angegeben; bei laufend aktualisierten Anbieterseiten ohne festes Publikationsdatum ist das Abrufdatum vermerkt. Marktforschungszahlen unterschiedlicher Institute wurden bewusst nicht zu einer einzigen Zahl harmonisiert, sondern mit ihrer jeweiligen Quelle nebeneinander dargestellt, da sie unterschiedliche Marktabgrenzungen verwenden.

| Nr. | Quelle/URL | Inhalt | Veröffentlichungs-/Abrufdatum |
|---|---|---|---|
| 1 | P.A. Turkey, paturkey.com/news/2026/foreign-home-sales-in-turkey-fall-to-nine-year-low-as-investor-interest-weakens-26987 | Ausländerverkäufe Türkei 2025 (21.534, −9,4 %), historischer Peak 2022 (67.490) | 2026 (Berichtszeitraum 2025) |
| 2 | Daily Sabah, dailysabah.com/business/economy/house-sales-to-foreigners-in-turkiye-at-lowest-in-9-years-in-2025 | Ausländeranteil am Gesamtmarkt 1,3 % (Neunjahres-Tiefststand) | 2026 (Berichtszeitraum 2025) |
| 3 | yenialanya.com, „TÜİK verilerine göre emlak satışları yüzde 31 geriledi" | Mai-2026-Zahlen: Ausländerverkäufe −27 % (1.387 Einheiten), Gesamtmarkt −31,2 % | 18.06.2026 |
| 4 | yenialanya.com, „Ruslar Alanya'dan vazgeçmiyor: 4 yılda 15 bin konut satın aldılar" | Alanya russische Käufer 2022–2025 (6.640→1.662), Alanya-Führungsposition | 11.06.2026 |
| 5 | AppFolio, appfolio.com/blog/ai-report | KI-Adoption US-Property-Manager 21 %→34 % (2024→2025) | 03.04.2025 |
| 6 | National Apartment Association, naahq.org, Zusammenfassung AppFolio-Benchmark-Report 2025 | Ergänzende Berichterstattung zum selben AppFolio-Kundendaten-Benchmark; erschien laut Abrufdatum wenige Tage vor AppFolios eigenem Blogartikel (Zeile 5), vermutlich auf Basis vorab bereitgestellter Report-Daten | 27.03.2025 |
| 7 | Buildium, buildium.com/features/ai-property-management-software | Lumina-AI-Agentensuite, 83 % Zeitersparnis, Human-Review-Prinzip | Abgerufen 04.07.2026 |
| 8 | PR Newswire, DoorLoop AI Assistant Launch | „über die Hälfte" der Mieteranfragen automatisiert gelöst | 30.09.2025 |
| 9 | PR Newswire, DoorLoop AI Inspections | Aktualisierte Kennzahl „bis zu 80 %"; neues Feature AI Inspections | 10.02.2026 |
| 10 | bthaber.com, „Apsiyon ADA ve ASYA'yı tanıttı" + apsiyon.com/en/property-management-assistant | Apsiyon-KI-Assistenten ASYA (Manager) und ADA (Bewohner) | 19.02.2024 (Feature weiter live, beobachtet 04.07.2026) |
| 11 | cardak.app | Neuer türkischer KI-native Wettbewerber (Gemini-API, KVKK-konform, Ideathon-Sieger 2025) | Beobachtet 04.07.2026 |
| 12 | odyosi.com | Neuer türkischer Wettbewerber, KI-gestützte Vorbuchhaltung/Risikoreporting | Beobachtet 04.07.2026 |
| 13 | International Investment / Alomaliye.com | März-2026-Ausländerverkäufe (1.353, −20 %), Nationalitäten Russland/Iran/Deutschland | 17.04.2026 |
| 14 | Anadolu Ajansı (AA), „Türkiye'de 2025'te 1 milyon 688 bin 910 konut satıldı" (Jahresrückblick-Artikel mit monatlicher Aufschlüsselung) | Gesamtmarkt 2025 (1.688.910, +14,3 %), Provinz-Ranking Istanbul/Antalya/Mersin, darin enthaltener Einzelmonatswert November 2025 (Antalya 662 Einheiten, Platz 2) | 2026 (Berichtszeitraum 2025, inkl. Novembermonatsdaten) |
| 15 | yenialanya.com, „Yabancıya konut satışında Alanya zirvedeki yerini bırakmadı" | Alanya-Anteil an russischen Käufen 2026 (~41 %) | 12.06.2026 |
| 16 | Hürriyet Daily News, hurriyetdailynews.com | Ursachenanalyse Rückgang (Preise, 400.000-USD-Schwelle, Aufenthaltstitel-Debatte) | 2026 (Berichtszeitraum 2025) |
| 17 | TÜİK, Hanehalkı Bilişim Teknolojileri (BT) Kullanım Araştırması, 2025 | Internetnutzung 90,9 %, WhatsApp 88,6 %, Instagram 68,1 %, YouTube 72,9 % | 27.08.2025 |
| 18 | Turkish Minute, turkishminute.com | Sekundärbestätigung derselben TÜİK-Zahlen | 27.08.2025 |
| 19 | DataReportal, „Digital 2026: Turkey" | Instagram 62,3 Mio. (70,9 %), Internet-Penetration 88,3 %, Mobilfunkanschlüsse 81,9 Mio. (93,3 %), davon 97,8 % breitbandfähig | 08.11.2025 |
| 20 | NapoleonCat, „Instagram users in Turkey" | Instagram 64,2 Mio. (74,1 %), März 2026 | 01.03.2026 |
| 21 | Grand View Research, Property Management Software Market | Globaler Markt 2025: 3,61 Mrd. USD → 5,89 Mrd. USD (2033), CAGR 6,4 % | Zuletzt aktualisiert 30.12.2025 |
| 22 | Verified Market Research (via GlobeNewswire) | Alternative Prognose: 5,12 Mrd. USD bis 2032, CAGR 5,93 % | 11.01.2026 |
| 23 | Allied Market Research (via PR Newswire) | Alternative Prognose: 7,8 Mrd. USD bis 2033, CAGR 8,9 % | Nicht exakt datiert |
| 24 | Precedence Research, PropTech Market | Globaler PropTech-Markt 47,08 Mrd. USD (2025) → 185–209 Mrd. USD (2034/35), CAGR 16,4 % | 20.01.2026 |
| 25 | Mordor Intelligence, PropTech Market | PropTech-Markt 45,20 Mrd. USD (2025) → 120,74 Mrd. USD (2031), CAGR 17,79 % | Prognosehorizont bis 2031, beobachtet 07/2026 |
| 26 | Ken Research, Turkey Real Estate PropTech and Housing Platforms Market | Türkei-PropTech/Listing-Plattformen 1,4 Mrd. USD (nicht identisch mit Property-Management-Software) | Laut Metadaten 15.09.2025 |
| 27 | P&S Market Research, UAE & Saudi Arabia Property Management Software Market | VAE 68,2 Mio. USD (2023)→112,3 Mio. USD (2030); Saudi-Arabien 46,7 Mio. USD (2023) | Basisjahr 2023 |
| 28 | Astute Analytica (via GlobeNewswire) | Saudi-Arabien alternative Prognose 94,13 Mio. USD bis 2032 | 12.06.2024 |
| 29 | Grand View Research, MEA Property Management Software Outlook | MEA-Gesamtmarkt 163,8 Mio. USD bis 2033, CAGR 3,6 % | Nicht exakt datiert |
| 30 | CottGroup, „Yeniden Değerleme Oranına Göre 2026 Yılı KVKK İdari Para Cezaları" | KVKK-Neubewertungsrate 2026 (25,49 %), Amtsblatt Nr. 33090 | 27.11.2025 (Amtsblatt) |
| 31 | Mondaq/Esenyel Partners, 2026 Yılı KVKK İdari Para Cezaları | VERBİS-Bußgeld 2026: 341.809–17.092.242 TRY | 02.01.2026 |
| 32 | Mondaq/Esenyel Partners, 2026 VERBİS Kayıt İstisnaları | VERBİS-Registrierungsschwellen und Mikro-Ausnahme 2026 | 2026 |
| 33 | European Commission, Data protection adequacy for non-EU countries | Offizielle Angemessenheitsliste; Türkei nicht gelistet | Letztes Update 10.02.2026 |
| 34 | Marpatas, „European Commission Rejects Turkey's Data Protection Adequacy" | Ablehnung der Angemessenheitsprüfung am 13.12.2023 | Zugriff 04.07.2026 |
| 35 | European Data Protection Board, Guidelines 3/2018 on the territorial scope of the GDPR | Art.-3(2)-Beispiel einer Nicht-EU-Website mit EU-Zielgruppe | 2018 |
| 36 | Captain Compliance, GDPR Article 27 EU Representative | Art.-27-Pflicht, Ausnahmen, Bußgeldrahmen | Zugriff 04.07.2026 |
| 37 | IAPP, Commentary on Dutch DPA's fine (Locatefamily.com) | Präzedenzfall 525.000 Euro wegen fehlendem Art.-27-Vertreter | 01.07.2021 |
| 38 | CMS Law, GDPR Enforcement Tracker Report 2025/2026 | Aggregierte DSGVO-Bußgeldstatistik (~2.685 Fälle, ~6,11 Mrd. Euro bis 01.03.2026) | 01.03.2026 |
| 39 | Apsiyon, apsiyon.com/en/packages | Pakettiers Blue/Black/Kurumsal, Feature-Staffelung | Beobachtet 04.07.2026 |
| 40 | Senyonet, senyonet.com.tr/site-yonetim-yazilimi | Modulbeschreibung, kein KI-Feature auffindbar | Beobachtet 04.07.2026 |
| 41 | Yönetimcell, yonetimcell.com | Positionierung „Einfachheit", 30-Tage-Test | Beobachtet 04.07.2026 |
| 42 | Aidatium, aidatium.com.tr | Preisstaffelung nach Einheitenzahl | Beobachtet 04.07.2026 |
| 43 | Siteplus, siteplus.com.tr/en | Facility-Management-Dienstleistungsbeschreibung | Beobachtet 04.07.2026 |
| 44 | SiliconANGLE, EliseAI Funding | Series E 250 Mio. USD, 2,2 Mrd. USD Bewertung, laut Unternehmensangabe rund 10 % Nutzung im US-Apartmentmarkt | 20.08.2025 |
| 45 | Meta for Developers, Pricing on the WhatsApp Business Platform | Pro-Nachricht-Preismodell seit 01.07.2025, Kategorien, kostenlose Service-Nachrichten seit 01.11.2024 | Laufend aktualisiert, abgerufen 07/2026 |
| 46 | YCloud Blog, WhatsApp API Pricing Update Effective April 1 2026 | Türkei Utility/Authentication −83 % (0,0053→0,0009 USD) | 13.03.2026 |
| 47 | Uptail Blog / WhatsApp-Business-Verifizierungsanforderungen (Branchen-Synthese) | Verifizierungsvoraussetzungen, Bearbeitungsdauer 1–6 Wochen | 03.07.2026 |
| 48 | OpenAI, developers.openai.com/api/docs/pricing | Aktuelle LLM-API-Preise; günstigste beobachtete Stufe (Nano-Tier) 0,20 USD Input / 1,25 USD Output pro 1 Mio. Token, 90 % Rabatt auf zwischengespeicherte Eingabe-Token (Referenz, kein aktiver 1Çatı-Vertrag) | Preisstand beobachtet 04.07.2026, laufend aktualisiert |

### Interne Referenzdokumente

Diese internen, nicht-öffentlichen Dokumente wurden für die Beschreibung des aktuellen Implementierungsstands (Kapitel 1, 6, 7, 8) ausgewertet und bilden zusammen mit dem tatsächlichen Code die eigentliche Quelle der Wahrheit für den technischen Stand:

- `docs/PROJECT-HANDBOOK.md`, Implementierungsstatus, Phasenwahrheit, 13 offene Entscheidungen
- `docs/requirements/option-3-ai-site-crm/BRD.md`, `PRD.md`, `TRD.md`, Geschäfts-, Produkt- und technische Zielanforderungen
- `docs/requirements/option-3-ai-site-crm/Security-Compliance-Plan.md`, `Data-Migration-Plan.md`, `QA-UAT-Launch-Plan.md`, Sicherheits-, Migrations- und Launch-Checklisten
- `docs/requirements/option-3-ai-site-crm/Third-Party-Integration-And-Vendor-Plan.md`, `Source-Register.md`, Vendor-Shortlists und Quellenregister
- `docs/requirements/option-3-ai-site-crm/Implementation-Delivery-Plan.md`, `docs/ways-of-work/implementation/option-3-ai-site-crm/phase-execution-runbook.md`, Lieferplan und Harness-Kadenz
- `docs/offers/new-level-premium-landing-page-offer.md`, `kbs-identity-legal-brief.md`, `ki-premium-layer-offer.md`, Leistungsbeschreibungen und rechtliche Ersteinschätzung zum New-Level-Premium-Modul und KI-Premium-Layer
- `CLAUDE.md`, `AGENTS.md`, Technische Agenten-Referenzdokumentation mit verifiziertem Code-Abgleich
