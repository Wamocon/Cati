import {
  FileText,
  Home,
  Languages,
  MapPinned,
  MessageCircle,
  PackageCheck,
  Presentation,
  ShieldCheck,
  Sofa,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

export interface ClientKpi {
  label: string
  value: string
  note: string
}

export interface ClientWorkflowStep {
  label: string
  title: string
  detail: string
  icon: LucideIcon
}

export interface ClientServicePillar {
  title: string
  detail: string
  icon: LucideIcon
}

export const clientProfile = {
  clientName: "Ataberk Estate",
  productName: "1Çatı CRM",
  pilotProject: "New Level Premium",
  pilotLocation: "Avsallar, Alanya",
  pilotOffer: "5-Sterne-Projekt mit Wohnungen zum Verkauf",
  publicWebsite: "https://www.ataberkestate.com/",
  projectArticle:
    "https://www.ataberkestate.com/articles/proekt-new-level-premium-investiruy-zarabatyvay-i-otdykhay",
  avsallarComplex: "https://www.ataberkestate.com/turkey/complex-in-avsallar",
  sourceNote:
    "Die erste Version wird bewusst auf Ataberk Estate und das Projekt New Level Premium in Avsallar ausgerichtet. Danach kann dieselbe Plattform als allgemeines CRM für weitere Projekte, Standorte und Kundensegmente erweitert werden.",
}

export const clientKpis: ClientKpi[] = [
  {
    label: "Projektfläche",
    value: "52k m²",
    note: "New Level Premium wird in den Listing-Quellen als großflächiges Premium-Projekt mit Hotel- und Freizeitlogik beschrieben.",
  },
  {
    label: "Strandnähe",
    value: "900 m",
    note: "Incekum Beach, Privatstrand, Beachclub, Shuttle und Strandservice müssen als Verkaufs- und Serviceargumente sichtbar sein.",
  },
  {
    label: "Projektstruktur",
    value: "7+Hotel",
    note: "Die Quellen nennen Wohnblöcke plus 5-Sterne-Hotel. Das CRM braucht daher neben Verkauf auch Eigentümer- und Hotelservice.",
  },
  {
    label: "Käuferlogik",
    value: "0%",
    note: "Ratenzahlung, Mietpotenzial, Renditeargumente und Kapitalwert müssen pro Einheit und Lead nachvollziehbar bleiben.",
  },
]

export const clientWorkflow: ClientWorkflowStep[] = [
  {
    label: "01",
    title: "Lead aus Website, WhatsApp oder Telegram",
    detail: "Anfrage, Sprache, Budget, Interesse und bevorzugter Kanal werden sofort in einem Lead-Profil zusammengeführt.",
    icon: MessageCircle,
  },
  {
    label: "02",
    title: "Projekt- und Wohnungsauswahl",
    detail:
      "Einheitentyp, Fläche, Etage, Preis, Verfügbarkeit, 0%-Ratenplan, Incekum-Lage, Hotelinfrastruktur und Investmentargumente werden vergleichbar.",
    icon: Home,
  },
  {
    label: "03",
    title: "Online-Tour und Beratung",
    detail: "Berater planen virtuelle Besichtigung, Rückruf, Präsentation, Follow-up und Aufgaben ohne Medienbruch.",
    icon: Presentation,
  },
  {
    label: "04",
    title: "TAPU, Zahlung, Eigentümer- und Hotelservice",
    detail:
      "Dokumente, Zahlungsstatus, Möbelservice, Vermietung, Rezeption, Privatstrand, Shuttle und technische Eigentümeranfragen bleiben in einem Kundenverlauf.",
    icon: FileText,
  },
]

export const clientServicePillars: ClientServicePillar[] = [
  {
    title: "Mehrsprachiger Verkauf",
    detail:
      "Russisch, Deutsch, Türkisch und Englisch müssen in Lead-Kommunikation, Exposé, Dokumenten und Management-Ansichten sauber funktionieren.",
    icon: Languages,
  },
  {
    title: "Investment- und Mietargumente",
    detail:
      "Käufer erwarten Ratenzahlung, Vermietbarkeit, Mietverwaltung, Renditepotenzial und Wiederverkaufsargumente. Das CRM soll diese Punkte pro Einheit sichtbar machen.",
    icon: WalletCards,
  },
  {
    title: "Projekt- und Standortwissen",
    detail:
      "Avsallar, Alanya, Incekum, Strandnähe, Hotelinfrastruktur, Projektstatus und verfügbare Einheitentypen müssen schnell erklärt werden können.",
    icon: MapPinned,
  },
  {
    title: "Eigentümer- und Hotelservice",
    detail:
      "Rezeption, technische Anliegen, Spa/Fitness-Nutzung, Restaurantvorteile, Privatstrand, Shuttle, Möbel, Vermietung und Wartung gehören nach dem Verkauf in denselben Kundenverlauf.",
    icon: Sofa,
  },
  {
    title: "Vertrauen und Compliance",
    detail:
      "TAPU, Vertrag, Identität, Zahlungsfreigaben, Staatsbürgerschafts-/Aufenthaltsprüfung und Audit-Spuren stärken Vertrauen bei ausländischen Käufern.",
    icon: ShieldCheck,
  },
  {
    title: "Skalierbare Generalisierung",
    detail:
      "Die Pilotlogik wird so gebaut, dass später weitere Projekte, Standorte und Unternehmen ohne Neuentwicklung ergänzt werden können.",
    icon: PackageCheck,
  },
]

export const clientSourceFacts = [
  "Ataberk Estate betreibt eine öffentliche Immobilienseite für Kauf, Miete, Neubau-/Bauträgerangebote und Services rund um Immobilien in der Türkei.",
  "Die öffentliche Ataberk-Seite zeigt Alanya und Avsallar als relevante Such- und Projektkontexte.",
  "Das Projekt New Level Premium wird auf der Ataberk-Seite als Investment-, Ertrags- und Erholungsangebot positioniert.",
  "Weitere öffentliche Listing-Seiten beschreiben New Level Premium mit 52.000 m² Projektfläche, Incekum-Nähe, Privatstrand, 5-Sterne-Hotel, Eigentümer-Rezeption, Freizeit- und Sportangeboten sowie Mietpotenzial.",
  "Die Website nutzt WhatsApp, Telegram, Rückruf und Anfrageformulare als starke Conversion-Kanäle.",
  "Die Services umfassen unter anderem Online-Besichtigung, Möbelkauf, Verkaufshilfe, Mietthemen, TAPU-/Kaufprozessinformationen und Finanzierungs-/Ratenzahlungsinhalte.",
]

export const clientVisualAnchors = [
  { label: "Premium", value: "5-Sterne-Projekt" },
  { label: "Standort", value: "Avsallar / Alanya" },
  { label: "Erste Phase", value: "Ataberk-spezifisch" },
  { label: "Später", value: "generalisierbare CRM-Plattform" },
]
