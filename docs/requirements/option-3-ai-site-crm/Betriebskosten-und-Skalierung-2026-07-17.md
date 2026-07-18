# 1Çatı — Betriebskosten, Lücken und Skalierung

## Managementbericht für die Entscheidung über den Produktivbetrieb

Version: 1.0
Stand: 17. Juli 2026
Erstellt für: Geschäftsführung WAMOCON GmbH / Ataberk Estate
Erstellt von: 1Çatı Produkt und Technik
Vertraulichkeit: STRENG VERTRAULICH

---

## 0. Das Wichtigste in Kürze

Wer nur eine Seite liest, liest diese.

**Die Software ist gebaut. Die Verbindungen zur Außenwelt fehlen.**

1Çatı hat 14 funktionierende Module, 125 Datenbanktabellen, ein geprüftes Rechtemodell und den echten Datenbestand von 769 Wohneinheiten. Was fehlt, ist nicht die Anwendung. Es fehlen die Anschlüsse: Zahlungen, SMS, E-Mail und WhatsApp.

**Vier Erkenntnisse, die die Entscheidung bestimmen:**

| # | Erkenntnis | Bedeutung |
|---|---|---|
| 1 | „Anbieterbereit" heißt bei vier Diensten **nicht** „Schlüssel einsetzen" | Der Code existiert noch gar nicht. Das ist Bauaufwand, keine Vertragsfrage. |
| 2 | Die Live-Aktualisierung trägt **keine 10.000 Nutzer** | Technische Sperre. Kein Budget löst das. Muss vor 5.000 Nutzern behoben werden. |
| 3 | Die **Wahl des Zahlungsweges** ist ~4× wichtiger als die Wahl des Anbieters | Rund 960.000 TRY pro Jahr Unterschied bei 1.000 Wohnungen. |
| 4 | **Ataberk darf das Geld niemals berühren** | Sonst droht der Tatbestand nicht lizenzierter Zahlungsdienste. |

**Die laufenden Kosten sind niedrig. Der Bauaufwand und die Rechtsfragen sind das Thema.**

---

## 1. Was heute existiert

Diese Angaben stammen aus dem Quellcode, nicht aus älteren Dokumenten.

| Bereich | Zustand |
|---|---|
| 14 Portal-Module | Gebaut und aufrufbar |
| Datenbank | 125 Tabellen, 37 Migrationen, produktiv eingespielt |
| Rechtemodell | Drei Ebenen, inklusive Datenbank. Geprüft: Verwalter erhält Finanzdaten, Mieter erhält eine harte Ablehnung |
| Buchhaltung | Doppelte Buchführung, gebuchte Sätze unveränderlich, Stornierung statt Löschung |
| Datenbestand | 769 Einheiten, 7 Blöcke, echte Objektdaten |
| Sprachen | Türkisch, Englisch, Deutsch, Russisch |
| Prüfungen | Typprüfung, Linting, Datenbank- und Sicherheitstests laufen automatisiert |

Das ist eine solide Grundlage. Der Bericht beschreibt, was noch fehlt, damit daraus ein Betrieb wird.

---

## 2. Die Lücke: „anbieterbereit" bedeutet zweierlei

Die Anwendung zeigt einen Statusbericht über zwölf Dienste. Das Wort „anbieterbereit" bedeutet dort zwei völlig verschiedene Dinge. Das ist der wichtigste Befund dieser Prüfung.

### 2.1 Wirklich nur Zugangsdaten fehlen

Hier existiert echter Code. Es fehlen nur Vertrag und Schlüssel.

| Dienst | Zustand |
|---|---|
| Identitätsprüfung | Echter Anbieter-Aufruf vorhanden, wartet auf Zugangsdaten |
| KI-Dienst | Echte Anbindung vorhanden, mit sicherem Rückfallverhalten |

### 2.2 Noch gar nicht gebaut

