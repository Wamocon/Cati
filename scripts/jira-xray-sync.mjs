import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

function parseEnv(text) {
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match) env[match[1]] = match[2]
  }
  return env
}

async function loadEnv() {
  const local = await fs
    .readFile(path.join(rootDir, ".env.local"), "utf8")
    .then(parseEnv)
    .catch(() => ({}))
  return { ...local, ...process.env }
}

const env = await loadEnv()
const required = [
  "JIRA_BASE_URL",
  "JIRA_EMAIL",
  "JIRA_API_TOKEN",
  "JIRA_PROJECT_NAME",
  "JIRA_PROJECT_KEY",
]
for (const key of required) {
  if (!env[key]) throw new Error(`Missing required environment variable: ${key}`)
}

const jiraBaseUrl = env.JIRA_BASE_URL.replace(/\/$/, "")
const jiraAuth = `Basic ${Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64")}`
const projectKey = env.JIRA_PROJECT_KEY.toUpperCase()
const labelPrefix = projectKey.toLowerCase()
const syncLabel = `${labelPrefix}-option3-sync`
const projectTemplateKey =
  env.JIRA_PROJECT_TEMPLATE_KEY ?? "com.pyxis.greenhopper.jira:gh-simplified-kanban-classic"

function adfText(text) {
  return { type: "text", text }
}

function paragraph(text) {
  return { type: "paragraph", content: [adfText(text)] }
}

function heading(text, level = 3) {
  return { type: "heading", attrs: { level }, content: [adfText(text)] }
}

function bulletList(items) {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  }
}

function doc(sections) {
  return {
    type: "doc",
    version: 1,
    content: sections.flatMap((section) => {
      const content = []
      if (section.title) content.push(heading(section.title, section.level ?? 3))
      if (section.text) content.push(...section.text.map(paragraph))
      if (section.items) content.push(bulletList(section.items))
      return content
    }),
  }
}

function phaseLabel(phase) {
  return `phase-${String(phase).padStart(2, "0")}`
}

const components = [
  "Produkt und Planung",
  "UX und Design",
  "Plattform und Sicherheit",
  "Stammdaten",
  "Nutzer und Rollen",
  "Finanzen",
  "Services und Tickets",
  "Buchung und Zugang",
  "Kommunikation und Dokumente",
  "Mobile PWA",
  "Integrationen",
  "KI und Analytics",
  "QA und Launch",
]

const versions = ["MVP", "V1", "V2"]

