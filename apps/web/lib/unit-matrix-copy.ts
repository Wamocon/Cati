import {
  Languages,
  MapPinned,
  Sofa,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

import type {
  AccessStatus,
  FlatStatus,
  PaymentStatus,
} from "@/lib/site-management-data"
import type { NewLevelPremiumSaleStatus } from "@/lib/new-level-premium-data"

export type DashboardLocale = "tr" | "en" | "de" | "ru"

export function resolveDashboardLocale(locale: string): DashboardLocale {
  return locale === "tr" || locale === "de" || locale === "ru" ? locale : "en"
}

type PillarCopy = {
  detail: string
  icon: LucideIcon
  title: string
}

export type UnitMatrixCopy = {
  actions: {
    actionColumn: string
    auditDescription: string
    currentContext: string
    debtHint: string
    debtOpen: string
    detailHint: string
    detailOpen: string
    menu: string
    menuHint: string
    open: string
    service: string
    serviceHint: string
    serviceHistory: string
    title: string
  }
  common: {
    allBlocks: string
    allStatuses: string
    block: string
    closed: string
    notFound: string
    records: string
    rows: string
    sourceMissing: string
    sourcePending: string
    unknown: string
  }
  filters: {
    debtOnly: string
    reset: string
    search: string
  }
  import: {
    batchOpened: string
    batchTitle: string
    centerTitle: string
    centerDescription: string
    findingOpened: string
    findingSummary: string
    modelDescription: string
    modelTitle: string
    qualityDescription: string
    qualityGate: string
    ready: string
    rowsSummary: string
    summaryOpened: string
    totalRows: string
    valid: string
    warning: string
    rejected: string
  }
  labels: {
    access: Record<AccessStatus, string>
    finding: Record<"error" | "info" | "warning", string>
    flat: Record<FlatStatus, string>
    importStatus: Record<"ready_to_apply" | "review_required" | "validated", string>
    payment: Record<PaymentStatus, string>
    sale: Record<NewLevelPremiumSaleStatus, string>
  }
  live: {
    auditEmpty: string
    auditFallback: string
    auditTitle: string
    commit: string
    debtOnly: string
    description: string
    filterMatched: string
    filterMatchedSuffix: string
    filterMatchedTail: string
    findingsTitle: string
    preview: string
    refresh: string
    requestError: string
    requestSaved: string
    search: string
    title: string
    tableHeaders: string[]
  }
  matrix: {
    description: string
    empty: string
    selected: string
    title: string
  }
  metrics: {
    debtHelper: string
    debtLabel: string
    occupancyHelper: string
    occupancyLabel: string
    restrictedHelper: string
    restrictedLabel: string
    totalHelper: string
    totalLabel: string
  }
  page: {
    projectBody: string
    projectScope: string
    subtitle: string
    title: string
  }
  pillars: PillarCopy[]
  selectedUnit: {
    accessOpen: string
    blockSummary: string
    currentDebt: string
    listPrice: string
    openService: string
    priceSource: string
    priceSourceConnected: string
    sourcePending: string
  }
  summary: {
    availableForSale: string
    blockSummaryDescription: string
    blockSummaryTitle: string
    blocks: string
    missing: string
    priceConnected: string
    priceMissing: string
    sold: string
    units: string
  }
  table: {
    access: string
    blockFloor: string
    debt: string
    open: string
    owner: string
    price: string
    resident: string
    sale: string
    service: string
    status: string
    typeArea: string
    unit: string
  }
}

export const unitMatrixCopy: Record<DashboardLocale, UnitMatrixCopy> = {
  en: {
    actions: {
      actionColumn: "Actions",
      auditDescription: "Actions update the selected unit context and create an audit event for the live operation stream.",
      currentContext: "Current target",
      debtHint: "Balance and payment follow-up for this unit.",
      debtOpen: "View debt status",
      detailHint: "Sale, source, resident and access data in one unit record.",
      detailOpen: "View unit detail",
      menu: "Actions",
      menuHint: "Sale, finance and service follow-up share the same unit record.",
      open: "Open",
      service: "Service",
      serviceHint: "Open technical requests and service history for this unit.",
      serviceHistory: "View service history",
      title: "Unit actions",
    },
    common: {
      allBlocks: "All blocks",
      allStatuses: "All statuses",
      block: "Block",
      closed: "closed",
      notFound: "No unit found for this filter.",
      records: "records",
      rows: "rows",
      sourceMissing: "Source missing",
      sourcePending: "Source pending",
      unknown: "Unknown",
    },
    filters: {
      debtOnly: "With debt",
      reset: "Reset filters",
      search: "Search unit, owner, resident or block",
    },
    import: {
      batchOpened: "Batch opened",
      batchTitle: "data batch",
      centerDescription: "Rows, warnings and errors are checked before client Excel and source lists are applied.",
      centerTitle: "Data validation center",
      findingOpened: "Finding opened",
      findingSummary: "Finding summary",
      modelDescription: "Each record links block, floor, unit, owner, resident, debt, deposit, access and service status.",
      modelTitle: "Unit data model",
      qualityDescription: "If there are no rejected rows the import can be applied; warnings close with manager approval.",
      qualityGate: "Quality gate",
      ready: "ready",
      rejected: "Rejected",
      rowsSummary: "{valid}/{total} valid, {warning} warning, {rejected} rejected.",
      summaryOpened: "Summary opened",
      totalRows: "Total rows",
      valid: "Valid",
      warning: "Warning",
    },
    labels: {
      access: { active: "Active", disabled: "Disabled", pending: "Pending", restricted: "Restricted" },
      finding: { error: "Error", info: "Info", warning: "Warning" },
      flat: { blocked: "Blocked", maintenance: "Maintenance", occupied: "Occupied", reserved: "Reserved", vacant: "Vacant" },
      importStatus: { ready_to_apply: "Ready to apply", review_required: "Review needed", validated: "Validated" },
      payment: { clear: "Clear", legal: "Legal follow-up", minor_debt: "Minor debt", overdue: "Overdue" },
      sale: { available: "For sale", sold: "Sold", source_missing: "Source missing", unknown: "Review" },
    },
    live: {
      auditEmpty: "No unit audit record yet.",
      auditFallback: "Audit record",
      auditTitle: "Recent audit records",
      commit: "Request change",
      debtOnly: "With debt",
      description: "Block, floor, unit, owner, resident, debt, service and import records are managed in one operational view. Every action is tracked with permission and audit context.",
      filterMatched: "{count} records matched.",
      filterMatchedSuffix: "For speed, the table shows the first 80 rows; all records remain covered by search and filters.",
      filterMatchedTail: "records matched",
      findingsTitle: "Data quality findings",
      preview: "Validate data",
      refresh: "Refresh data",
      requestError: "Action could not be saved. Check permission or connection.",
      requestSaved: "Action saved.",
      search: "Search unit, owner, resident or block",
      tableHeaders: ["Unit", "Block/Floor", "Sale", "List", "Owner", "Resident", "Status", "Debt", "Service"],
      title: "Unit matrix records",
    },
    matrix: {
      description: "{count} records in filter. Showing the first {preview} units; each square opens detail and action context.",
      empty: "No unit found for this filter.",
      selected: "Selected unit",
      title: "Visual unit matrix",
    },
    metrics: {
      debtHelper: "Accounts with debt",
      debtLabel: "Total debt",
      occupancyHelper: "Occupied + reserved",
      occupancyLabel: "Occupancy",
      restrictedHelper: "Blocked gate access",
      restrictedLabel: "Access restricted",
      totalHelper: "All records",
      totalLabel: "Total units",
    },
    page: {
      projectBody: "This screen helps the Ataberk Estate team answer buyer questions quickly, filter suitable units, and manage tour, payment, document, service and access work from one operating record.",
      projectScope: "Project scope",
      subtitle: "{portfolio} / {location} units, owners, customers, payments, documents, service and access status are managed in the same workspace. The matrix is prepared for filtering, follow-up and control at 769-unit operating scale.",
      title: "Project & Unit Matrix",
    },
    pillars: [
      { icon: Languages, title: "Multilingual sales", detail: "Russian, German, Turkish and English stay clean in lead communication, brochures, documents and management views." },
      { icon: WalletCards, title: "Investment and rental arguments", detail: "Installment plan, rental potential, rent management and resale arguments stay visible per unit." },
      { icon: MapPinned, title: "Project and location knowledge", detail: "Avsallar, Incekum, beach distance, hotel infrastructure, project status and available unit types are explained fast." },
      { icon: Sofa, title: "Owner and hotel service", detail: "Reception, technical requests, spa/fitness use, restaurant benefits, private beach, shuttle, furnishing, rental and maintenance stay in the same customer journey." },
    ],
    selectedUnit: {
      accessOpen: "Open access status",
      blockSummary: "Block {block}, floor {floor} · {type}",
      currentDebt: "Debt",
      listPrice: "List price",
      openService: "Open service",
      priceSource: "Source",
      priceSourceConnected: "PDF connected",
      sourcePending: "Source pending",
    },
    summary: {
      availableForSale: "For sale",
      blockSummaryDescription: "Real price-list status, sale, occupancy and debt load for each block.",
      blockSummaryTitle: "Block summary",
      blocks: "blocks",
      missing: "Missing",
      priceConnected: "Price list connected",
      priceMissing: "Price source missing",
      sold: "Sold",
      units: "units",
    },
    table: {
      access: "Access",
      blockFloor: "Block/Floor",
      debt: "Debt",
      open: "open",
      owner: "Owner",
      price: "List price",
      resident: "Resident",
      sale: "Sale",
      service: "Service",
      status: "Status",
      typeArea: "Type / m²",
      unit: "Unit",
    },
  },
  tr: {
    actions: {
      actionColumn: "Aksiyonlar",
      auditDescription: "Aksiyonlar seçili daire bağlamını günceller ve canlı operasyon akışı için audit kaydı oluşturur.",
      currentContext: "Geçerli hedef",
      debtHint: "Bu daire için bakiye ve ödeme takip durumu.",
      debtOpen: "Borç durumunu görüntüle",
      detailHint: "Satış, kaynak, sakin ve erişim verisi tek daire kaydında.",
      detailOpen: "Daire detayını görüntüle",
      menu: "Aksiyonlar",
      menuHint: "Satış, finans ve servis takibi aynı daire kaydında birleşir.",
      open: "Aç",
      service: "Servis",
      serviceHint: "Bu daire için açık teknik talepler ve servis geçmişi.",
      serviceHistory: "Servis geçmişini görüntüle",
      title: "Daire aksiyonları",
    },
    common: {
      allBlocks: "Tüm bloklar",
      allStatuses: "Tüm durumlar",
      block: "Blok",
      closed: "kapandı",
      notFound: "Bu filtre için daire bulunamadı.",
      records: "kayıt",
      rows: "satır",
      sourceMissing: "Kaynak eksik",
      sourcePending: "Kaynak bekliyor",
      unknown: "Belirsiz",
    },
    filters: { debtOnly: "Borçlu", reset: "Filtreyi sıfırla", search: "Daire, malik, sakin veya blok ara" },
    import: {
      batchOpened: "Paket açıldı",
      batchTitle: "veri paketi",
      centerDescription: "Müşteri Excel/listeleri sisteme alınmadan önce satır, uyarı ve hata kontrolü yapılır.",
      centerTitle: "Veri doğrulama merkezi",
      findingOpened: "Bulgu açıldı",
      findingSummary: "Bulgu özeti",
      modelDescription: "Her kayıt blok, kat, daire, malik, sakin, borç, depozito, erişim ve servis durumuyla bağlıdır.",
      modelTitle: "Daire veri modeli",
      qualityDescription: "Red satırı yoksa veri aktarımı uygulanabilir; uyarılar yönetici onayıyla kapatılır.",
      qualityGate: "Kalite kapısı",
      ready: "hazır",
      rejected: "Red",
      rowsSummary: "{valid}/{total} geçerli, {warning} uyarı, {rejected} red.",
      summaryOpened: "Özet açıldı",
      totalRows: "Toplam satır",
      valid: "Geçerli",
      warning: "Uyarı",
    },
    labels: {
      access: { active: "Aktif", disabled: "Kapalı", pending: "Bekliyor", restricted: "Kısıtlı" },
      finding: { error: "Hata", info: "Bilgi", warning: "Uyarı" },
      flat: { blocked: "Blokeli", maintenance: "Bakımda", occupied: "Dolu", reserved: "Rezerve", vacant: "Boş" },
      importStatus: { ready_to_apply: "Uygulamaya hazır", review_required: "İnceleme gerekli", validated: "Doğrulandı" },
      payment: { clear: "Temiz", legal: "Yasal takip", minor_debt: "Küçük borç", overdue: "Gecikmiş" },
      sale: { available: "Satışta", sold: "Satıldı", source_missing: "Kaynak eksik", unknown: "Kontrol" },
    },
    live: {
      auditEmpty: "Henüz veri veya daire denetim kaydı yok.",
      auditFallback: "Audit kaydı",
      auditTitle: "Son denetim kayıtları",
      commit: "Değişiklik iste",
      debtOnly: "Borçlu",
      description: "Blok, kat, daire, malik, sakin, borç, servis ve veri aktarım kayıtları tek operasyon görünümünde yönetilir. Yapılan işlemler yetki ve denetim kaydıyla takip edilir.",
      filterMatched: "{count} kayıt eşleşti.",
      filterMatchedSuffix: "Hızlı kullanım için tabloda ilk 80 kayıt gösterilir; tüm kayıtlar filtre ve arama kapsamındadır.",
      filterMatchedTail: "kayıt eşleşti",
      findingsTitle: "Veri kalite bulguları",
      preview: "Veri kontrolü",
      refresh: "Veriyi yenile",
      requestError: "İşlem kaydedilemedi. Yetki veya bağlantı kontrol edilmeli.",
      requestSaved: "İşlem kaydedildi.",
      search: "Daire, malik, sakin veya blok ara",
      tableHeaders: ["Daire", "Blok/Kat", "Satış", "Liste", "Malik", "Sakin", "Durum", "Borç", "Servis"],
      title: "Daire matrisi kayıtları",
    },
    matrix: {
      description: "{count} kayıt filtrede. İlk {preview} daire gösteriliyor; her kutu detay ve aksiyon paneli açar.",
      empty: "Bu filtre için daire bulunamadı.",
      selected: "Seçili daire",
      title: "Görsel daire matrisi",
    },
    metrics: {
      debtHelper: "Borçlu hesaplar",
      debtLabel: "Toplam borç",
      occupancyHelper: "Dolu + rezerve",
      occupancyLabel: "Doluluk",
      restrictedHelper: "Blokeli kapı erişimi",
      restrictedLabel: "Erişim kısıtı",
      totalHelper: "Tüm kayıtlar",
      totalLabel: "Toplam daire",
    },
    page: {
      projectBody: "Bu ekran Ataberk Estate ekibinin müşteri sorularını hızlı yanıtlaması, uygun daireleri filtrelemesi, online tur, ödeme, evrak, servis ve erişim akışını tek operasyon kaydında yönetmesi için kullanılır.",
      projectScope: "Proje kapsamı",
      subtitle: "{portfolio} / {location} için satışa uygun birim, malik, müşteri, ödeme, evrak, servis ve erişim durumunu aynı çalışma alanında yönetin. Matris 769 birimlik operasyon ölçeğinde filtreleme, takip ve kontrol için hazırlanır.",
      title: "Proje & Daire Matrisi",
    },
    pillars: [
      { icon: Languages, title: "Çok dilli satış", detail: "Rusça, Almanca, Türkçe ve İngilizce lead iletişimi, broşür, belge ve yönetim ekranlarında temiz çalışır." },
      { icon: WalletCards, title: "Yatırım ve kira argümanı", detail: "Taksit planı, kira potansiyeli, kira yönetimi ve yeniden satış argümanları daire bazında görünür." },
      { icon: MapPinned, title: "Proje ve konum bilgisi", detail: "Avsallar, Incekum, sahil mesafesi, otel altyapısı, proje durumu ve uygun daire tipleri hızlı açıklanır." },
      { icon: Sofa, title: "Malik ve otel servisi", detail: "Resepsiyon, teknik talep, spa/fitness, restoran avantajı, özel plaj, shuttle, mobilya, kiralama ve bakım aynı müşteri yolculuğunda kalır." },
    ],
    selectedUnit: {
      accessOpen: "Erişim durumunu aç",
      blockSummary: "Blok {block}, {floor}. kat · {type}",
      currentDebt: "Borç",
      listPrice: "Liste fiyatı",
      openService: "Açık servis",
      priceSource: "Kaynak",
      priceSourceConnected: "PDF bağlı",
      sourcePending: "Kaynak bekliyor",
    },
    summary: {
      availableForSale: "Satışta",
      blockSummaryDescription: "Her blok için gerçek fiyat-listesi durumu, satış, doluluk ve borç yükü.",
      blockSummaryTitle: "Blok özeti",
      blocks: "blok",
      missing: "Eksik",
      priceConnected: "Fiyat listesi bağlı",
      priceMissing: "Fiyat kaynağı eksik",
      sold: "Satıldı",
      units: "daire",
    },
    table: {
      access: "Erişim",
      blockFloor: "Blok/Kat",
      debt: "Borç",
      open: "açık",
      owner: "Malik",
      price: "Liste fiyatı",
      resident: "Sakin",
      sale: "Satış",
      service: "Servis",
      status: "Durum",
      typeArea: "Tip / m²",
      unit: "Daire",
    },
  },
  de: {
    actions: {
      actionColumn: "Aktionen",
      auditDescription: "Aktionen aktualisieren den ausgewählten Wohnungskontext und erzeugen einen Audit-Eintrag für den Live-Operationsstrom.",
      currentContext: "Aktuelles Ziel",
      debtHint: "Saldo und Zahlungsnachverfolgung für diese Wohnung.",
      debtOpen: "Schuldenstatus anzeigen",
      detailHint: "Verkauf, Quelle, Bewohner und Zugang in einem Wohnungsdatensatz.",
      detailOpen: "Wohnungsdetails anzeigen",
      menu: "Aktionen",
      menuHint: "Verkauf, Finanzen und Service bleiben im selben Wohnungsdatensatz.",
      open: "Öffnen",
      service: "Service",
      serviceHint: "Offene technische Anliegen und Serviceverlauf für diese Wohnung.",
      serviceHistory: "Serviceverlauf anzeigen",
      title: "Wohnungsaktionen",
    },
    common: {
      allBlocks: "Alle Blöcke",
      allStatuses: "Alle Status",
      block: "Block",
      closed: "geschlossen",
      notFound: "Für diesen Filter wurde keine Wohnung gefunden.",
      records: "Datensätze",
      rows: "Zeilen",
      sourceMissing: "Quelle fehlt",
      sourcePending: "Quelle ausstehend",
      unknown: "Unbekannt",
    },
    filters: { debtOnly: "Mit Schuld", reset: "Filter zurücksetzen", search: "Wohnung, Eigentümer, Bewohner oder Block suchen" },
    import: {
      batchOpened: "Paket geöffnet",
      batchTitle: "Datenpaket",
      centerDescription: "Zeilen, Warnungen und Fehler werden geprüft, bevor Kundenlisten angewendet werden.",
      centerTitle: "Datenprüfzentrum",
      findingOpened: "Befund geöffnet",
      findingSummary: "Befundübersicht",
      modelDescription: "Jeder Datensatz verbindet Block, Etage, Wohnung, Eigentümer, Bewohner, Schuld, Kaution, Zugang und Service.",
      modelTitle: "Wohnungsdatenmodell",
      qualityDescription: "Ohne abgelehnte Zeilen kann der Import angewendet werden; Warnungen schließen mit Managerfreigabe.",
      qualityGate: "Qualitätsprüfung",
      ready: "bereit",
      rejected: "Abgelehnt",
      rowsSummary: "{valid}/{total} gültig, {warning} Warnung, {rejected} abgelehnt.",
      summaryOpened: "Übersicht geöffnet",
      totalRows: "Gesamtzeilen",
      valid: "Gültig",
      warning: "Warnung",
    },
    labels: {
      access: { active: "Aktiv", disabled: "Deaktiviert", pending: "Ausstehend", restricted: "Eingeschränkt" },
      finding: { error: "Fehler", info: "Info", warning: "Warnung" },
      flat: { blocked: "Gesperrt", maintenance: "Wartung", occupied: "Belegt", reserved: "Reserviert", vacant: "Frei" },
      importStatus: { ready_to_apply: "Bereit zur Anwendung", review_required: "Prüfung nötig", validated: "Validiert" },
      payment: { clear: "Ausgeglichen", legal: "Juristische Prüfung", minor_debt: "Kleine Schuld", overdue: "Überfällig" },
      sale: { available: "Zum Verkauf", sold: "Verkauft", source_missing: "Quelle fehlt", unknown: "Prüfung" },
    },
    live: {
      auditEmpty: "Noch kein Audit-Datensatz vorhanden.",
      auditFallback: "Audit-Datensatz",
      auditTitle: "Letzte Audit-Datensätze",
      commit: "Änderung anfragen",
      debtOnly: "Mit Schuld",
      description: "Block, Etage, Wohnung, Eigentümer, Bewohner, Schuld, Service und Importdaten werden in einer Operationsansicht geführt. Jede Aktion wird mit Berechtigungs- und Auditkontext protokolliert.",
      filterMatched: "{count} Datensätze gefunden.",
      filterMatchedSuffix: "Für schnelle Nutzung zeigt die Tabelle die ersten 80 Zeilen; alle Datensätze bleiben in Suche und Filtern enthalten.",
      filterMatchedTail: "Datensätze gefunden",
      findingsTitle: "Datenqualitätsbefunde",
      preview: "Daten prüfen",
      refresh: "Daten aktualisieren",
      requestError: "Aktion konnte nicht gespeichert werden. Berechtigung oder Verbindung prüfen.",
      requestSaved: "Aktion gespeichert.",
      search: "Wohnung, Eigentümer, Bewohner oder Block suchen",
      tableHeaders: ["Wohnung", "Block/Etage", "Verkauf", "Liste", "Eigentümer", "Bewohner", "Status", "Schuld", "Service"],
      title: "Wohnungsmatrix-Datensätze",
    },
    matrix: {
      description: "{count} Datensätze im Filter. Die ersten {preview} Wohnungen werden gezeigt; jedes Feld öffnet Detail und Aktion.",
      empty: "Für diesen Filter wurde keine Wohnung gefunden.",
      selected: "Ausgewählte Wohnung",
      title: "Visuelle Wohnungsmatrix",
    },
    metrics: {
      debtHelper: "Konten mit Schuld",
      debtLabel: "Gesamtschuld",
      occupancyHelper: "Belegt + reserviert",
      occupancyLabel: "Belegung",
      restrictedHelper: "Gesperrter Zugang",
      restrictedLabel: "Zugang eingeschränkt",
      totalHelper: "Alle Datensätze",
      totalLabel: "Wohnungen gesamt",
    },
    page: {
      projectBody: "Diese Ansicht hilft Ataberk Estate, Käuferfragen schnell zu beantworten, passende Wohnungen zu filtern und Tour, Zahlung, Dokumente, Service und Zugang in einem Operationsdatensatz zu steuern.",
      projectScope: "Projektumfang",
      subtitle: "{portfolio} / {location}: Einheiten, Eigentümer, Kunden, Zahlungen, Dokumente, Service und Zugang werden in einem Arbeitsbereich geführt. Die Matrix ist für Filterung, Nachverfolgung und Kontrolle im 769-Einheiten-Betrieb vorbereitet.",
      title: "Projekt- und Wohnungsmatrix",
    },
    pillars: [
      { icon: Languages, title: "Mehrsprachiger Verkauf", detail: "Russisch, Deutsch, Türkisch und Englisch bleiben in Lead-Kommunikation, Exposé, Dokumenten und Managementansichten sauber." },
      { icon: WalletCards, title: "Investment- und Mietargumente", detail: "Ratenzahlung, Mietpotenzial, Mietverwaltung und Wiederverkaufsargumente bleiben pro Einheit sichtbar." },
      { icon: MapPinned, title: "Projekt- und Standortwissen", detail: "Avsallar, Incekum, Strandnähe, Hotelinfrastruktur, Projektstatus und verfügbare Einheitentypen sind schnell erklärbar." },
      { icon: Sofa, title: "Eigentümer- und Hotelservice", detail: "Rezeption, technische Anliegen, Spa/Fitness, Restaurantvorteile, Privatstrand, Shuttle, Möbel, Vermietung und Wartung bleiben in derselben Kundenreise." },
    ],
    selectedUnit: {
      accessOpen: "Zugangsstatus öffnen",
      blockSummary: "Block {block}, Etage {floor} · {type}",
      currentDebt: "Schuld",
      listPrice: "Listenpreis",
      openService: "Offener Service",
      priceSource: "Quelle",
      priceSourceConnected: "PDF verbunden",
      sourcePending: "Quelle ausstehend",
    },
    summary: {
      availableForSale: "Zum Verkauf",
      blockSummaryDescription: "Preislistenstatus, Verkauf, Belegung und Schuldenlast je Block.",
      blockSummaryTitle: "Blockübersicht",
      blocks: "Blöcke",
      missing: "Fehlt",
      priceConnected: "Preisliste verbunden",
      priceMissing: "Preisquelle fehlt",
      sold: "Verkauft",
      units: "Wohnungen",
    },
    table: {
      access: "Zugang",
      blockFloor: "Block/Etage",
      debt: "Schuld",
      open: "offen",
      owner: "Eigentümer",
      price: "Listenpreis",
      resident: "Bewohner",
      sale: "Verkauf",
      service: "Service",
      status: "Status",
      typeArea: "Typ / m²",
      unit: "Wohnung",
    },
  },
  ru: {
    actions: {
      actionColumn: "Действия",
      auditDescription: "Действия обновляют контекст выбранной квартиры и создают аудит-событие для живого операционного потока.",
      currentContext: "Текущая цель",
      debtHint: "Баланс и контроль оплаты по этой квартире.",
      debtOpen: "Показать статус долга",
      detailHint: "Продажа, источник, жилец и доступ в одной записи квартиры.",
      detailOpen: "Показать детали квартиры",
      menu: "Действия",
      menuHint: "Продажи, финансы и сервис ведутся в одной записи квартиры.",
      open: "Открыть",
      service: "Сервис",
      serviceHint: "Открытые технические заявки и история сервиса по этой квартире.",
      serviceHistory: "Показать историю сервиса",
      title: "Действия по квартире",
    },
    common: {
      allBlocks: "Все блоки",
      allStatuses: "Все статусы",
      block: "Блок",
      closed: "закрыто",
      notFound: "По этому фильтру квартира не найдена.",
      records: "записей",
      rows: "строк",
      sourceMissing: "Источник отсутствует",
      sourcePending: "Источник ожидается",
      unknown: "Неизвестно",
    },
    filters: { debtOnly: "С долгом", reset: "Сбросить фильтры", search: "Поиск по квартире, владельцу, жильцу или блоку" },
    import: {
      batchOpened: "Пакет открыт",
      batchTitle: "пакет данных",
      centerDescription: "Строки, предупреждения и ошибки проверяются перед применением клиентских Excel-файлов и списков.",
      centerTitle: "Центр проверки данных",
      findingOpened: "Замечание открыто",
      findingSummary: "Сводка замечаний",
      modelDescription: "Каждая запись связывает блок, этаж, квартиру, владельца, жильца, долг, депозит, доступ и сервис.",
      modelTitle: "Модель данных квартиры",
      qualityDescription: "Если отклоненных строк нет, импорт можно применить; предупреждения закрываются после одобрения менеджера.",
      qualityGate: "Контроль качества",
      ready: "готово",
      rejected: "Отклонено",
      rowsSummary: "{valid}/{total} корректно, {warning} предупреждение, {rejected} отклонено.",
      summaryOpened: "Сводка открыта",
      totalRows: "Всего строк",
      valid: "Корректно",
      warning: "Предупреждение",
    },
    labels: {
      access: { active: "Активен", disabled: "Отключен", pending: "Ожидает", restricted: "Ограничен" },
      finding: { error: "Ошибка", info: "Инфо", warning: "Предупреждение" },
      flat: { blocked: "Заблокировано", maintenance: "Обслуживание", occupied: "Занято", reserved: "Резерв", vacant: "Свободно" },
      importStatus: { ready_to_apply: "Готово к применению", review_required: "Нужна проверка", validated: "Проверено" },
      payment: { clear: "Чисто", legal: "Юридический контроль", minor_debt: "Малый долг", overdue: "Просрочено" },
      sale: { available: "В продаже", sold: "Продано", source_missing: "Источник отсутствует", unknown: "Проверка" },
    },
    live: {
      auditEmpty: "Аудит-записей по данным или квартирам пока нет.",
      auditFallback: "Аудит-запись",
      auditTitle: "Последние аудит-записи",
      commit: "Запросить изменение",
      debtOnly: "С долгом",
      description: "Блок, этаж, квартира, владелец, жилец, долг, сервис и импорт управляются в одном операционном виде. Каждое действие фиксируется с правами доступа и аудитом.",
      filterMatched: "Найдено {count} записей.",
      filterMatchedSuffix: "Для скорости таблица показывает первые 80 строк; все записи остаются в поиске и фильтрах.",
      filterMatchedTail: "записей найдено",
      findingsTitle: "Замечания по качеству данных",
      preview: "Проверить данные",
      refresh: "Обновить данные",
      requestError: "Действие не сохранено. Проверьте права или соединение.",
      requestSaved: "Действие сохранено.",
      search: "Поиск по квартире, владельцу, жильцу или блоку",
      tableHeaders: ["Квартира", "Блок/Этаж", "Продажа", "Лист", "Владелец", "Жилец", "Статус", "Долг", "Сервис"],
      title: "Записи матрицы квартир",
    },
    matrix: {
      description: "{count} записей в фильтре. Показаны первые {preview} квартир; каждый квадрат открывает детали и действия.",
      empty: "По этому фильтру квартира не найдена.",
      selected: "Выбранная квартира",
      title: "Визуальная матрица квартир",
    },
    metrics: {
      debtHelper: "Счета с долгом",
      debtLabel: "Общий долг",
      occupancyHelper: "Занято + резерв",
      occupancyLabel: "Загрузка",
      restrictedHelper: "Заблокированный доступ",
      restrictedLabel: "Доступ ограничен",
      totalHelper: "Все записи",
      totalLabel: "Всего квартир",
    },
    page: {
      projectBody: "Этот экран помогает Ataberk Estate быстро отвечать покупателям, фильтровать подходящие квартиры и управлять турами, оплатой, документами, сервисом и доступом из одной операционной записи.",
      projectScope: "Объем проекта",
      subtitle: "{portfolio} / {location}: квартиры, владельцы, клиенты, платежи, документы, сервис и доступ управляются в одном рабочем пространстве. Матрица подготовлена для фильтрации, контроля и сопровождения 769 единиц.",
      title: "Проект и матрица квартир",
    },
    pillars: [
      { icon: Languages, title: "Многоязычные продажи", detail: "Русский, немецкий, турецкий и английский остаются чистыми в лидах, презентациях, документах и управленческих видах." },
      { icon: WalletCards, title: "Аргументы инвестиций и аренды", detail: "Рассрочка, арендный потенциал, управление арендой и перепродажа видны по каждой квартире." },
      { icon: MapPinned, title: "Знание проекта и локации", detail: "Авсаллар, Инджекум, близость к морю, отельная инфраструктура, статус проекта и типы квартир объясняются быстро." },
      { icon: Sofa, title: "Сервис владельца и отеля", detail: "Ресепшен, технические заявки, spa/fitness, ресторан, частный пляж, shuttle, мебель, аренда и обслуживание остаются в одной истории клиента." },
    ],
    selectedUnit: {
      accessOpen: "Открыть статус доступа",
      blockSummary: "Блок {block}, этаж {floor} · {type}",
      currentDebt: "Долг",
      listPrice: "Цена по листу",
      openService: "Открытый сервис",
      priceSource: "Источник",
      priceSourceConnected: "PDF подключен",
      sourcePending: "Источник ожидается",
    },
    summary: {
      availableForSale: "В продаже",
      blockSummaryDescription: "Статус прайс-листа, продаж, занятости и долга по каждому блоку.",
      blockSummaryTitle: "Сводка по блокам",
      blocks: "блоков",
      missing: "Нет данных",
      priceConnected: "Прайс-лист подключен",
      priceMissing: "Источник цены отсутствует",
      sold: "Продано",
      units: "квартир",
    },
    table: {
      access: "Доступ",
      blockFloor: "Блок/Этаж",
      debt: "Долг",
      open: "открыто",
      owner: "Владелец",
      price: "Цена по листу",
      resident: "Жилец",
      sale: "Продажа",
      service: "Сервис",
      status: "Статус",
      typeArea: "Тип / м²",
      unit: "Квартира",
    },
  },
}

export function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  )
}

