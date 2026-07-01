export const dashboardHomeCopy = {
  tr: {
    command: {
      inspect: "İncele",
      locked: "Rol kapalı",
      lockedAriaSuffix: "rol izni yok",
      lockedTitle: "Bu modül mevcut rol için kapalı",
    },
    phaseStatus: {
      complete: "Aktif",
      ready_for_uat: "Kontrol hazır",
      in_progress: "Yapımda",
      planned: "Planlandı",
      blocked: "Bloke",
    },
    hero: {
      title: "{client} ERP Operasyon Merkezi",
      subtitle:
        "Satış, proje takibi, WhatsApp/Telegram lead akışı, evrak, servis, finans ve AI önceliklendirme tek çalışma alanında toplanır. Operasyon görünümü {units} birim ölçeğinde yönetim, kontrol ve takip için çalışır. Aktif rol: {role}.",
      refreshError: "Veri yenilenemedi. Lütfen tekrar deneyin.",
      portfolioSource: "Portföy kaynağı",
    },
    erpWorld: {
      units: "daire",
      openService: "açık servis",
      activeRole: "aktif rol",
    },
    globalScene: {
      eyebrow: "Operasyon merkezi",
      title: "Daire, servis, finans ve rezervasyon aynı kontrol düzleminde",
      description:
        "Aktif rol: {role}. Bu görünüm yönetim ve sorumlu rolü için portföy ölçeğinde risk, iş yükü ve tahsilat sinyallerini birleştirir.",
      aiRisk: "AI risk",
      aiRiskHelper: "öncelikli aksiyon",
      panels: {
        liveUnits: "Canlı daire",
        occupancy: "{value}% doluluk",
        openService: "Açık servis",
        overdue: "{value} SLA dışı",
        accessRisk: "Erişim riski",
        financeCheck: "finans kontrolü",
      },
      workload: {
        eyebrow: "İş yoğunluğu",
        title: "Sonraki 8 saat operasyon yükü",
        description:
          "Çubuklar servis talepleri, finans/erişim kısıtları ve rezervasyon baskısını tek öncelik skorunda birleştirir.",
        scaleLow: "Sakin",
        scaleHigh: "Yoğun",
        loadUnit: "yük",
        peakLabel: "Pik saat",
        peakText:
          "15:00 en yoğun pencere: erişim onayı, servis SLA ve check-out kontrolü aynı anda takip edilmeli.",
        legend: {
          service: "Servis/SLA",
          finance: "Finans",
          access: "Erişim",
          booking: "Rezervasyon",
        },
        bars: [
          { time: "09:00", label: "Sabah triage", value: 42, kind: "service" },
          { time: "10:00", label: "Borç kontrolü", value: 64, kind: "finance" },
          { time: "11:00", label: "Saha atama", value: 52, kind: "service" },
          { time: "12:00", label: "Erişim onayı", value: 88, kind: "access" },
          { time: "13:00", label: "Temizlik", value: 70, kind: "booking" },
          { time: "15:00", label: "SLA piki", value: 96, kind: "service" },
          { time: "16:00", label: "Depozito", value: 61, kind: "finance" },
          { time: "17:00", label: "Kapanış", value: 78, kind: "booking" },
        ],
      },
      rbacTitle: "Rol bağlantıları aktif",
      rbacDescription:
        "Dashboard kartları, API ve AI yanıtları aynı RBAC matrisinden geçer.",
    },
    kpis: {
      totalUnits: "Toplam Daire",
      occupancy: "{value}% doluluk",
      unitHelper: "{vacant} boş, {maintenance} bakımda",
      totalDebt: "Toplam Borç",
      restricted: "{value} erişim kısıtı",
      openService: "Açık Servis",
      overdue: "{value} SLA dışı",
      serviceHelper: "Teknik, finans ve depozito işleri",
      todayWork: "Bugünkü İşler",
      checkouts: "{value} çıkış",
      bookingHelper: "Giriş, çıkış, temizlik, depozito",
    },
    alerts: {
      aiRisk:
        "{count} operasyon riski AI kuyruğunda: borç, SLA ve check-out birlikte takip ediliyor.",
      access:
        "{count} dairede erişim kısıtı var. Finans onayı olmadan servis yönlendirilmemeli.",
      sla:
        "{count} servis talebi SLA dışına çıktı. Teknik ekip için öncelik listesi hazır.",
    },
    modules: {
      title: "ERP modül durumu",
      description:
        "CRM, daire matrisi, kullanıcı rolleri, finans, servis, saha, rezervasyon, iletişim, mobil PWA, entegrasyon, AI ve güvenlik kontrolleri aynı işletim planında izlenir.",
      badge: "{complete} aktif · {ready} kontrol hazır · {progress} yapımda",
      module: "Modül",
      howTo: "Nasıl kullanılır",
      openAria: "Modül {phase} {title} ekranını aç",
    },
    charts: {
      occupancyTitle: "Doluluk ve tahsilat sağlığı",
      occupancyDescription:
        "Doluluk oranı, gecikmiş borç ve servis baskısı birlikte okunur.",
      occupancyMetric: "Doluluk",
      accessMetric: "Erişim kısıtı",
      slaMetric: "SLA dışı",
      totalMetric: "Toplam",
      vacantMetric: "Boş",
      trendLabel: "Haziran hedefi korunuyor",
      statusTitle: "Daire durum dağılımı",
      statusDescription: "Operasyon ekibi için canlı portföy kırılımı.",
      blockTitle: "Blok bazlı operasyon",
      blocks: "{count} blok",
      block: "Blok",
      units: "daire",
      occupied: "Dolu",
      vacant: "Boş",
      maintenance: "Bakım",
      debt: "Borç",
      aiTitle: "AI operasyon asistanı",
      aiDescription:
        "Borç, SLA, depozito ve rezervasyon verilerini birleştirerek günlük yapılacakları sıralar.",
      recentFlow: "Son operasyon akışı",
      criticalToday: "Bugünkü kritik işler",
      monthlyExpected: "Aylık beklenen aidat",
      juneCollection: "Haziran tahsilat",
      depositRisk: "Depozito riski",
      financeSummaryAria: "Finans özetini aç",
    },
  },
  en: {
    command: {
      inspect: "Review",
      locked: "Role closed",
      lockedAriaSuffix: "role permission missing",
      lockedTitle: "This module is closed for the current role",
    },
    phaseStatus: {
      complete: "Active",
      ready_for_uat: "Ready for review",
      in_progress: "In progress",
      planned: "Planned",
      blocked: "Blocked",
    },
    hero: {
      title: "{client} ERP Operations Center",
      subtitle:
        "Sales, project tracking, WhatsApp/Telegram leads, documents, service, finance and AI prioritization are handled in one workspace. This operations view manages {units} units for control, follow-up and daily decisions. Active role: {role}.",
      refreshError: "Data could not be refreshed. Please try again.",
      portfolioSource: "Portfolio source",
    },
    erpWorld: {
      units: "units",
      openService: "open service",
      activeRole: "active role",
    },
    globalScene: {
      eyebrow: "Operations center",
      title: "Units, service, finance and reservations in one control layer",
      description:
        "Active role: {role}. This view combines portfolio-scale risk, workload and collection signals for administration and responsible managers.",
      aiRisk: "AI risk",
      aiRiskHelper: "priority actions",
      panels: {
        liveUnits: "Live units",
        occupancy: "{value}% occupied",
        openService: "Open service",
        overdue: "{value} outside SLA",
        accessRisk: "Access risk",
        financeCheck: "finance check",
      },
      workload: {
        eyebrow: "Workload",
        title: "Next 8-hour operation load",
        description:
          "Bars combine service tickets, finance/access holds and reservation pressure into one priority score.",
        scaleLow: "Calm",
        scaleHigh: "Peak",
        loadUnit: "load",
        peakLabel: "Peak window",
        peakText:
          "15:00 is the busiest window: access approvals, service SLA and check-out checks need coordinated follow-up.",
        legend: {
          service: "Service/SLA",
          finance: "Finance",
          access: "Access",
          booking: "Reservation",
        },
        bars: [
          { time: "09:00", label: "Morning triage", value: 42, kind: "service" },
          { time: "10:00", label: "Debt review", value: 64, kind: "finance" },
          { time: "11:00", label: "Field dispatch", value: 52, kind: "service" },
          { time: "12:00", label: "Access approval", value: 88, kind: "access" },
          { time: "13:00", label: "Cleaning queue", value: 70, kind: "booking" },
          { time: "15:00", label: "SLA peak", value: 96, kind: "service" },
          { time: "16:00", label: "Deposit check", value: 61, kind: "finance" },
          { time: "17:00", label: "Closeout", value: 78, kind: "booking" },
        ],
      },
      rbacTitle: "Role links active",
      rbacDescription:
        "Dashboard cards, API access and AI answers all pass through the same RBAC matrix.",
    },
    kpis: {
      totalUnits: "Total Units",
      occupancy: "{value}% occupied",
      unitHelper: "{vacant} vacant, {maintenance} in maintenance",
      totalDebt: "Total Debt",
      restricted: "{value} access holds",
      openService: "Open Service",
      overdue: "{value} outside SLA",
      serviceHelper: "Technical, finance and deposit work",
      todayWork: "Today’s Work",
      checkouts: "{value} check-outs",
      bookingHelper: "Check-in, check-out, cleaning, deposit",
    },
    alerts: {
      aiRisk:
        "{count} operational risks are in the AI queue: debt, SLA and check-out are tracked together.",
      access:
        "{count} units have access restrictions. Service should not be dispatched without finance approval.",
      sla:
        "{count} service tickets are outside SLA. The technical priority list is ready.",
    },
    modules: {
      title: "ERP module status",
      description:
        "CRM, unit matrix, user roles, finance, service, field work, reservations, communication, mobile PWA, integrations, AI and security controls are tracked in the same operating plan.",
      badge: "{complete} active · {ready} ready for review · {progress} in progress",
      module: "Module",
      howTo: "How to use",
      openAria: "Open module {phase} {title}",
    },
    charts: {
      occupancyTitle: "Occupancy and collection health",
      occupancyDescription:
        "Occupancy rate, overdue debt and service pressure are read together.",
      occupancyMetric: "Occupancy",
      accessMetric: "Access holds",
      slaMetric: "Outside SLA",
      totalMetric: "Total",
      vacantMetric: "Vacant",
      trendLabel: "June target is holding",
      statusTitle: "Unit status distribution",
      statusDescription: "Live portfolio split for the operations team.",
      blockTitle: "Block-level operations",
      blocks: "{count} blocks",
      block: "Block",
      units: "units",
      occupied: "Occupied",
      vacant: "Vacant",
      maintenance: "Maintenance",
      debt: "Debt",
      aiTitle: "AI operations assistant",
      aiDescription:
        "Combines debt, SLA, deposit and reservation data to rank daily work.",
      recentFlow: "Recent operation flow",
      criticalToday: "Today’s critical work",
      monthlyExpected: "Monthly expected dues",
      juneCollection: "June collection",
      depositRisk: "Deposit risk",
      financeSummaryAria: "Open finance summary",
    },
  },
  de: {
    command: {
      inspect: "Prüfen",
      locked: "Rolle gesperrt",
      lockedAriaSuffix: "Rollenberechtigung fehlt",
      lockedTitle: "Dieses Modul ist für die aktuelle Rolle geschlossen",
    },
    phaseStatus: {
      complete: "Aktiv",
      ready_for_uat: "Prüfbereit",
      in_progress: "In Arbeit",
      planned: "Geplant",
      blocked: "Blockiert",
    },
    hero: {
      title: "{client} ERP Operationszentrum",
      subtitle:
        "Vertrieb, Projektverfolgung, WhatsApp/Telegram-Leads, Dokumente, Service, Finanzen und KI-Priorisierung laufen in einem Arbeitsbereich zusammen. Diese Operationsansicht steuert {units} Einheiten für Kontrolle, Nachverfolgung und tägliche Entscheidungen. Aktive Rolle: {role}.",
      refreshError: "Daten konnten nicht aktualisiert werden. Bitte erneut versuchen.",
      portfolioSource: "Portfolioquelle",
    },
    erpWorld: {
      units: "Einheiten",
      openService: "offene Services",
      activeRole: "aktive Rolle",
    },
    globalScene: {
      eyebrow: "Operationszentrum",
      title: "Einheiten, Service, Finanzen und Reservierungen in einer Steuerungsebene",
      description:
        "Aktive Rolle: {role}. Diese Ansicht bündelt Risiko-, Arbeitslast- und Zahlungssignale auf Portfolioebene für Administration und verantwortliche Manager.",
      aiRisk: "KI-Risiko",
      aiRiskHelper: "Prioritätsaktionen",
      panels: {
        liveUnits: "Live-Einheiten",
        occupancy: "{value}% belegt",
        openService: "Offener Service",
        overdue: "{value} außerhalb SLA",
        accessRisk: "Zugangsrisiko",
        financeCheck: "Finanzprüfung",
      },
      workload: {
        eyebrow: "Arbeitslast",
        title: "Operationslast der nächsten 8 Stunden",
        description:
          "Die Balken bündeln Service-Tickets, Finanz-/Zugangssperren und Reservierungsdruck zu einem Prioritätsscore.",
        scaleLow: "Ruhig",
        scaleHigh: "Spitze",
        loadUnit: "Last",
        peakLabel: "Spitzenfenster",
        peakText:
          "15:00 ist das stärkste Fenster: Zugangsgenehmigungen, Service-SLA und Check-out-Prüfungen müssen koordiniert verfolgt werden.",
        legend: {
          service: "Service/SLA",
          finance: "Finanzen",
          access: "Zugang",
          booking: "Reservierung",
        },
        bars: [
          { time: "09:00", label: "Morgen-Triage", value: 42, kind: "service" },
          { time: "10:00", label: "Schuldenprüfung", value: 64, kind: "finance" },
          { time: "11:00", label: "Feldeinsatz", value: 52, kind: "service" },
          { time: "12:00", label: "Zugangsgenehmigung", value: 88, kind: "access" },
          { time: "13:00", label: "Reinigung", value: 70, kind: "booking" },
          { time: "15:00", label: "SLA-Spitze", value: 96, kind: "service" },
          { time: "16:00", label: "Kautionsprüfung", value: 61, kind: "finance" },
          { time: "17:00", label: "Abschluss", value: 78, kind: "booking" },
        ],
      },
      rbacTitle: "Rollenverknüpfungen aktiv",
      rbacDescription:
        "Dashboard-Karten, API-Zugriff und KI-Antworten laufen über dieselbe RBAC-Matrix.",
    },
    kpis: {
      totalUnits: "Einheiten gesamt",
      occupancy: "{value}% belegt",
      unitHelper: "{vacant} frei, {maintenance} in Wartung",
      totalDebt: "Gesamtschuld",
      restricted: "{value} Zugangssperren",
      openService: "Offener Service",
      overdue: "{value} außerhalb SLA",
      serviceHelper: "Technik-, Finanz- und Kautionsarbeit",
      todayWork: "Heutige Arbeit",
      checkouts: "{value} Check-outs",
      bookingHelper: "Check-in, Check-out, Reinigung, Kaution",
    },
    alerts: {
      aiRisk:
        "{count} Operationsrisiken liegen in der KI-Warteschlange: Schulden, SLA und Check-out werden gemeinsam verfolgt.",
      access:
        "{count} Einheiten haben Zugangsbeschränkungen. Service darf ohne Finanzfreigabe nicht disponiert werden.",
      sla:
        "{count} Service-Tickets liegen außerhalb der SLA. Die technische Prioritätsliste ist bereit.",
    },
    modules: {
      title: "ERP-Modulstatus",
      description:
        "CRM, Wohnungsmatrix, Benutzerrollen, Finanzen, Service, Außendienst, Reservierungen, Kommunikation, mobile PWA, Integrationen, KI und Sicherheitskontrollen werden im selben Betriebsplan verfolgt.",
      badge: "{complete} aktiv · {ready} prüfbereit · {progress} in Arbeit",
      module: "Modul",
      howTo: "Nutzung",
      openAria: "Modul {phase} {title} öffnen",
    },
    charts: {
      occupancyTitle: "Belegung und Zahlungsstatus",
      occupancyDescription:
        "Belegungsrate, überfällige Schulden und Servicedruck werden gemeinsam gelesen.",
      occupancyMetric: "Belegung",
      accessMetric: "Zugangssperren",
      slaMetric: "Außerhalb SLA",
      totalMetric: "Gesamt",
      vacantMetric: "Frei",
      trendLabel: "Juni-Ziel bleibt stabil",
      statusTitle: "Statusverteilung der Einheiten",
      statusDescription: "Live-Portfolioschnitt für das Operationsteam.",
      blockTitle: "Blockbasierte Operationen",
      blocks: "{count} Blöcke",
      block: "Block",
      units: "Einheiten",
      occupied: "Belegt",
      vacant: "Frei",
      maintenance: "Wartung",
      debt: "Schuld",
      aiTitle: "KI-Operationsassistent",
      aiDescription:
        "Bündelt Schulden, SLA, Kaution und Reservierungen, um Tagesarbeit zu priorisieren.",
      recentFlow: "Letzter Operationsfluss",
      criticalToday: "Heutige kritische Arbeiten",
      monthlyExpected: "Monatlich erwartete Beiträge",
      juneCollection: "Juni-Zahlungseingang",
      depositRisk: "Kautionsrisiko",
      financeSummaryAria: "Finanzübersicht öffnen",
    },
  },
  ru: {
    command: {
      inspect: "Открыть",
      locked: "Роль закрыта",
      lockedAriaSuffix: "нет прав роли",
      lockedTitle: "Этот модуль закрыт для текущей роли",
    },
    phaseStatus: {
      complete: "Активно",
      ready_for_uat: "Готово к проверке",
      in_progress: "В работе",
      planned: "Запланировано",
      blocked: "Заблокировано",
    },
    hero: {
      title: "{client} ERP операционный центр",
      subtitle:
        "Продажи, проектный контроль, WhatsApp/Telegram-лиды, документы, сервис, финансы и AI-приоритизация собраны в одном рабочем пространстве. Этот вид управляет {units} юнитами для контроля, отслеживания и ежедневных решений. Активная роль: {role}.",
      refreshError: "Не удалось обновить данные. Попробуйте еще раз.",
      portfolioSource: "Источник портфеля",
    },
    erpWorld: {
      units: "юнитов",
      openService: "открытый сервис",
      activeRole: "активная роль",
    },
    globalScene: {
      eyebrow: "Операционный центр",
      title: "Юниты, сервис, финансы и бронирования в одном контуре контроля",
      description:
        "Активная роль: {role}. Этот вид объединяет риски, нагрузку и сигналы по оплатам на уровне портфеля для администрации и ответственных менеджеров.",
      aiRisk: "AI-риск",
      aiRiskHelper: "приоритетные действия",
      panels: {
        liveUnits: "Живые юниты",
        occupancy: "{value}% занято",
        openService: "Открытый сервис",
        overdue: "{value} вне SLA",
        accessRisk: "Риск доступа",
        financeCheck: "финансовая проверка",
      },
      workload: {
        eyebrow: "Нагрузка",
        title: "Операционная нагрузка на 8 часов",
        description:
          "Столбцы объединяют сервисные заявки, финансовые/доступные блокировки и давление бронирований в один приоритетный показатель.",
        scaleLow: "Спокойно",
        scaleHigh: "Пик",
        loadUnit: "нагрузка",
        peakLabel: "Пиковое окно",
        peakText:
          "15:00 - самая загруженная зона: подтверждения доступа, SLA сервиса и check-out контроль требуют координации.",
        legend: {
          service: "Сервис/SLA",
          finance: "Финансы",
          access: "Доступ",
          booking: "Бронирование",
        },
        bars: [
          { time: "09:00", label: "Утренний разбор", value: 42, kind: "service" },
          { time: "10:00", label: "Проверка долга", value: 64, kind: "finance" },
          { time: "11:00", label: "Назначение поля", value: 52, kind: "service" },
          { time: "12:00", label: "Допуск", value: 88, kind: "access" },
          { time: "13:00", label: "Уборка", value: 70, kind: "booking" },
          { time: "15:00", label: "Пик SLA", value: 96, kind: "service" },
          { time: "16:00", label: "Депозит", value: 61, kind: "finance" },
          { time: "17:00", label: "Закрытие", value: 78, kind: "booking" },
        ],
      },
      rbacTitle: "Ролевые связи активны",
      rbacDescription:
        "Карточки панели, API-доступ и AI-ответы проходят через одну RBAC-матрицу.",
    },
    kpis: {
      totalUnits: "Всего юнитов",
      occupancy: "{value}% занято",
      unitHelper: "{vacant} свободно, {maintenance} на обслуживании",
      totalDebt: "Общий долг",
      restricted: "{value} ограничений доступа",
      openService: "Открытый сервис",
      overdue: "{value} вне SLA",
      serviceHelper: "Техника, финансы и депозиты",
      todayWork: "Работы сегодня",
      checkouts: "{value} check-out",
      bookingHelper: "Check-in, check-out, уборка, депозит",
    },
    alerts: {
      aiRisk:
        "{count} операционных рисков в AI-очереди: долг, SLA и check-out отслеживаются вместе.",
      access:
        "{count} юнитов имеют ограничения доступа. Сервис нельзя направлять без финансового одобрения.",
      sla:
        "{count} сервисных заявок вышли за SLA. Приоритетный список для техников готов.",
    },
    modules: {
      title: "Статус ERP-модулей",
      description:
        "CRM, матрица юнитов, роли пользователей, финансы, сервис, полевые работы, бронирования, коммуникации, мобильная PWA, интеграции, AI и безопасность отслеживаются в одном операционном плане.",
      badge: "{complete} активно · {ready} готово к проверке · {progress} в работе",
      module: "Модуль",
      howTo: "Как использовать",
      openAria: "Открыть модуль {phase} {title}",
    },
    charts: {
      occupancyTitle: "Загрузка и здоровье оплат",
      occupancyDescription:
        "Занятость, просроченный долг и сервисная нагрузка читаются вместе.",
      occupancyMetric: "Занятость",
      accessMetric: "Ограничения доступа",
      slaMetric: "Вне SLA",
      totalMetric: "Всего",
      vacantMetric: "Свободно",
      trendLabel: "Июньская цель удерживается",
      statusTitle: "Распределение статусов юнитов",
      statusDescription: "Живой срез портфеля для операционной команды.",
      blockTitle: "Операции по блокам",
      blocks: "{count} блоков",
      block: "Блок",
      units: "юнитов",
      occupied: "Занято",
      vacant: "Свободно",
      maintenance: "Обслуживание",
      debt: "Долг",
      aiTitle: "AI-ассистент операций",
      aiDescription:
        "Объединяет долг, SLA, депозит и бронирования для ранжирования ежедневных задач.",
      recentFlow: "Последний операционный поток",
      criticalToday: "Критичные работы сегодня",
      monthlyExpected: "Ожидаемые взносы за месяц",
      juneCollection: "Сбор за июнь",
      depositRisk: "Риск депозита",
      financeSummaryAria: "Открыть финансовую сводку",
    },
  },
} as const

export type DashboardHomeLocale = keyof typeof dashboardHomeCopy
export type DashboardHomeCopy = (typeof dashboardHomeCopy)[DashboardHomeLocale]
export type WorkloadKind =
  DashboardHomeCopy["globalScene"]["workload"]["bars"][number]["kind"]

export function resolveDashboardHomeLocale(locale: string): DashboardHomeLocale {
  return locale in dashboardHomeCopy ? (locale as DashboardHomeLocale) : "tr"
}