Hier ist der Anbietername **nur Beschriftung auf einer Statuskarte**. Es gibt keine Zeile Code.

| Dienst | Zustand |
|---|---|
| **Zahlungen** (iyzico / PayTR / Param) | Kein Code, keine Konfiguration |
| **SMS** (NetGSM / Twilio) | Kein Code, keine Konfiguration |
| **E-Mail** (Resend / SMTP) | Kein Code, keine Konfiguration |
| **WhatsApp** | Kein Code, und im Statusbericht gar nicht aufgeführt |
| Twenty CRM | Konfiguration wird gelesen, aber nie verwendet |
| Türsysteme, Kameras | Kein Code |

**Warum das für die Geschäftsführung wichtig ist:** Ein Kostenplan, der nur monatliche Gebühren nennt, unterschätzt den Bedarf erheblich. Vor der ersten Gebühr steht Entwicklungsarbeit.

### 2.3 Die zentrale Lücke: der fehlende Versand-Dienst

Die Datenbank besitzt eine vollständig gebaute Warteschlange für ausgehende Nachrichten, samt der Funktionen, die ein Arbeitsprozess aufrufen soll.

Diesen Arbeitsprozess gibt es nicht. Es existiert kein Zeitplan, keine Hintergrundaufgabe, und außerhalb der Tests ruft niemand diese Funktionen auf.

Der Ablauf sieht heute so aus:

| Schritt | Zustand |
|---|---|
| Anwendung legt Nachricht in die Warteschlange | Gebaut |
| Datenbank hält sie korrekt bereit | Gebaut |
| Ein Dienst holt sie ab und versendet sie | **Existiert nicht** |
| Anbindung an SMS / E-Mail / WhatsApp | **Existiert nicht** |

Die Warteschlange ist gut konstruiert und wird von niemandem geleert. **Es wird heute keine einzige Nachricht versendet.**

---

## 3. Die technische Sperre: Live-Aktualisierung

Dieser Punkt steht bewusst vor allen Kostenzahlen, weil ihn kein Budget löst.

Das Portal aktualisiert sich live. Die heutige Umsetzung meldet jedoch **jede** Änderung an **jeden** angemeldeten Nutzer, und jeder Nutzer lädt daraufhin **alle** Daten neu.

Die Last steigt dadurch nicht linear, sondern **quadratisch**: zwanzigfache Nutzerzahl erzeugt etwa sechshundertfache Last.

| Nutzer | Nachrichten pro Sekunde (Spitze) | Bewertung |
|---|---|---|
| 2.500 | 47 | Tragfähig |
| 5.000 | 189 | Grenzbereich |
| **10.000** | **758** | **Nicht tragfähig** |

Der Anbieter verarbeitet diese Meldungen technisch **einsträngig**. Ein größerer Server hilft daher **nicht**. Die Grenze des gebuchten Tarifs liegt bei 500 Nachrichten pro Sekunde.

**Empfehlung:** Umstellung auf das vom Anbieter selbst empfohlene Verfahren, das bis 250.000 gleichzeitige Nutzer erprobt ist. Das ist Entwicklungsarbeit und muss **vor 5.000 Nutzern** abgeschlossen sein. Heute nutzt das System an 18 Stellen das alte Verfahren und nur an 3 Stellen das empfohlene.

---

## 4. Die Geldfrage: der Zahlungsweg entscheidet

### 4.1 Der größte Hebel im gesamten Bericht

Die türkische Zentralbank begrenzt, was **Banken** einem Händler berechnen dürfen. Für Zahlungsinstitute gilt diese Grenze **nicht**. Deshalb darf iyzico rechtmäßig 4,29 % verlangen, obwohl Banken bei 3,56 % gedeckelt sind.

Hausgelder sind planbar, wiederkehrend und betrugsarm. Sie brauchen keine teure Kreditkartenstrecke.

**Beispiel: 1.000 Wohnungen, 2.500 TRY Hausgeld monatlich**