const operationalValueCopy: Record<DashboardLocale, Record<string, string>> = {
  en: {
    "Malik kaydı bekliyor": "Owner record pending",
    "Operasyon Kullanıcısı": "Operations User",
    "Sakin kaydı bekliyor": "Resident record pending",
    "Sakin kaydı yok": "No resident record",
    "Satış portföyü": "Sales portfolio",
  },
  tr: {
    "Malik kaydı bekliyor": "Malik kaydı bekliyor",
    "Operasyon Kullanıcısı": "Operasyon Kullanıcısı",
    "Sakin kaydı bekliyor": "Sakin kaydı bekliyor",
    "Sakin kaydı yok": "Sakin kaydı yok",
    "Satış portföyü": "Satış portföyü",
  },
  de: {
    "Malik kaydı bekliyor": "Eigentümerdatensatz ausstehend",
    "Operasyon Kullanıcısı": "Operationsbenutzer",
    "Sakin kaydı bekliyor": "Bewohnerdatensatz ausstehend",
    "Sakin kaydı yok": "Kein Bewohnerdatensatz",
    "Satış portföyü": "Verkaufsportfolio",
  },
  ru: {
    "Malik kaydı bekliyor": "Запись владельца ожидается",
    "Operasyon Kullanıcısı": "Операционный пользователь",
    "Sakin kaydı bekliyor": "Запись жильца ожидается",
    "Sakin kaydı yok": "Нет записи жильца",
    "Satış portföyü": "Портфель продаж",
  },
}

export function localizeOperationalValue(value: string | null | undefined, locale: DashboardLocale) {
  if (!value) return "-"
  return operationalValueCopy[locale][value] ?? value
}