const phases = [
  {
    phase: 1,
    status: "done",
    version: "MVP",
    component: "Produkt und Planung",
    title: "Discovery, Anforderungen und Marktbenchmark abschließen",
    goal:
      "Die Kundenanforderung wird vollständig in ein belastbares Produkt-, Technik- und Liefermodell überführt.",
    outcome:
      "BRD, PRD, TRD, Marktanalyse und 15-Phasen-Plan liegen vor und bilden die Grundlage für Umsetzung, Angebot und UAT.",
    stories: [
      "BRD, PRD, TRD und Marktanhang auf Basis der Kundenanforderung finalisieren",
      "Türkische und internationale Wettbewerber als Funktionsbaseline auswerten",
      "15-Phasen-Roadmap mit MVP, V1, V2 und UAT-Szenarien freigeben",
    ],
  },
  {
    phase: 2,
    status: "in-progress",
    version: "MVP",
    component: "UX und Design",
    title: "UX/UI-System und Produktnavigation für den Betrieb definieren",
    goal:
      "Die Anwendung wird als türkischsprachiges, ruhiges und schnelles Arbeitswerkzeug für Manager, Buchhaltung, Bewohner und Mitarbeitende gestaltet.",
    outcome:
      "Designsystem, responsive Navigation, Statussprache, Wizard-Muster und rollenbezogene Startseiten sind prototypisch nutzbar.",
    stories: [
      "Türkischsprachiges Designsystem mit Farben, Typografie, Statuslogik und Barrierefreiheit erstellen",
      "Rollenbezogene Navigation für Manager, Buchhaltung, Bewohner, Eigentümer und Personal entwerfen",
      "Kritische Workflows als klickbare mobile und Desktop-Prototypen abbilden",
    ],
  },
  {
    phase: 3,
    status: "in-progress",
    version: "MVP",
    component: "Plattform und Sicherheit",
    title: "Plattformfundament, Authentifizierung, RBAC und Audit aufbauen",
    goal:
      "Die Sicherheits- und Mandantenbasis wird stabil genug, damit alle Fachmodule darauf aufbauen können.",
    outcome:
      "Supabase Auth, Rollen, Mandanten, Audit-Log, Fehlerbehandlung und sichere Servergrenzen sind vorbereitet.",
    stories: [
      "Supabase-Profile, Rollen und mandantenfähige Zugriffskontrolle implementieren",
      "Audit-Log für finanzielle, operative, Zugangs- und KI-Aktionen vorbereiten",
      "Demo-Rollen entfernen oder sauber von Produktiv-Authentifizierung trennen",
    ],
  },
  {
    phase: 4,
    status: "in-progress",
    version: "MVP",
    component: "Stammdaten",
    title: "Site-, Block-, Etagen- und Wohnungsmodell für 769 Einheiten erstellen",
    goal:
      "Alle 769 Wohnungen können mit Block, Etage, Status, Eigentümer, Mieter und Historie sauber verwaltet werden.",
    outcome:
      "Datenmodell, Importprozess, Matrixansicht und Datenqualitätsprüfung sind vorhanden.",
    stories: [
      "Produktives Supabase-Schema für Sites, Blöcke, Etagen, Wohnungen und Beziehungen anwenden",
      "Excel-Import mit Vorschau, Dublettenprüfung und Fehlerliste bauen",
      "Wohnungsmatrix, Suchfilter und Wohnungsdetail aus echten Daten anzeigen",
    ],
  },
  {
    phase: 5,
    status: "todo",
    version: "MVP",
    component: "Nutzer und Rollen",
    title: "Eigentümer, Mieter, Personal und Rollen vollständig verwalten",
    goal:
      "Jede Person im Objekt ist mit korrekten Rechten, Kontakten, Dokumenten und Wohnungen verbunden.",
    outcome:
      "Eigentümer-, Mieter-, Personal- und Rollenprofile sind produktiv nutzbar.",
    stories: [
      "Eigentümer-, Mieter-, Gast- und Personaldatensätze mit Wohnungsbeziehungen erstellen",
      "Dokumenten- und Identitätsstatus je Person mit Sichtbarkeitsregeln verwalten",
      "Rollenmatrix und Mandantenrechte für alle Module testen",
    ],
  },
  {
    phase: 6,
    status: "todo",
    version: "MVP",
    component: "Finanzen",
    title: "Finanz-Ledger als verlässliche Buchhaltungsbasis implementieren",
    goal:
      "Salden werden ausschließlich aus Ledger-Einträgen berechnet und sind vollständig prüfbar.",
    outcome:
      "Konten, Buchungen, Rückbuchungen, Abgrenzungen und Auszüge funktionieren fachlich korrekt.",
    stories: [
      "Kontenmodell für Eigentümer, Mieter, Kaution und Verwaltungsgesellschaft erstellen",
      "Buchungsregeln für Sollstellung, Zahlung, Korrektur, Rückerstattung und Ausgleich implementieren",
      "Kontoauszug, Saldenkarte und Export aus echten Ledger-Daten liefern",
    ],
  },
  {
    phase: 7,
    status: "todo",
    version: "V1",
    component: "Finanzen",
    title: "Zahlungen, Kautionen, Abgleich und Schuldenrestriktionen umsetzen",
    goal:
      "Offene Forderungen, Online-Zahlungen, Kautionen und Sperrregeln werden konsequent und nachvollziehbar gesteuert.",
    outcome:
      "Zahlungsanbieter, Webhooks, Kautionslogik, Reconciliation und Sperrregeln sind integriert.",
    stories: [
      "Payment-Intent, Provider-Webhook und idempotente Zahlungsverbuchung implementieren",
      "Kaution blockieren, verwenden, teilweise erstatten und vollständig abrechnen",
      "Schuldenregeln für Services, Buchungen und Zugang backendseitig erzwingen",
    ],
  },
  {
    phase: 8,
    status: "todo",
    version: "V1",
    component: "Services und Tickets",
    title: "Servicekatalog und Servicebestellprozess produktiv machen",
    goal:
      "Bewohner können Services bestellen, während Schulden-, Zahlungs- und SLA-Regeln automatisch greifen.",
    outcome:
      "Servicekatalog, Bestellung, Prüfung, Zahlung und Ticketanlage sind Ende-zu-Ende verbunden.",
    stories: [
      "Servicekatalog mit Preis, SLA, Zuständigkeit und Verfügbarkeit verwalten",
      "Servicebestellung mit Schuldenprüfung, Zahlung oder Belastung als Wizard bauen",
      "Akzeptierte Servicebestellung automatisch in Ticket und Aufgabe überführen",
    ],
  },
  {
    phase: 9,
    status: "todo",
    version: "V1",
    component: "Services und Tickets",
    title: "Aufgaben, Personal, SLA und mobile Arbeitsberichte umsetzen",
    goal:
      "Operatives Personal kann Aufgaben mobil bearbeiten und Management sieht Qualität, SLA und Nachweise.",
    outcome:
      "Taskboard, mobile Aufgabenliste, Mediennachweise, Eskalationen und Leistungsberichte sind verfügbar.",
    stories: [
      "Aufgabenstatus, Priorität, SLA, Zuständigkeit und Verlauf modellieren",
      "Mobile Mitarbeitendenansicht mit Foto- und Videonachweis erstellen",
      "SLA-Risiken und Mitarbeiterleistung im Managementbericht anzeigen",
    ],
  },
  {
    phase: 10,
    status: "todo",
    version: "V1",
    component: "Buchung und Zugang",
    title: "Buchung, Einzug, Auszug, Kaution und Zugang Ende-zu-Ende steuern",
    goal:
      "Der gesamte Lebenszyklus von Verfügbarkeit bis Auszug wird in einem prüfbaren Prozess abgebildet.",
    outcome:
      "Buchungskalender, Einzugs- und Auszugs-Wizard, Kautionsabrechnung und Zugangswarteschlange sind verbunden.",
    stories: [
      "Verfügbarkeitskalender mit Kollisionsprüfung und Buchungsstatus bauen",
      "Einzug mit Zahlung, Kaution, Vorbereitung, Zugang und Benachrichtigung automatisieren",
      "Auszug mit Inspektion, Schuldenausgleich, Kautionsabzug und Zugangssperre abschließen",
    ],
  },
  {
    phase: 11,
    status: "todo",
    version: "V1",
    component: "Kommunikation und Dokumente",
    title: "Kommunikation, Benachrichtigungen und Dokumente zentralisieren",
    goal:
      "Alle Gespräche, Ankündigungen, Benachrichtigungen und Dokumente sind nachvollziehbar und rollenbasiert sichtbar.",
    outcome:
      "Chat, interne Kommunikation, Push/E-Mail/SMS-Vorlagen, Dokumentenablage und Zustellstatus sind vorhanden.",
    stories: [
      "Bewohner-Management-Chat und interne Teamkommunikation mit Kontextbezug erstellen",
      "Benachrichtigungsvorlagen, Versandstatus und Wiederholversuche implementieren",
      "Dokumententresor mit Rollenrechten, Ablaufdaten und Audit-Protokoll bauen",
    ],
  },
  {
    phase: 12,
    status: "todo",
    version: "V1",
    component: "Mobile PWA",
    title: "Mobile PWA für Bewohner, Eigentümer, Personal und Manager liefern",
    goal:
      "Die wichtigsten Arbeits- und Bewohnerprozesse funktionieren schnell und verständlich auf mobilen Geräten.",
    outcome:
      "Installierbare PWA, mobile Rollenseiten, Push-Grundlage und mobile E2E-Tests sind vorhanden.",
    stories: [
      "PWA-Shell mit Rollenstartseiten und Offline-freundlicher Grundstruktur erstellen",
      "Bewohner- und Eigentümerflows für Saldo, Zahlung, Dokumente, Chat und Services bauen",
      "Personal- und Managerflows für Aufgaben, Freigaben, SLA und Tagesübersicht mobil umsetzen",
    ],
  },
  {
    phase: 13,
    status: "todo",
    version: "V2",
    component: "Integrationen",
    title: "Externe Integrationen über Adapter und sichere Webhooks anbinden",
    goal:
      "Zahlungen, Identität, Zugang, Kameras, Zähler und Benachrichtigungen sind kontrolliert integrierbar.",
    outcome:
      "Adapter, Testmodus, Webhooks, Retry-Queue, Fehlerstatus und Integrationsprotokolle sind vorhanden.",
    stories: [
      "Adapterarchitektur für Zahlungen, Identität, Zugang, Kamera, Zähler und Messaging definieren",
      "Webhook-Verarbeitung mit Signaturprüfung, Idempotenz und Wiederholung implementieren",
      "Integrationskonsole mit Status, Fehlern, manueller Wiederholung und Audit bauen",
    ],
  },
  {
    phase: 14,
    status: "todo",
    version: "V2",
    component: "KI und Analytics",
    title: "KI-Premium-Layer und fortgeschrittene Analytics kontrolliert einführen",
    goal:
      "KI unterstützt Manager, Buchhaltung, Bewohner und Personal, ohne eigenständig kritische Finanz- oder Zugangshandlungen auszuführen.",
    outcome:
      "KI-Kommandozentrale, Quellen, Konfidenz, Freigaben, Events, Evaluation und Modellwahl sind produktionsreif.",
    stories: [
      "Lokalen KI-Anbieter mit sokrates-fast, sokrates-pro, qwen3.6-35b und gemma4-31b als Provider integrieren",
      "KI-Tagesbriefing, Schuldenpriorisierung, Service-Triage und Berichtsentwürfe mit Quellen anzeigen",
      "Freigabeprozess und Audit für KI-Empfehlungen zu Finanzen, Zugang und sensiblen Daten erzwingen",
    ],
  },
  {
    phase: 15,
    status: "todo",
    version: "V2",
    component: "QA und Launch",
    title: "QA, Sicherheit, Performance, UAT, Schulung und Launch absichern",
    goal:
      "Der Launch erfolgt mit belastbaren Tests, Sicherheitsprüfung, Trainingsmaterial und Betriebsrunbook.",
    outcome:
      "UAT-Suite, Xray-Testfälle, E2E-Tests, RLS-Prüfung, Monitoring, Backup/Restore und Schulung sind abgeschlossen.",
    stories: [
      "Xray-Testfälle und UAT-Szenarien für alle kritischen Workflows pflegen",
      "Sicherheits-, Performance-, RLS-, Mobile- und Browser-QA automatisieren",
      "Launch-Runbook, Supportprozess, Schulungsunterlagen und Abnahmeprotokoll erstellen",
    ],
  },
]