| Zahlungsweg | Satz | Kosten pro Monat |
|---|---|---|
| iyzico (Listenpreis) | 4,29 % + 0,25 TL | **107.500 TRY** |
| Bank-Debitkarte | 1,04 % (gedeckelt) | 27.300 TRY |
| **FAST / TR-Karekod (Konto-zu-Konto)** | **1,04 % (gedeckelt)** | **27.300 TRY** |
| Klassische Überweisung | 0 % | 0 TRY (dafür Abgleichaufwand) |

**Unterschied: rund 80.000 TRY monatlich, rund 960.000 TRY jährlich.** Allein durch die Wahl des Weges, nicht des Anbieters.

Zwei gesetzliche Vorteile sprechen zusätzlich für Konto-zu-Konto:

- Dem **Bewohner darf dabei keine Gebühr berechnet werden**. Das ist gesetzlich untersagt.
- Die Zahlung trägt eine **maschinenlesbare Referenz**. Genau das fehlt bei freier Überweisung und erzeugt dort monatliche Handarbeit.

### 4.2 Weitere Befunde

- **Stripe ist in der Türkei nicht verfügbar.** Nicht unterstützt, nicht in Vorbereitung. Als Option zu streichen.
- **Param steht unter laufendem Rechtsstreit.** Die Zentralbank hat den Betrieb am 1. Mai 2026 vorübergehend untersagt, ein Gericht hat dies am 4. Mai ausgesetzt. Der Streit ist ungeklärt. Nicht als einzigen Weg einsetzen.
- **Auf Gebühren fällt BSMV in Höhe von 5 % an, nicht KDV.** Anders als KDV ist BSMV **nicht abziehbar**. Es ist ein echter Aufschlag, kein durchlaufender Posten.
- **Zuständig ist seit 2020 die Zentralbank, nicht die BDDK.** Ältere Beratung ist überholt.

### 4.3 Die Rechtsfrage: Ataberk darf das Geld nicht berühren

Wer Hausgeld einsammelt und an die Eigentümergemeinschaft weiterleitet, erbringt dem Anschein nach einen **Zahlungsdienst**. Dieser ist erlaubnispflichtig und verlangt 2 Mio. TRY Eigenkapital.

Die übliche Ausnahme gilt für den **Kauf von Waren und Dienstleistungen**. Hausgeld ist jedoch keine Kaufsache, sondern eine gesetzliche Pflicht aus dem Wohnungseigentumsgesetz. **Die Ausnahme trägt hier möglicherweise nicht.**

**Sichere Architektur:**

> Jede Eigentümergemeinschaft ist selbst Vertragspartner der Bank. Der lizenzierte Anbieter zahlt **direkt auf deren Konto**. Das Geld berührt **niemals** ein Konto von Ataberk. Ataberk berechnet eine Softwaregebühr, niemals einen Anteil am Zahlungsstrom.

**Die Grenze:** Sobald Hausgeld auf einem Ataberk-Konto landet und weitergeleitet wird, liegt der Verdacht nicht lizenzierter Zahlungsdienste nahe. Sammelkonten und das Verrechnen der Softwaregebühr aus vereinnahmten Geldern überschreiten diese Grenze.

**Erforderlich:** schriftliche Stellungnahme einer türkischen Kanzlei vor dem Produktivstart. Zusätzlich besteht ab 50 Mio. TRY Jahresvolumen eine jährliche Meldepflicht im Januar. Diese Schwelle wird bei etwa 1.000 Wohnungen erreicht.

---

## 5. Nachrichten: vernachlässigbar

Die Kosten für Benachrichtigungen fallen wirtschaftlich nicht ins Gewicht.

| Kanal | Kosten bei 10.000 Bewohnern | Hinweis |
|---|---|---|
| WhatsApp (direkt) | 27 USD | Türkei ist einer der günstigsten Märkte weltweit |
| E-Mail (AWS SES) | 3 USD | 3,5–17× günstiger als Alternativen |
| Push-Nachrichten | 0 USD | Kostenlos |
| **Summe** | **rund 1.410 TRY monatlich** | rund 0,14 TRY je Bewohner |

**Drei Hinweise mit Geldwert:**

1. **Keinen Zwischenhändler verwenden.** Meta betreibt die Schnittstelle selbst kostenlos. Twilio verlangt das 5,5-fache dessen, was Meta tatsächlich berechnet. WhatsApp über Twilio wäre teurer als türkische SMS.
2. **Die Kategorie entscheidet.** Werbung kostet das **12-fache** einer Sachmitteilung. Eine falsch eingestufte Hausgeldmahnung kostet zwölfmal so viel und schafft rechtliche Angriffsfläche.
3. **Hausgeldmahnungen sind vermutlich von der Einwilligungspflicht befreit.** Die Verordnung nennt Inkasso und Mahnung ausdrücklich. **Bedingung:** keinerlei Werbung im Text. Ein einziger Werbesatz hebt die Befreiung auf. Rechtliche Bestätigung einholen.

---

## 6. Betriebskosten nach Größe

Alle Beträge in USD pro Monat. Wechselkurs 1 USD = 47,04 TRY (Stand 17. Juli 2026).
Einheitliche Annahme: **2.500 TRY Hausgeld je Wohnung und Monat**, Nachrichten über WhatsApp direkt, verwalteter Betrieb.

| Nutzer | Technik | Nachrichten | Zahlungen (günstiger Weg) | Zahlungen (iyzico Liste) | **Summe (günstig)** | **Summe (teuer)** |
|---|---|---|---|---|---|---|
| 500 | 84 | 2 | 290 | 1.143 | **376** | 1.229 |
| 1.000 | 155 | 3 | 580 | 2.285 | **738** | 2.443 |
| 2.500 | 357 | 8 | 1.451 | 5.713 | **1.816** | 6.078 |
| 5.000 | 584 | 15 | 2.902 | 11.425 | **3.501** | 12.024 |
| 10.000 | 1.007 | 30 | 5.803 | 22.851 | **6.840** | 23.888 |

Rechenweg für die Zahlungen (nachvollziehbar, nicht geschätzt):

- **Günstiger Weg:** Nutzer × 2.500 TRY × 1,04 % × 1,05 (BSMV) ÷ 47,04
- **iyzico Liste:** (Nutzer × 2.500 TRY × 4,29 % + Nutzer × 0,25 TRY) ÷ 47,04 — Satz ist BSMV-inklusive

**Lesehilfe:** Die Technik ist der kleinste Posten. Die Zahlungen sind der größte. Der Unterschied zwischen der günstigen und der teuren Spalte ist **allein die Wahl des Zahlungsweges**.

### 6.1 Hinweise zur Technik

- **Eigenbetrieb ist heute eine Datenschutz-Entscheidung, keine Kostenentscheidung.** Hetzner hat 2026 **zweimal** erhöht: am 1. April um 30–37 % (**auch für Bestandskunden**) und am 15. Juni die dedizierten Kerne um 113–169 % (nur Neubestellungen). Grund: Speicherpreise +58–63 % je Quartal. Die verbleibende Ersparnis wird von einem Viertel einer Betriebsstelle aufgezehrt.
- **Falls doch Eigenbetrieb: nicht die Cloud-Tarife nehmen.** Die Juni-Erhöhung hat die Rangfolge umgekehrt. Ein **dedizierter Server (AX42, 97,30 €)** ist heute **günstiger** als der vergleichbare Cloud-Tarif (CCX33, 138,49 €) — bei **doppeltem Arbeitsspeicher, ECC-Speicher, vierfacher Platte und unbegrenztem Datenverkehr**. Für eine Datenbank ist ECC-Speicher ohnehin das richtige Kriterium.
- **Was der Eigenbetrieb kostet, steht nicht auf der Rechnung.** Beim selbst betriebenen Supabase entfallen verwaltete Sicherungen, Zeitpunkt-Wiederherstellung, Lesereplikate und Kennzahlen — alles wird Eigenleistung. Das meistgemeldete Problem der Betreiber: **Datenbank-Migrationen laufen bei Updates nicht automatisch**. Zudem hat die Verwaltungsoberfläche **kein Rechtemodell** — wer die Adresse kennt, ist Administrator.
- **Der Vercel-Tarif ist zu etwa 90 % Nutzerlizenzen**, nicht Rechenleistung.
- **Der Supabase-Team-Tarif (599 USD) bringt keine zusätzliche Kapazität**, sondern Zertifizierungen und Zusicherungen. Nur kaufen, wenn diese gefordert sind.
- **Ab etwa 2 TB Dateiablage** spart eine Umstellung der Dateiablage bei Videobetrieb rund 2.000 USD monatlich, weil dort kein Ausgangsverkehr berechnet wird.