const tests = [
  {
    uid: "test-001",
    component: "Services und Tickets",
    summary: "Servicebestellung wird bei offener Schuld blockiert",
    precondition: "Ein Mieter ist einer Wohnung zugeordnet und hat eine offene Forderung oberhalb der Sperrgrenze.",
    steps: [
      ["Als Mieter den Servicekatalog öffnen.", "Der Servicekatalog ist sichtbar."],
      ["Einen kostenpflichtigen Service auswählen.", "Der Bestell-Wizard zeigt Servicepreis und SLA."],
      ["Bestellung absenden.", "Das System führt die Schuldenprüfung aus."],
      ["Ergebnis prüfen.", "Die Bestellung wird blockiert und es wird eine klare Zahlungsaufforderung angezeigt."],
    ],
  },
  {
    uid: "test-002",
    component: "Services und Tickets",
    summary: "Bezahlte Servicebestellung erzeugt Ticket und Aufgabe",
    precondition: "Ein Bewohner hat keine Sperre und der gewählte Service ist aktiv.",
    steps: [
      ["Service auswählen und Zahlung bestätigen.", "Die Zahlung wird als erfolgreich markiert."],
      ["Bestellung abschließen.", "Ein Serviceauftrag wird erstellt."],
      ["Ticketboard öffnen.", "Ein Ticket mit passender Kategorie, SLA und Priorität ist vorhanden."],
      ["Aufgabendetail prüfen.", "Eine Aufgabe ist einer zuständigen Gruppe oder Person zugewiesen."],
    ],
  },
  {
    uid: "test-003",
    component: "Buchung und Zugang",
    summary: "Einzug aktiviert Aufgaben, Kaution und Zugang",
    precondition: "Eine freie Wohnung ist verfügbar und der Gast hat Zahlung und Kaution bestätigt.",
    steps: [
      ["Eine Buchung im Kalender anlegen.", "Die Verfügbarkeit wird ohne Überschneidung bestätigt."],
      ["Einzugs-Wizard starten.", "Vorbereitungsaufgaben werden vorgeschlagen."],
      ["Kaution blockieren und Einzug bestätigen.", "Kautionsstatus ist gehalten und Aufgaben sind offen."],
      ["Zugang prüfen.", "Der Zugang steht auf ausgestellt oder wartet in der Integrationswarteschlange."],
    ],
  },
  {
    uid: "test-004",
    component: "Buchung und Zugang",
    summary: "Auszug verrechnet Schäden und erstattet Restkaution",
    precondition: "Eine aktive Buchung mit gehaltener Kaution und offener Inspektionsaufgabe existiert.",
    steps: [
      ["Auszugs-Wizard öffnen.", "Inspektionscheckliste ist sichtbar."],
      ["Schaden und offene Forderung erfassen.", "Das System berechnet Abzug und Restkaution."],
      ["Auszug abschließen.", "Finale Abrechnung wird erstellt."],
      ["Zugang und Kaution prüfen.", "Zugang ist deaktiviert und Restkaution ist zur Erstattung markiert."],
    ],
  },
  {
    uid: "test-005",
    component: "Stammdaten",
    summary: "Import von 769 Wohnungen erkennt Dubletten und Pflichtfeldfehler",
    precondition: "Eine Excel-Datei enthält 769 Wohnungen, davon mindestens eine Dublette und ein fehlendes Pflichtfeld.",
    steps: [
      ["Import-Wizard öffnen und Datei hochladen.", "Die Vorschau wird erzeugt."],
      ["Validierung starten.", "Dubletten und Pflichtfeldfehler werden markiert."],
      ["Import ohne Korrektur bestätigen.", "Der Import wird verhindert."],
      ["Korrekturen anwenden und erneut bestätigen.", "Alle gültigen Wohnungen werden übernommen."],
    ],
  },
  {
    uid: "test-006",
    component: "Nutzer und Rollen",
    summary: "Mieter sieht keine vertraulichen Eigentümerdaten",
    precondition: "Eine Wohnung hat einen Eigentümer und einen Mieter mit eingeschränkten Rechten.",
    steps: [
      ["Als Mieter anmelden.", "Das Mieterportal öffnet sich."],
      ["Wohnungs- und Dokumentenbereich öffnen.", "Nur freigegebene Daten sind sichtbar."],
      ["Eigentümerabrechnung suchen.", "Die vertrauliche Eigentümerabrechnung ist nicht sichtbar."],
      ["Audit prüfen.", "Unzulässige Zugriffsversuche werden nicht als erfolgreiche Dokumentansicht protokolliert."],
    ],
  },
  {
    uid: "test-007",
    component: "Finanzen",
    summary: "Doppelter Zahlungs-Webhook erzeugt keine Doppelbuchung",
    precondition: "Ein Zahlungsanbieter sendet denselben Webhook mit gleicher Referenz zweimal.",
    steps: [
      ["Ersten Webhook verarbeiten.", "Eine Zahlung wird im Ledger gebucht."],
      ["Identischen Webhook erneut verarbeiten.", "Das System erkennt die Provider-Referenz."],
      ["Ledger prüfen.", "Es existiert nur eine Zahlung."],
      ["Audit prüfen.", "Der zweite Webhook ist als Duplikat protokolliert."],
    ],
  },
  {
    uid: "test-008",
    component: "Finanzen",
    summary: "Manueller Zahlungsausgleich benötigt Freigabe",
    precondition: "Eine nicht zuordenbare Zahlung befindet sich in der Reconciliation-Queue.",
    steps: [
      ["Als Buchhaltung die Queue öffnen.", "Die Zahlung ist als ungeklärt sichtbar."],
      ["Zahlung einem Konto zuordnen.", "Das System zeigt Konto und Risiko."],
      ["Freigabe bestätigen.", "Die Buchung wird erstellt."],
      ["Audit prüfen.", "Freigebende Person, Zeitpunkt und Ursprungsdaten sind protokolliert."],
    ],
  },
  {
    uid: "test-009",
    component: "Kommunikation und Dokumente",
    summary: "Dokumentenzugriff folgt Rollen- und Wohnungsbeziehung",
    precondition: "Ein Dokument ist einer Wohnung und einer sensiblen Kategorie zugeordnet.",
    steps: [
      ["Als berechtigter Eigentümer öffnen.", "Das Dokument ist sichtbar."],
      ["Als nicht berechtigter Bewohner öffnen.", "Das Dokument ist nicht sichtbar."],
      ["Als Manager öffnen.", "Das Dokument ist gemäß Rolle sichtbar."],
      ["Audit prüfen.", "Erfolgreiche sensible Dokumentansichten sind protokolliert."],
    ],
  },
  {
    uid: "test-010",
    component: "Kommunikation und Dokumente",
    summary: "Benachrichtigung speichert Zustellstatus und Wiederholversuch",
    precondition: "Ein SMS- oder E-Mail-Provider ist im Testmodus verbunden.",
    steps: [
      ["Eine Ankündigung an eine Zielgruppe senden.", "Nachrichten werden erzeugt."],
      ["Providerfehler simulieren.", "Der Status wird als fehlgeschlagen gespeichert."],
      ["Wiederholversuch starten.", "Der Versand wird erneut versucht."],
      ["Zustellprotokoll prüfen.", "Erfolg, Fehlergrund und Zeitpunkt sind nachvollziehbar."],
    ],
  },
  {
    uid: "test-011",
    component: "KI und Analytics",
    summary: "KI-Tagesbriefing nennt Quellen und Konfidenz",
    precondition: "Es existieren offene Schulden, SLA-Risiken und Buchungsereignisse.",
    steps: [
      ["KI-Kommandozentrale öffnen.", "Das Tagesbriefing ist verfügbar."],
      ["Briefing generieren.", "Die KI nennt Prioritäten und Begründungen."],
      ["Quellen prüfen.", "Jede Empfehlung verweist auf Datensätze oder Reports."],
      ["Audit prüfen.", "Prompt, Modell, Ergebnis und Nutzer sind gespeichert."],
    ],
  },
  {
    uid: "test-012",
    component: "KI und Analytics",
    summary: "KI darf keine Zahlung oder Zugangssperre direkt ausführen",
    precondition: "Eine KI-Empfehlung betrifft eine Rückerstattung oder Zugangssperre.",
    steps: [
      ["KI nach direkter Ausführung fragen.", "Die KI verweigert die direkte Ausführung."],
      ["Empfehlung als Aktion erzeugen.", "Eine ausstehende Empfehlung wird angelegt."],
      ["Managerfreigabe prüfen.", "Die Aktion benötigt eine menschliche Bestätigung."],
      ["Audit prüfen.", "Freigabe oder Ablehnung wird protokolliert."],
    ],
  },
  {
    uid: "test-013",
    component: "Mobile PWA",
    summary: "Mitarbeiter schließt Aufgabe mobil mit Mediennachweis ab",
    precondition: "Ein Mitarbeiter hat eine zugewiesene offene Aufgabe mit Pflichtfoto.",
    steps: [
      ["Mobile PWA als Mitarbeiter öffnen.", "Die Aufgabe ist in der Liste sichtbar."],
      ["Aufgabendetail öffnen.", "SLA, Ort und Hinweise sind sichtbar."],
      ["Foto hochladen und Abschlussnotiz erfassen.", "Die Pflichtnachweise sind erfüllt."],
      ["Aufgabe abschließen.", "Status ist erledigt und Management sieht den Bericht."],
    ],
  },
  {
    uid: "test-014",
    component: "Plattform und Sicherheit",
    summary: "Mandantendaten sind per RLS voneinander isoliert",
    precondition: "Zwei Unternehmen mit getrennten Sites, Wohnungen und Nutzern existieren.",
    steps: [
      ["Als Manager von Unternehmen A anmelden.", "Nur Daten von Unternehmen A sind sichtbar."],
      ["Direkten API-Zugriff auf Datensatz von Unternehmen B versuchen.", "Der Zugriff wird verweigert."],
      ["Such- und Reporting-Endpunkte prüfen.", "Keine Daten von Unternehmen B erscheinen."],
      ["Audit prüfen.", "Verweigerte Zugriffe können sicher analysiert werden."],
    ],
  },
  {
    uid: "test-015",
    component: "QA und Launch",
    summary: "Dashboard bleibt auf Desktop und Mobile ohne Laufzeitfehler nutzbar",
    precondition: "Produktionsbuild ist gestartet und Demodaten sind vorhanden.",
    steps: [
      ["Dashboard im Desktop-Viewport öffnen.", "KPI, Diagramme und Navigation sind sichtbar."],
      ["Dashboard im mobilen Viewport öffnen.", "Karten und Tabellen bleiben bedienbar."],
      ["Konsole und Netzwerk prüfen.", "Keine Page Errors, keine 500er Antworten und kein Body-Overflow."],
      ["Browser-Audit ausführen.", "Alle Hauptseiten bestehen die Prüfung."],
    ],
  },
]