---

## 7. Datenschutz: der größte ungeklärte Punkt

### 7.1 Der Kernbefund: die EU ist rechtlich **nicht** einfacher als die USA

Die türkische Datenschutzbehörde hat **für kein einziges Land** einen Angemessenheitsbeschluss erlassen. Die Liste ist leer.

Daraus folgt ein Ergebnis, das dem verbreiteten Bauchgefühl widerspricht:

> **Deutschland und die USA liegen in derselben Stufe.** Es gibt unter KVKK **keine „EU-Abkürzung". Jede** Übermittlung — an Vercel, Supabase, Hetzner oder Cloudflare — braucht denselben **türkischen Standardvertrag** (Modul **SS-2**, Verantwortlicher → Auftragsverarbeiter), anzuzeigen binnen **fünf Werktagen** nach der **zweiten** Unterschrift, mit beglaubigter Übersetzung und Apostille.

**Wichtige Korrektur zu einer naheliegenden Annahme:** Ein Supabase-Standort in Frankfurt **hilft rechtlich nicht**. Maßgeblich ist nicht der Serverstandort, sondern die **Niederlassung des Empfängers** — und das ist die Supabase Inc. in den USA.

### 7.2 Wo der Unterschied dann doch liegt

Der Unterschied liegt nicht in der Stufe, sondern in der **inhaltlichen Prüfung**:

- Abschnitt 3 des Standardvertrags verlangt vom Empfänger die **Zusicherung, dass kein nationales Recht dem Vertrag entgegensteht**. Ein US-Anbieter unter **FISA 702 / CLOUD Act** kann das schwerer redlich unterschreiben als ein deutscher.
- Artikel 9(4) verlangt zusätzlich **wirksamen Rechtsschutz im Zielland** — für Deutschland leichter nachzuweisen.

**Daraus folgt:** Hetzner Deutschland ist die stärkste der Optionen — aber wegen dieser inhaltlichen Punkte, **nicht** wegen eines Angemessenheitsbeschlusses.

### 7.3 Der praktische Blocker

**Geprüft:** Weder die Vertragsunterlagen von Vercel noch die von Hetzner erwähnen die Türkei oder KVKK. Beide bieten nur **EU-Standardvertragsklauseln an — diese haben unter KVKK keinerlei Rechtswirkung.**

> Verweigern die Anbieter die Unterzeichnung des **türkischen** Textes, bleibt nur der Eigenbetrieb. **Das ist die Frage mit der größten Hebelwirkung im ganzen Bericht** und vor jeder Budgetfreigabe zu klären.

### 7.4 Zwei verbreitete Irrtümer, die hier ausgeräumt gehören

- **„Türkische Daten müssen in der Türkei liegen."** Falsch für gewöhnliche Software. Der einschlägige KVKK-Leitfaden erwähnt Lokalisierung **an keiner Stelle**. Eine Pflicht besteht nur für **Banken (BDDK)**, **Zahlungsinstitute (TCMB)**, **Telekommunikation (BTK)** und **öffentliche Stellen** — 1Çatı fällt unter keine davon.
- **„Wir holen einfach Einwilligungen ein."** Trägt nicht. Die Ausnahmen gelten nur für **gelegentliche** Übermittlungen; ein dauerhafter Datenbankzugriff ist ausdrücklich **nicht** gelegentlich. Standardverträge sind damit faktisch verpflichtend.

### 7.5 Die Größenordnung des Risikos

| Verstoß | Bußgeld 2026 |
|---|---|
| Anzeige des Standardvertrags versäumt | 90.308 – 1.806.177 TRY |
| **Übermittlung ganz ohne gültige Grundlage** | **bis 17.092.242 TRY** |

Nicht die vergessene Meldung ist das Risiko, sondern die Übermittlung **ohne** Grundlage.

### 7.6 Eine dauerhafte Last, die meist übersehen wird

Wechselt ein Anbieter seine **Unterauftragnehmer**, ist der Standardvertrag **erneut anzuzeigen**. Vercel und Supabase tun das laufend und einseitig. Das spricht strukturell für **einen** Anbieter mit stabilen Unterauftragnehmern.

### 7.7 Kein Ausweg über die Türkei

**Kein Hyperscaler betreibt eine Region in der Türkei.** AWS Istanbul ist nur eine *Local Zone* mit **einer** Zone (keine Ausfallsicherheit im Land) und **ohne** verwaltete Datenbank. Azure hat nichts. Google Ankara kommt **2028–29**. **Verwaltetes PostgreSQL in der Türkei existiert schlicht nicht.**

Ebenfalls überraschend: **die meisten türkischen Anbieter rechnen in USD ab**, nicht in Lira. Ein Wechsel ins Inland verringert das Währungsrisiko also **nicht**.

**Nebenbemerkung zur Umsatzsteuer:** Bei ausländischen Digitaldiensten greift das Reverse-Charge-Verfahren. Die 20 % KDV werden selbst berechnet und im selben Monat wieder abgezogen. Das ist **zahlungsstromneutral** und **kein** Kostenaufschlag. Dies wird häufig falsch dargestellt.

---

## 7a. Ein akuter Befund unabhängig vom Hosting: Ausweiskopien

Die Behörde hat mit **Grundsatzentscheidung 2025/2120** (Amtsblatt vom 9. Dezember 2025) entschieden:

| Zulässig | Unzulässig |
|---|---|
| Name, Nachname und **TC-Kimlik-Nummer** erfassen | **Den Ausweis scannen oder kopieren und das Bild aufbewahren** |
| Den Ausweis **vorzeigen lassen** und prüfen | Vorhandene Kopien weiter speichern — **sie sind zu vernichten** |

**Warum das 1Çatı betrifft:** Die Dokumentenverwaltung führt die Kategorien **„Passport", „Kimlik", „KYC" und „Identity"**. Das System kann also genau das speichern, was nach dieser Entscheidung unzulässig ist.

**Entwarnung an einer Stelle:** Die Identitätsprüfung selbst ist **richtig gebaut** — sie übergibt dem Anbieter nur **Dokumenttyp und Dokumentnummer**, kein Bild. Das entspricht der Entscheidung.

**Einschränkung, ehrlich benannt:** Die Entscheidung erging **für Hotels**. Die Übertragung auf die Vermietung ist naheliegend, aber **nicht** ausdrücklich entschieden. Rechtliche Prüfung erforderlich — vor dem ersten produktiven Upload.

**Erfreulich:** Die TC-Kimlik-Nummer ist **keine besondere Kategorie** personenbezogener Daten. Die verschärften Vertragsklauseln greifen dafür also nicht.

---

## 8. Was zu entscheiden ist