async function jira(pathname, options = {}) {
  const response = await fetch(`${jiraBaseUrl}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      Authorization: jiraAuth,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data)
    throw new Error(`${options.method ?? "GET"} ${pathname} failed with ${response.status}: ${detail}`)
  }
  return data
}

async function getCurrentUser() {
  return jira("/rest/api/3/myself")
}

async function getProject() {
  try {
    return await jira(`/rest/api/3/project/${projectKey}`)
  } catch (error) {
    if (!String(error.message).includes("404")) throw error
    return null
  }
}

async function ensureProject(user) {
  const existing = await getProject()
  if (existing) return { project: existing, created: false }

  const body = {
    key: projectKey,
    name: env.JIRA_PROJECT_NAME,
    projectTypeKey: "software",
    projectTemplateKey,
    description:
      "Kanban-Projekt für die Umsetzung des KI-gestützten Site-Management-CRM mit Anforderungen, Phasen, Testfällen und Lieferstatus.",
    leadAccountId: user.accountId,
    assigneeType: "PROJECT_LEAD",
  }

  const created = await jira("/rest/api/3/project", { method: "POST", body })
  const project = await jira(`/rest/api/3/project/${created.key ?? projectKey}`)
  return { project, created: true }
}

async function ensureComponent(name) {
  const existing = await jira(`/rest/api/3/project/${projectKey}/components`)
  const match = existing.find((component) => component.name === name)
  if (match) return match
  return jira("/rest/api/3/component", {
    method: "POST",
    body: { project: projectKey, name, description: `Arbeitsbereich: ${name}` },
  })
}

async function ensureVersion(name) {
  const existing = await jira(`/rest/api/3/project/${projectKey}/versions`)
  const match = existing.find((version) => version.name === name)
  if (match) return match
  return jira("/rest/api/3/version", {
    method: "POST",
    body: {
      project: projectKey,
      name,
      description: `Lieferstand ${name} für das Steuerberater CRM Kanban-Projekt.`,
      released: false,
    },
  })
}

async function getProjectIssueTypes(projectId) {
  const types = await jira(`/rest/api/3/issuetype/project?projectId=${projectId}`)
  return types
}

function pickIssueType(types, candidates) {
  for (const candidate of candidates) {
    const found = types.find((type) => type.name.toLowerCase() === candidate.toLowerCase())
    if (found) return found
  }
  for (const candidate of candidates) {
    const found = types.find((type) => type.name.toLowerCase().includes(candidate.toLowerCase()))
    if (found) return found
  }
  return null
}

async function getCreateFields(issueTypeId) {
  const data = await jira(
    `/rest/api/3/issue/createmeta?projectKeys=${projectKey}&issuetypeIds=${issueTypeId}&expand=projects.issuetypes.fields`
  )
  return data.projects?.[0]?.issuetypes?.[0]?.fields ?? {}
}

function findFieldByName(fields, names) {
  const entries = Object.entries(fields)
  for (const name of names) {
    const found = entries.find(([, field]) => field.name?.toLowerCase() === name.toLowerCase())
    if (found) return found[0]
  }
  return null
}

async function searchByUniqueLabel(label) {
  const body = {
    jql: `project = ${projectKey} AND labels = "${label}" ORDER BY created ASC`,
    fields: ["summary", "status", "attachment"],
    maxResults: 1,
  }
  const result = await jira("/rest/api/3/search/jql", { method: "POST", body })
  return result.issues?.[0] ?? null
}

function phaseDescription(phase) {
  return doc([
    {
      title: "Ziel",
      text: [phase.goal],
    },
    {
      title: "Erwartetes Ergebnis",
      text: [phase.outcome],
    },
    {
      title: "Akzeptanzkriterien",
      items: [
        "Alle relevanten Anforderungen sind nachvollziehbar im Projekt erfasst.",
        "Umsetzung ist über Kanban-Status, Komponente, Version und verknüpfte Testfälle steuerbar.",
        "Kritische Backend-, Frontend-, API-, Datenbank-, Sicherheits- und QA-Aspekte sind sichtbar.",
      ],
    },
  ])
}

function storyDescription(phase, story) {
  return doc([
    {
      title: "Geschäftlicher Zweck",
      text: [story],
    },
    {
      title: "Kontext",
      text: [
        `Diese Aufgabe gehört zu Phase ${phase.phase}: ${phase.title}.`,
        phase.goal,
      ],
    },
    {
      title: "Akzeptanzkriterien",
      items: [
        "Die Umsetzung erfüllt die fachliche Anforderung und ist in deutscher Sprache verständlich dokumentiert.",
        "Backend, API, Datenbank, UI, UX, Sicherheit und Testbarkeit sind geprüft, sofern sie betroffen sind.",
        "Änderungen sind mit Jira-Issue-Key in Commit oder Pull Request referenziert.",
        "Relevante QA- oder Xray-Testfälle sind verknüpft oder aktualisiert.",
      ],
    },
  ])
}

function testDescription(test) {
  return doc([
    {
      title: "Vorbedingung",
      text: [test.precondition],
    },
    {
      title: "Testschritte und erwartete Ergebnisse",
      items: test.steps.map(
        ([action, expected], index) =>
          `Schritt ${index + 1}: ${action} Erwartetes Ergebnis: ${expected}`
      ),
    },
    {
      title: "Abnahmeregel",
      text: [
        "Der Test gilt nur als bestanden, wenn alle erwarteten Ergebnisse ohne manuelle Datenkorrektur erreicht werden und keine unberechtigten Daten sichtbar sind.",
      ],
    },
  ])
}

async function ensureIssue({
  uid,
  summary,
  issueType,
  description,
  labels,
  componentId,
  versionId,
  parentKey,
  desiredStatus,
  epicNameFieldId,
  epicLinkFieldId,
  parentSupported,
}) {
  const existing = await searchByUniqueLabel(uid)
  const fields = {
    project: { key: projectKey },
    issuetype: { id: issueType.id },
    summary,
    description,
    labels: [...new Set([syncLabel, uid, ...labels])],
  }

  if (componentId) fields.components = [{ id: componentId }]
  if (versionId) fields.fixVersions = [{ id: versionId }]
  if (epicNameFieldId) fields[epicNameFieldId] = summary.slice(0, 255)
  if (parentKey && parentSupported) fields.parent = { key: parentKey }
  if (parentKey && !parentSupported && epicLinkFieldId) fields[epicLinkFieldId] = parentKey

  async function writeIssue(writeFields) {
    if (existing) {
      await jira(`/rest/api/3/issue/${existing.key}`, { method: "PUT", body: { fields: writeFields } })
      return jira(`/rest/api/3/issue/${existing.key}?fields=status,summary,attachment`)
    }
    const created = await jira("/rest/api/3/issue", { method: "POST", body: { fields: writeFields } })
    return jira(`/rest/api/3/issue/${created.key}?fields=status,summary,attachment`)
  }

  let issue
  try {
    issue = await writeIssue(fields)
  } catch (error) {
    const parentError =
      parentKey &&
      (String(error.message).includes("parent") ||
        String(error.message).includes("hierarchy") ||
        String(error.message).includes("Epic Link"))
    if (!parentError) throw error

    const fallbackFields = { ...fields }
    delete fallbackFields.parent
    if (epicLinkFieldId) fallbackFields[epicLinkFieldId] = parentKey
    else delete fallbackFields[epicLinkFieldId]
    issue = await writeIssue(fallbackFields)
  }

  if (desiredStatus) await transitionIssue(issue.key, desiredStatus)
  await jira(`/rest/api/3/issue/${issue.key}/properties/cati-sync`, {
    method: "PUT",
    body: {
      uid,
      syncedAt: new Date().toISOString(),
      source: "scripts/jira-xray-sync.mjs",
    },
  })
  return issue
}

function statusMatches(issue, desiredStatus) {
  const status = issue.fields?.status
  const category = status?.statusCategory?.key
  const name = status?.name?.toLowerCase() ?? ""
  if (desiredStatus === "done") {
    return category === "done" || /done|fertig|erledigt|geschlossen|abgeschlossen/.test(name)
  }
  if (desiredStatus === "in-progress") {
    return category === "indeterminate" || /progress|arbeit|bearbeitung|review|prüfung/.test(name)
  }
  if (desiredStatus === "todo") {
    return category === "new" || /to do|offen|todo|neu/.test(name)
  }
  return false
}

async function transitionIssue(issueKey, desiredStatus) {
  const issue = await jira(`/rest/api/3/issue/${issueKey}?fields=status`)
  if (statusMatches(issue, desiredStatus)) return false

  const transitions = await jira(`/rest/api/3/issue/${issueKey}/transitions`)
  const candidates = transitions.transitions ?? []
  let transition = null

  if (desiredStatus === "done") {
    transition =
      candidates.find((item) => item.to?.statusCategory?.key === "done") ??
      candidates.find((item) => /done|fertig|erledigt|geschlossen|abgeschlossen/i.test(item.name))
  } else if (desiredStatus === "in-progress") {
    transition =
      candidates.find((item) => item.to?.statusCategory?.key === "indeterminate") ??
      candidates.find((item) => /progress|arbeit|bearbeitung|start|review|prüfung/i.test(item.name))
  } else if (desiredStatus === "todo") {
    transition =
      candidates.find((item) => item.to?.statusCategory?.key === "new") ??
      candidates.find((item) => /to do|offen|todo|neu/i.test(item.name))
  }

  if (!transition) return false
  await jira(`/rest/api/3/issue/${issueKey}/transitions`, {
    method: "POST",
    body: { transition: { id: transition.id } },
  })
  await jira(`/rest/api/3/issue/${issueKey}/comment`, {
    method: "POST",
    body: {
      body: doc([
        {
          text: [
            `Status wurde durch den Cati-Sync auf ${desiredStatus} gesetzt. Zeitpunkt: ${new Date().toISOString()}.`,
          ],
        },
      ]),
    },
  })
  return true
}

async function attachDocuments(issueKey) {
  const docs = [
    "docs/requirements/option-3-ai-site-crm/BRD.docx",
    "docs/requirements/option-3-ai-site-crm/PRD.docx",
    "docs/requirements/option-3-ai-site-crm/TRD.docx",
    "docs/requirements/option-3-ai-site-crm/Market-Research-Annex.docx",
    "docs/requirements/option-3-ai-site-crm/AI-Site-CRM-Requirements-Package.docx",
    "docs/ways-of-work/plan/option-3-ai-site-crm/implementation-plan.md",
    "quality/results/phase-04-critical-qa-notes.md",
  ]
  const issue = await jira(`/rest/api/3/issue/${issueKey}?fields=attachment`)
  const existingNames = new Set((issue.fields?.attachment ?? []).map((attachment) => attachment.filename))
  const uploaded = []

  for (const relativePath of docs) {
    const absolutePath = path.join(rootDir, relativePath)
    const fileName = path.basename(relativePath)
    try {
      await fs.access(absolutePath)
    } catch {
      continue
    }
    if (existingNames.has(fileName)) continue
    const form = new FormData()
    const buffer = await fs.readFile(absolutePath)
    form.append("file", new Blob([buffer]), fileName)
    const response = await fetch(`${jiraBaseUrl}/rest/api/3/issue/${issueKey}/attachments`, {
      method: "POST",
      headers: {
        Authorization: jiraAuth,
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      body: form,
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Attachment upload failed for ${fileName}: ${response.status} ${text}`)
    }
    uploaded.push(fileName)
  }
  return uploaded
}