| # | Entscheidung | Wer | Dringlichkeit |
|---|---|---|---|
| 1 | Unterzeichnen Vercel und Supabase einen türkischen Standardvertrag? | Recht / Einkauf | **Vor jeder Budgetfreigabe** |
| 2 | Rechtsgutachten: Ist die Ausnahme für Hausgeld tragfähig? | Türkische Kanzlei | **Vor Produktivstart** |
| 3 | Zahlungsweg: Konto-zu-Konto als Hauptweg? | Geschäftsführung | Hoch — 960.000 TRY jährlich |
| 4 | Umbau der Live-Aktualisierung freigeben | Technik | **Vor 5.000 Nutzern** |
| 5 | Bau des Versand-Dienstes und der vier Anbindungen freigeben | Technik | Vor jedem Versand |
| 6 | Prüfung des e-Fatura-Status von Ataberk | Steuerberatung | **Sofort** — Frist bereits verstrichen |
| 7 | Ausweiskopien: Entscheidung 2025/2120 auf 1Çatı anwenden — dürfen „Passport"/„Kimlik"-Dokumente überhaupt gespeichert werden? | Türkische Kanzlei | **Vor dem ersten produktiven Upload** |

### Hinweis zu Punkt 6

Türkische Immobilienunternehmen unterliegen der e-Fatura-Pflicht bereits ab **500.000 TRY Umsatz** — dem Sechsfachen niedriger als die allgemeine Schwelle von 3 Mio. TRY. Die Frist war der **1. Juli 2026** und ist damit verstrichen. Das Bußgeld beträgt je Beleg rund 17.000 TRY. Dieser Punkt ist unabhängig von 1Çatı und sollte unverzüglich geprüft werden.

---

## 9. Empfehlung

1. **Zuerst die zwei Rechtsfragen klären** (Datenschutzverträge, Zahlungsgutachten). Beide können die Architektur bestimmen. Beide kosten Zeit, kein Geld.
2. **Zahlungsweg auf Konto-zu-Konto festlegen.** Größter Hebel, sofort wirksam, gesetzlich begünstigt.
3. **Live-Aktualisierung umbauen, bevor Nutzer wachsen.** Technische Sperre, nicht verhandelbar.
4. **Versand-Dienst und Anbindungen bauen.** Ohne sie versendet das System nichts.
5. **Betriebskosten sind beherrschbar.** Selbst bei 10.000 Nutzern liegt die Summe im niedrigen vierstelligen USD-Bereich monatlich — vorausgesetzt, der Zahlungsweg stimmt.

---

## 10. Ehrliche Angabe zu Unsicherheiten

Dieser Bericht nennt bewusst, was **nicht** gesichert ist:

- **Der Listenpreis von iyzico (4,29 %)** widerspricht kursierenden Angaben von 2,49 %. Vermutlich Liste gegen Verhandlungspreis. **Schriftliches Angebot einholen.**
- **Ob PayTRs 2,19 % BSMV enthält**, ist nicht belegt. Unterschied: 5 %.
- **Die Rechtsfrage zum Hausgeld** ist begründete Analyse, **kein Rechtsgutachten**. Es wurde keine einschlägige Entscheidung gefunden.
- **Metas Preisliste für die Türkei** war nicht direkt abrufbar. Die Zahlen stützen sich auf drei übereinstimmende Quellen. Zum 1. August und 1. Oktober 2026 sind Änderungen angekündigt.
- **Die Serverdimensionierung** beruht auf einer Schätzung. Vor Festlegung ist ein Lasttest erforderlich.
- **Der Bauaufwand** für Versand-Dienst, vier Anbindungen und Umbau der Live-Aktualisierung ist in diesem Bericht **nicht beziffert**. Er ist erheblich und getrennt zu schätzen.
- **Der Wechselkurs** bewegt sich. Die Lira hat binnen zwölf Monaten rund 17 % gegenüber dem USD verloren. USD-Kosten steigen in TRY gerechnet.