async function xrayAuthenticate() {
  if (!env.XRAY_BASE_URL || !env.XRAY_CLIENT_ID || !env.XRAY_CLIENT_SECRET) return null
  const response = await fetch(`${env.XRAY_BASE_URL.replace(/\/$/, "")}/api/v2/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.XRAY_CLIENT_ID,
      client_secret: env.XRAY_CLIENT_SECRET,
    }),
  })
  if (!response.ok) return null
  return (await response.text()).replace(/^"|"$/g, "")
}

async function xrayGraphql(token, query, variables) {
  if (!token || !env.XRAY_BASE_URL) return null
  const response = await fetch(`${env.XRAY_BASE_URL.replace(/\/$/, "")}/api/v2/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.errors) return null
  return payload.data
}

async function addXrayManualSteps(token, testIssueId, test) {
  const results = []
  const mutation = `
    mutation AddStep($issueId: String!, $step: CreateStepInput!) {
      addTestStep(issueId: $issueId, step: $step) {
        id
      }
    }
  `
  for (const [action, expected] of test.steps) {
    const result = await xrayGraphql(token, mutation, {
      issueId: testIssueId,
      step: { action, data: "", result: expected },
    })
    results.push(Boolean(result))
  }
  return results.filter(Boolean).length
}

async function addTestsToXrayTestSet(token, testSetIssueId, testIssueIds) {
  const mutation = `
    mutation AddTestsToTestSet($issueId: String!, $testIssueIds: [String]!) {
      addTestsToTestSet(issueId: $issueId, testIssueIds: $testIssueIds) {
        addedTests
        warning
      }
    }
  `
  return xrayGraphql(token, mutation, { issueId: testSetIssueId, testIssueIds })
}

async function createIssueLink(outwardIssueKey, inwardIssueKey) {
  try {
    await jira("/rest/api/3/issueLink", {
      method: "POST",
      body: {
        type: { name: "Relates" },
        outwardIssue: { key: outwardIssueKey },
        inwardIssue: { key: inwardIssueKey },
      },
    })
    return true
  } catch {
    return false
  }
}

async function main() {
  const user = await getCurrentUser()
  const { project, created: projectCreated } = await ensureProject(user)
  const componentMap = new Map()
  const versionMap = new Map()

  for (const component of components) componentMap.set(component, await ensureComponent(component))
  for (const version of versions) versionMap.set(version, await ensureVersion(version))

  const issueTypes = await getProjectIssueTypes(project.id)
  const epicType = pickIssueType(issueTypes, ["Epic", "Epos"])
  const storyType = pickIssueType(issueTypes, ["Story", "User Story", "Aufgabe", "Task"])
  const taskType = pickIssueType(issueTypes, ["Task", "Aufgabe", "Story"])
  const testType = pickIssueType(issueTypes, ["Test"])
  const testSetType = pickIssueType(issueTypes, ["Test Set", "Testset", "Test Plan"])

  if (!storyType || !taskType) {
    throw new Error(`Required issue types missing. Available types: ${issueTypes.map((item) => item.name).join(", ")}`)
  }

  const epicFields = epicType ? await getCreateFields(epicType.id) : {}
  const storyFields = await getCreateFields(storyType.id)
  const testFields = testType ? await getCreateFields(testType.id) : {}
  const epicNameFieldId = epicType ? findFieldByName(epicFields, ["Epic Name", "Epic-Name", "Epic Name"]) : null
  const epicLinkFieldId = findFieldByName(storyFields, ["Epic Link", "Epic-Verknüpfung"])
  const parentSupported = Boolean(storyFields.parent)
  const testSetParentSupported = Boolean(testFields.parent)

  const createdIssues = []
  const phaseIssueByPhase = new Map()

  for (const phase of phases) {
    console.log(`Syncing phase ${phase.phase}: ${phase.title}`)
    const component = componentMap.get(phase.component)
    const version = versionMap.get(phase.version)
    const phaseIssue = await ensureIssue({
      uid: `${labelPrefix}-${phaseLabel(phase.phase)}-epic`,
      summary: `Phase ${String(phase.phase).padStart(2, "0")}: ${phase.title}`,
      issueType: epicType ?? taskType,
      description: phaseDescription(phase),
      labels: [phaseLabel(phase.phase), "phase", "option3"],
      componentId: component?.id,
      versionId: version?.id,
      desiredStatus: phase.status,
      epicNameFieldId: epicType ? epicNameFieldId : null,
    })
    createdIssues.push(phaseIssue.key)
    phaseIssueByPhase.set(phase.phase, phaseIssue)

    for (let index = 0; index < phase.stories.length; index++) {
      const story = phase.stories[index]
      const storyStatus =
        phase.status === "done"
          ? "done"
          : phase.status === "in-progress" && index === 0
            ? "in-progress"
            : "todo"
      console.log(`  Syncing story ${index + 1}: ${story}`)
      const storyIssue = await ensureIssue({
        uid: `${labelPrefix}-${phaseLabel(phase.phase)}-story-${String(index + 1).padStart(2, "0")}`,
        summary: story,
        issueType: storyType,
        description: storyDescription(phase, story),
        labels: [phaseLabel(phase.phase), "story", "option3"],
        componentId: component?.id,
        versionId: version?.id,
        parentKey: phaseIssue.key,
        desiredStatus: storyStatus,
        epicLinkFieldId,
        parentSupported,
      })
      createdIssues.push(storyIssue.key)
    }
  }

  const docsIssue = await ensureIssue({
    uid: `${labelPrefix}-documentation-package`,
    summary: "Dokumentationspaket, BRD, PRD, TRD, Marktanalyse und QA-Nachweise hochladen",
    issueType: taskType,
    description: doc([
      {
        title: "Ziel",
        text: [
          "Alle relevanten Produkt-, Technik-, Markt- und QA-Dokumente liegen im Jira-Projekt zentral am Projektstart vor.",
        ],
      },
      {
        title: "Enthaltene Dokumente",
        items: [
          "Business Requirement Document",
          "Product Requirement Document",
          "Technical Requirement Document",
          "Market Research Annex",
          "AI Site CRM Requirements Package",
          "15-Phasen-Implementierungsplan",
          "Aktuelle QA-Notizen und Browser-Audit-Verweise",
        ],
      },
    ]),
    labels: ["documentation", "phase-01", "option3"],
    componentId: componentMap.get("Produkt und Planung")?.id,
    versionId: versionMap.get("MVP")?.id,
    parentKey: phaseIssueByPhase.get(1)?.key,
    desiredStatus: "done",
    epicLinkFieldId,
    parentSupported,
  })
  const uploadedAttachments = await attachDocuments(docsIssue.key)
  console.log(`Documentation issue synced: ${docsIssue.key}`)

  const token = await xrayAuthenticate()
  const testIssues = []
  let testSetIssue = null

  if (testSetType) {
    console.log("Syncing Xray/Jira test set")
    testSetIssue = await ensureIssue({
      uid: `${labelPrefix}-xray-testset-e2e-uat`,
      summary: "Test Set - Kritische End-to-End- und UAT-Szenarien",
      issueType: testSetType,
      description: doc([
        {
          title: "Zweck",
          text: [
            "Dieses Test Set bündelt die wichtigsten Ende-zu-Ende- und UAT-Szenarien für die erste professionelle Projektsteuerung.",
          ],
        },
      ]),
      labels: ["xray", "test-set", "uat", "option3"],
      componentId: componentMap.get("QA und Launch")?.id,
      versionId: versionMap.get("MVP")?.id,
      desiredStatus: "todo",
    })
    createdIssues.push(testSetIssue.key)
  }

  const testIssueType = testType ?? taskType
  for (const test of tests) {
    console.log(`Syncing test case: ${test.summary}`)
    const issue = await ensureIssue({
      uid: `${labelPrefix}-${test.uid}`,
      summary: `Testfall: ${test.summary}`,
      issueType: testIssueType,
      description: testDescription(test),
      labels: ["xray", "testcase", "uat", "option3"],
      componentId: componentMap.get(test.component)?.id ?? componentMap.get("QA und Launch")?.id,
      versionId: versionMap.get("MVP")?.id,
      parentKey: testSetIssue?.key,
      parentSupported: testSetParentSupported,
      desiredStatus: "todo",
    })
    testIssues.push(issue)
    createdIssues.push(issue.key)
    if (testSetIssue) await createIssueLink(testSetIssue.key, issue.key)
    if (token && testType) await addXrayManualSteps(token, issue.id, test)
  }

  if (token && testSetIssue && testIssues.length > 0) {
    await addTestsToXrayTestSet(
      token,
      testSetIssue.id,
      testIssues.map((issue) => issue.id)
    )
  }

  const verification = await jira("/rest/api/3/search/jql", {
    method: "POST",
    body: {
      jql: `project = ${projectKey} AND labels = "${syncLabel}" ORDER BY created ASC`,
      fields: ["summary", "issuetype", "status"],
      maxResults: 200,
    },
  })

  const report = {
    syncedAt: new Date().toISOString(),
    projectKey,
    projectCreated,
    projectUrl: `${jiraBaseUrl}/jira/software/projects/${projectKey}/boards`,
    issueCount: verification.total ?? verification.issues?.length ?? 0,
    phaseCount: phases.length,
    testCount: testIssues.length,
    xrayAuthenticated: Boolean(token),
    xrayTestIssueTypeAvailable: Boolean(testType),
    testSetIssue: testSetIssue?.key ?? null,
    docsIssue: docsIssue.key,
    uploadedAttachments,
    issueTypeNames: issueTypes.map((item) => item.name),
  }

  const reportDir = path.join(rootDir, "quality", "results")
  await fs.mkdir(reportDir, { recursive: true })
  await fs.writeFile(
    path.join(reportDir, "jira-xray-sync-report.json"),
    JSON.stringify(report, null, 2)
  )

  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
