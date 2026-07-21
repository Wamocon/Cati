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
      rbacTitle: "Herkes yalnızca yetkisini görür",
      rbacDescription:
        "Her rol yalnızca kendi görebileceği sayfaları, verileri ve asistan yanıtlarını görür.",
    },
    roleWorkspaces: {
      common: {
        boundariesTitle: "Yetki sınırları",
        boundariesBody:
          "Bu ekranda şirket geneli daire matrisi, finans defteri, kullanıcı yönetimi ve platform ayarları gösterilmez. Kapalı bir sayfa URL ile açılırsa sistem sizi tekrar kendi çalışma alanınıza döndürür.",
      },
      accountant: {
        title: "Finans Çalışma Alanı",
        description:
          "Bu rol aidat, tahsilat, depozito, belge ve finans raporlarına odaklanır. Operasyon, kullanıcı ve ayar ekranları kapalıdır.",
        accessNotes: [
          "Kullanıcı yönetimi kapalı",
          "Saha işi kapatma operasyon kanıtı olmadan yapılamaz",
        ],
        cards: {
          tickets: {
            title: "Finans İncelemesi Gereken Talepler",
            description: "Ödeme, borç veya mali onay gerektiren servis taleplerini salt okunur olarak inceleyin.",
          },
          finance: {
            title: "Finans & Aidat",
            description: "Aidat, tahsilat, açık bakiye ve finans defteri kontrolleri.",
          },
          documents: {
            title: "Belgeler",
            description: "Ödeme, TAPU, sözleşme ve muhasebe evrakı takibi.",
          },
          reports: {
            title: "Raporlar",
            description: "Finans ve tahsilat çıktıları, dışa aktarım ve kontrol raporları.",
          },
          communications: {
            title: "İletişim",
            description: "Finans hatırlatmaları ve ilgili bildirim taslakları.",
          },
        },
      },
      staff: {
        title: "Saha Ekibi Çalışma Alanı",
        description:
          "Bu rol kendisine atanan servis, görev, rezervasyon, belge ve iletişim akışlarını görür. Finans, kullanıcı yönetimi ve ayarlar kapalıdır.",
        accessNotes: [
          "Finans defteri kapalı",
          "İade, erişim kısıtı ve rol onayı kapalı",
        ],
        cards: {
          tickets: {
            title: "Servis Talepleri",
            description: "Atanan işler, SLA, durum güncelleme ve saha notları.",
          },
          calendar: {
            title: "Rezervasyon",
            description: "Giriş, çıkış, gezinti, temizlik ve günlük görev takibi.",
          },
          documents: {
            title: "Belgeler",
            description: "İş kanıtı, fotoğraf ve operasyon dokümanları.",
          },
          communications: {
            title: "İletişim",
            description: "Operasyon ekibiyle mesaj ve bildirim akışı.",
          },
        },
      },
      owner: {
        title: "Malik Çalışma Alanı",
        description:
          "Bu rol, doğrulanmış kendi dairelerine ait salt okunur bakiye, hesap özeti ve ödeme geçmişinin yanı sıra servis, rezervasyon, belge ve yönetim iletişimini görür. Diğer malik kayıtları ve şirket içi finans kontrolleri kapalıdır.",
        accessNotes: [
          "Sadece doğrulanmış kendi daireleri ve yetkili kayıtlar",
          "Diğer malik, personel, şirket raporları ve iç finans kontrolleri kapalı",
        ],
        cards: {
          tickets: {
            title: "Servis Talepleri",
            description: "Kendi daireniz için servis talebi açın ve durum takip edin.",
          },
          calendar: {
            title: "Rezervasyon",
            description: "Kiralama, giriş-çıkış ve uygunluk takvimi.",
          },
          finance: {
            title: "Bakiye & Hesap Özeti",
            description: "Doğrulanmış kendi daireleriniz için salt okunur bakiye, hesap özeti ve ödeme geçmişi.",
          },
          documents: {
            title: "Belgeler",
            description: "Yetkili olduğunuz sözleşme, TAPU ve operasyon evrakı.",
          },
          communications: {
            title: "İletişim",
            description: "Yönetim ekibiyle güvenli mesajlaşma ve bildirimler.",
          },
        },
      },
      tenant: {
        title: "Kiracı Çalışma Alanı",
        description:
          "Bu rol yalnızca kendi kullanım alanındaki servis, rezervasyon, belge ve iletişim işlemlerini görür. Daire matrisi, finans defteri, raporlar ve kullanıcı yönetimi kapalıdır.",
        accessNotes: [
          "Sadece yetkili daire ve izin verilen işlemler",
          "Malik kayıtları, raporlar, finans defteri ve diğer daireler kapalı",
        ],
        cards: {
          tickets: {
            title: "Servis Talepleri",
            description: "Bakım talebi oluşturun ve mevcut taleplerin durumunu takip edin.",
          },
          calendar: {
            title: "Rezervasyon",
            description: "Giriş, çıkış ve yetkili rezervasyon akışları.",
          },
          documents: {
            title: "Belgeler",
            description: "Yetkili olduğunuz kira ve operasyon belgeleri.",
          },
          communications: {
            title: "İletişim",
            description: "Yönetim ekibine mesaj gönderin ve bildirimleri takip edin.",
          },
        },
      },
    },
    roleScenes: {
      common: {
        liveFilterLabel: "Canlı yetki filtresi",
        rhythmTitle: "Çalışma alanı ritmi",
        rhythmDescription: "Hover ve kart geçişleri gerçek modül akışlarını gösterir.",
      },
      accountant: {
        eyebrow: "Finans kontrol akışı",
        title: "Tahsilat, belge ve onay tek ekranda",
        metricLabel: "bu ay doğrulanan tahsilat",
        status: "Finans verisi açık, operasyon verisi kapalı",
        bars: ["Tahsilat", "Depozito", "Belge"],
        timeline: [
          { label: "Defter", detail: "Aidat ve bakiye kontrolü" },
          { label: "Belge", detail: "Ödeme/TAPU evrakı" },
          { label: "Rapor", detail: "Finans çıktısı" },
        ],
      },
      staff: {
        eyebrow: "Saha operasyon akışı",
        title: "Atanan işler, SLA ve kanıt üretimi",
        metricLabel: "bugün görünür görev",
        status: "Saha kuyruğu açık, finans ve kullanıcı yönetimi kapalı",
        bars: ["SLA", "Kanıt", "Rota"],
        timeline: [
          { label: "Talep", detail: "Atanan servis işi" },
          { label: "Saha", detail: "Fotoğraf ve not" },
          { label: "Kapatma", detail: "Yönetici kontrolü" },
        ],
      },
      owner: {
        eyebrow: "Malik portal akışı",
        title: "Kendi daireleriniz için bakiye ve işlem görünümü",
        metricLabel: "yetkili işlem alanı",
        status: "Kendi daireleri için salt okunur hesap özeti, belge ve iletişim",
        bars: ["Servis", "Bakiye", "Belge"],
        timeline: [
          { label: "Daire", detail: "Yetkili kayıt" },
          { label: "Finans", detail: "Bakiye ve ödeme geçmişi" },
          { label: "Mesaj", detail: "Yönetim iletişimi" },
        ],
      },
      tenant: {
        eyebrow: "Kiracı portal akışı",
        title: "Servis, rezervasyon ve belgeye hızlı erişim",
        metricLabel: "açık kullanıcı modülü",
        status: "Daire matrisi, finans ve raporlar kapalı",
        bars: ["Servis", "Takvim", "Belge"],
        timeline: [
          { label: "Talep", detail: "Bakım veya destek" },
          { label: "Takvim", detail: "Giriş/çıkış akışı" },
          { label: "Belge", detail: "Yetkili evrak" },
        ],
      },
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
      title: "Operasyon uyarıları",
      subtitle: "Öncelikli müdahale gerektiren canlı sinyaller.",
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
      badge: "{complete} aktif · {ready} kontrol hazır · {progress} yapımda · {blocked} bloke",
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
      financeSummaryTitle: "Finans özeti",
      financeSummarySubtitle: "Aylık aidat, tahsilat ve depozito riski tek bakışta.",
      slaRemaining: "{value} sa",
      slaOverdue: "{value} sa gecikmede",
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
      rbacTitle: "Everyone sees only what their role allows",
      rbacDescription:
        "Each role sees the pages, data and assistant answers permitted for them.",
    },
    roleWorkspaces: {
      common: {
        boundariesTitle: "Permission boundaries",
        boundariesBody:
          "This workspace does not show the company-wide unit matrix, finance ledger, user administration or platform settings. If a closed page is opened by URL, the system returns the user to the allowed workspace.",
      },
      accountant: {
        title: "Finance Workspace",
        description:
          "This role focuses on dues, collections, deposits, documents and finance reports. Operations, user administration and settings are closed.",
        accessNotes: [
          "User administration is closed",
          "Field work cannot be closed without operational evidence",
        ],
        cards: {
          tickets: {
            title: "Tickets Requiring Finance Review",
            description: "Review service tickets that need payment, debt, or financial approval without changing operations.",
          },
          finance: {
            title: "Finance & Dues",
            description: "Dues, collections, open balances and finance ledger controls.",
          },
          documents: {
            title: "Documents",
            description: "Payment, TAPU, contract and accounting document follow-up.",
          },
          reports: {
            title: "Reports",
            description: "Finance and collection outputs, exports and control reports.",
          },
          communications: {
            title: "Communication",
            description: "Finance reminders and related notification drafts.",
          },
        },
      },
      staff: {
        title: "Field Team Workspace",
        description:
          "This role sees assigned service, task, reservation, document and communication flows. Finance, user administration and settings are closed.",
        accessNotes: [
          "Finance ledger is closed",
          "Refund, access restriction and role approval are closed",
        ],
        cards: {
          tickets: {
            title: "Service Tickets",
            description: "Assigned work, SLA, status updates and field notes.",
          },
          calendar: {
            title: "Reservations",
            description: "Check-in, check-out, viewings, cleaning and daily task follow-up.",
          },
          documents: {
            title: "Documents",
            description: "Work evidence, photos and operations documents.",
          },
          communications: {
            title: "Communication",
            description: "Messages and notifications with the operations team.",
          },
        },
      },
      owner: {
        title: "Owner Workspace",
        description:
          "This role sees read-only balances, statements and payment history for its verified owned units, alongside service, reservations, documents and management communication. Other owners' records and internal finance controls are closed.",
        accessNotes: [
          "Only verified owned units and authorized records",
          "Other owners, staff, company reports and internal finance controls are closed",
        ],
        cards: {
          tickets: {
            title: "Service Tickets",
            description: "Open a service request for your unit and track its status.",
          },
          calendar: {
            title: "Reservations",
            description: "Rental, check-in/out and availability calendar.",
          },
          finance: {
            title: "Balance & Statement",
            description: "Read-only balances, statements and payment history for your verified owned units.",
          },
          documents: {
            title: "Documents",
            description: "Authorized contracts, TAPU and operations documents.",
          },
          communications: {
            title: "Communication",
            description: "Secure messaging and notifications with the management team.",
          },
        },
      },
      tenant: {
        title: "Tenant Workspace",
        description:
          "This role only sees service, reservation, document and communication actions within its authorized usage scope. Unit matrix, finance ledger, reports and user administration are closed.",
        accessNotes: [
          "Only authorized unit and permitted actions",
          "Owner records, reports, finance ledger and other units are closed",
        ],
        cards: {
          tickets: {
            title: "Service Tickets",
            description: "Create maintenance requests and track existing request status.",
          },
          calendar: {
            title: "Reservations",
            description: "Check-in, check-out and authorized reservation flows.",
          },
          documents: {
            title: "Documents",
            description: "Authorized rental and operations documents.",
          },
          communications: {
            title: "Communication",
            description: "Send messages to the management team and follow notifications.",
          },
        },
      },
    },
    roleScenes: {
      common: {
        liveFilterLabel: "Live permission filter",
        rhythmTitle: "Workspace rhythm",
        rhythmDescription: "Hover and card transitions show the real module flow.",
      },
      accountant: {
        eyebrow: "Finance control flow",
        title: "Collections, documents and approvals in one view",
        metricLabel: "collections verified this month",
        status: "Finance data open, operations data closed",
        bars: ["Collections", "Deposit", "Document"],
        timeline: [
          { label: "Ledger", detail: "Dues and balance review" },
          { label: "Document", detail: "Payment/TAPU files" },
          { label: "Report", detail: "Finance output" },
        ],
      },
      staff: {
        eyebrow: "Field operations flow",
        title: "Assigned work, SLA and evidence capture",
        metricLabel: "visible tasks today",
        status: "Field queue open, finance and user administration closed",
        bars: ["SLA", "Evidence", "Route"],
        timeline: [
          { label: "Request", detail: "Assigned service work" },
          { label: "Field", detail: "Photo and note" },
          { label: "Close", detail: "Manager review" },
        ],
      },
      owner: {
        eyebrow: "Owner portal flow",
        title: "Clear balances and activity for your own units",
        metricLabel: "authorized action areas",
        status: "Read-only statement, documents and communication for owned units",
        bars: ["Service", "Balance", "Document"],
        timeline: [
          { label: "Unit", detail: "Authorized record" },
          { label: "Finance", detail: "Balance and payment history" },
          { label: "Message", detail: "Management communication" },
        ],
      },
      tenant: {
        eyebrow: "Tenant portal flow",
        title: "Fast access to service, reservations and documents",
        metricLabel: "open user modules",
        status: "Unit matrix, finance and reports closed",
        bars: ["Service", "Calendar", "Document"],
        timeline: [
          { label: "Request", detail: "Maintenance or support" },
          { label: "Calendar", detail: "Check-in/out flow" },
          { label: "Document", detail: "Authorized files" },
        ],
      },
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
      title: "Operational alerts",
      subtitle: "Live signals that need priority attention.",
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
      badge: "{complete} active · {ready} ready for review · {progress} in progress · {blocked} blocked",
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
      financeSummaryTitle: "Finance summary",
      financeSummarySubtitle: "Monthly dues, collection and deposit risk at a glance.",
      slaRemaining: "{value}h",
      slaOverdue: "{value}h overdue",
    },
  },
  de: {
    command: {
      inspect: "Prüfen",
      locked: "Bereich gesperrt",
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
      rbacTitle: "Jeder sieht nur, was seine Rolle erlaubt",
      rbacDescription:
        "Jede Rolle sieht nur die Seiten, Daten und Assistentenantworten, die für sie freigegeben sind.",
    },
    roleWorkspaces: {
      common: {
        boundariesTitle: "Berechtigungsgrenzen",
        boundariesBody:
          "Dieser Arbeitsbereich zeigt keine unternehmensweite Wohnungsmatrix, kein Finanzbuch, keine Benutzerverwaltung und keine Plattformeinstellungen. Wird eine gesperrte Seite per URL geöffnet, führt das System zurück in den erlaubten Arbeitsbereich.",
      },
      accountant: {
        title: "Finanzarbeitsbereich",
        description:
          "Diese Rolle konzentriert sich auf Beiträge, Zahlungseingänge, Kautionen, Dokumente und Finanzberichte. Operations, Benutzerverwaltung und Einstellungen sind geschlossen.",
        accessNotes: [
          "Benutzerverwaltung ist geschlossen",
          "Außendienstaufgaben können ohne Operationsnachweis nicht abgeschlossen werden",
        ],
        cards: {
          tickets: {
            title: "Tickets mit Finanzprüfung",
            description: "Serviceanfragen mit Zahlungs-, Rückstands- oder Finanzfreigabe prüfen, ohne den operativen Ablauf zu ändern.",
          },
          finance: {
            title: "Finanzen & Beiträge",
            description: "Beiträge, Zahlungseingänge, offene Salden und Finanzbuch-Kontrollen.",
          },
          documents: {
            title: "Dokumente",
            description: "Zahlungs-, TAPU-, Vertrags- und Buchhaltungsunterlagen verfolgen.",
          },
          reports: {
            title: "Berichte",
            description: "Finanz- und Zahlungsausgänge, Exporte und Kontrollberichte.",
          },
          communications: {
            title: "Kommunikation",
            description: "Finanzerinnerungen und zugehörige Benachrichtigungsentwürfe.",
          },
        },
      },
      staff: {
        title: "Außendienst-Arbeitsbereich",
        description:
          "Diese Rolle sieht zugewiesene Service-, Aufgaben-, Reservierungs-, Dokumenten- und Kommunikationsflüsse. Finanzen, Benutzerverwaltung und Einstellungen sind geschlossen.",
        accessNotes: [
          "Finanzbuch ist geschlossen",
          "Erstattung, Zugangssperre und Rollenfreigabe sind geschlossen",
        ],
        cards: {
          tickets: {
            title: "Servicetickets",
            description: "Zugewiesene Arbeit, SLA, Statusupdates und Feldnotizen.",
          },
          calendar: {
            title: "Reservierungen",
            description: "Check-in, Check-out, Besichtigungen, Reinigung und tägliche Aufgaben.",
          },
          documents: {
            title: "Dokumente",
            description: "Arbeitsnachweise, Fotos und Operationsdokumente.",
          },
          communications: {
            title: "Kommunikation",
            description: "Nachrichten und Benachrichtigungen mit dem Operationsteam.",
          },
        },
      },
      owner: {
        title: "Eigentümer-Arbeitsbereich",
        description:
          "Diese Rolle sieht schreibgeschützte Salden, Abrechnungen und Zahlungshistorien für verifizierte eigene Einheiten sowie Service, Reservierungen, Dokumente und Managementkommunikation. Daten anderer Eigentümer und interne Finanzkontrollen sind geschlossen.",
        accessNotes: [
          "Nur verifizierte eigene Einheiten und autorisierte Datensätze",
          "Andere Eigentümer, Personal, Unternehmensberichte und interne Finanzkontrollen sind geschlossen",
        ],
        cards: {
          tickets: {
            title: "Servicetickets",
            description: "Serviceanfrage für die eigene Einheit öffnen und Status verfolgen.",
          },
          calendar: {
            title: "Reservierungen",
            description: "Vermietung, Check-in/out und Verfügbarkeitskalender.",
          },
          finance: {
            title: "Saldo & Abrechnung",
            description: "Schreibgeschützte Salden, Abrechnungen und Zahlungshistorien für Ihre verifizierten eigenen Einheiten.",
          },
          documents: {
            title: "Dokumente",
            description: "Autorisierte Verträge, TAPU und Operationsunterlagen.",
          },
          communications: {
            title: "Kommunikation",
            description: "Sichere Nachrichten und Benachrichtigungen mit dem Managementteam.",
          },
        },
      },
      tenant: {
        title: "Mieter-Arbeitsbereich",
        description:
          "Diese Rolle sieht nur Service-, Reservierungs-, Dokumenten- und Kommunikationsaktionen im autorisierten Nutzungsbereich. Wohnungsmatrix, Finanzbuch, Berichte und Benutzerverwaltung sind geschlossen.",
        accessNotes: [
          "Nur autorisierte Einheit und erlaubte Aktionen",
          "Eigentümerdaten, Berichte, Finanzbuch und andere Einheiten sind geschlossen",
        ],
        cards: {
          tickets: {
            title: "Servicetickets",
            description: "Wartungsanfragen erstellen und bestehenden Status verfolgen.",
          },
          calendar: {
            title: "Reservierungen",
            description: "Check-in, Check-out und autorisierte Reservierungsflüsse.",
          },
          documents: {
            title: "Dokumente",
            description: "Autorisierte Miet- und Operationsdokumente.",
          },
          communications: {
            title: "Kommunikation",
            description: "Nachrichten an das Management senden und Benachrichtigungen verfolgen.",
          },
        },
      },
    },
    roleScenes: {
      common: {
        liveFilterLabel: "Live-Berechtigungsfilter",
        rhythmTitle: "Arbeitsrhythmus",
        rhythmDescription: "Hover- und Kartenübergänge zeigen den echten Modulfluss.",
      },
      accountant: {
        eyebrow: "Finanzkontrollfluss",
        title: "Zahlungen, Dokumente und Freigaben in einer Ansicht",
        metricLabel: "diesen Monat verifizierte Zahlungseingänge",
        status: "Finanzdaten offen, Operationsdaten geschlossen",
        bars: ["Zahlungen", "Kaution", "Dokument"],
        timeline: [
          { label: "Buch", detail: "Beiträge und Saldenprüfung" },
          { label: "Dokument", detail: "Zahlungs-/TAPU-Dateien" },
          { label: "Bericht", detail: "Finanzausgabe" },
        ],
      },
      staff: {
        eyebrow: "Außendienstfluss",
        title: "Zugewiesene Arbeit, SLA und Nachweise",
        metricLabel: "heute sichtbare Aufgaben",
        status: "Feldwarteschlange offen, Finanzen und Benutzerverwaltung geschlossen",
        bars: ["SLA", "Nachweis", "Route"],
        timeline: [
          { label: "Anfrage", detail: "Zugewiesene Servicearbeit" },
          { label: "Feld", detail: "Foto und Notiz" },
          { label: "Abschluss", detail: "Managerprüfung" },
        ],
      },
      owner: {
        eyebrow: "Eigentümerportalfluss",
        title: "Klare Salden und Vorgänge für eigene Einheiten",
        metricLabel: "autorisierte Aktionsbereiche",
        status: "Schreibgeschützte Abrechnung, Dokumente und Kommunikation für eigene Einheiten",
        bars: ["Service", "Saldo", "Dokument"],
        timeline: [
          { label: "Einheit", detail: "Autorisierter Datensatz" },
          { label: "Finanzen", detail: "Saldo und Zahlungshistorie" },
          { label: "Nachricht", detail: "Managementkommunikation" },
        ],
      },
      tenant: {
        eyebrow: "Mieterportalfluss",
        title: "Schneller Zugriff auf Service, Reservierungen und Dokumente",
        metricLabel: "offene Nutzermodule",
        status: "Wohnungsmatrix, Finanzen und Berichte geschlossen",
        bars: ["Service", "Kalender", "Dokument"],
        timeline: [
          { label: "Anfrage", detail: "Wartung oder Support" },
          { label: "Kalender", detail: "Check-in/out-Fluss" },
          { label: "Dokument", detail: "Autorisierte Dateien" },
        ],
      },
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
      title: "Betriebswarnungen",
      subtitle: "Live-Signale mit Handlungsbedarf.",
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
      badge: "{complete} aktiv · {ready} prüfbereit · {progress} in Arbeit · {blocked} blockiert",
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
      financeSummaryTitle: "Finanzübersicht",
      financeSummarySubtitle: "Monatliche Beiträge, Zahlungseingang und Kautionsrisiko auf einen Blick.",
      slaRemaining: "{value} Std",
      slaOverdue: "{value} Std überfällig",
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
      rbacTitle: "Каждый видит только то, что разрешено его роли",
      rbacDescription:
        "Каждая роль видит только страницы, данные и ответы ассистента, разрешённые для неё.",
    },
    roleWorkspaces: {
      common: {
        boundariesTitle: "Границы доступа",
        boundariesBody:
          "В этом рабочем пространстве не показываются общая матрица юнитов, финансовый журнал, управление пользователями и настройки платформы. Если закрытая страница открыта по URL, система возвращает пользователя в разрешенное рабочее пространство.",
      },
      accountant: {
        title: "Финансовое рабочее пространство",
        description:
          "Эта роль работает со взносами, оплатами, депозитами, документами и финансовыми отчетами. Операции, управление пользователями и настройки закрыты.",
        accessNotes: [
          "Управление пользователями закрыто",
          "Полевую работу нельзя закрыть без операционного доказательства",
        ],
        cards: {
          tickets: {
            title: "Заявки на финансовую проверку",
            description: "Просматривайте сервисные заявки, требующие проверки оплаты, задолженности или финансового согласования, без изменения операций.",
          },
          finance: {
            title: "Финансы и взносы",
            description: "Взносы, оплаты, открытые балансы и контроль финансового журнала.",
          },
          documents: {
            title: "Документы",
            description: "Контроль оплат, TAPU, договоров и бухгалтерских документов.",
          },
          reports: {
            title: "Отчеты",
            description: "Финансовые и платежные выгрузки, экспорт и контрольные отчеты.",
          },
          communications: {
            title: "Коммуникации",
            description: "Финансовые напоминания и связанные черновики уведомлений.",
          },
        },
      },
      staff: {
        title: "Рабочее пространство полевой команды",
        description:
          "Эта роль видит назначенный сервис, задачи, бронирования, документы и коммуникации. Финансы, управление пользователями и настройки закрыты.",
        accessNotes: [
          "Финансовый журнал закрыт",
          "Возвраты, ограничения доступа и ролевые одобрения закрыты",
        ],
        cards: {
          tickets: {
            title: "Сервисные заявки",
            description: "Назначенные работы, SLA, обновления статуса и полевые заметки.",
          },
          calendar: {
            title: "Бронирования",
            description: "Check-in, check-out, показы, уборка и ежедневные задачи.",
          },
          documents: {
            title: "Документы",
            description: "Доказательства работ, фото и операционные документы.",
          },
          communications: {
            title: "Коммуникации",
            description: "Сообщения и уведомления с операционной командой.",
          },
        },
      },
      owner: {
        title: "Рабочее пространство владельца",
        description:
          "Эта роль видит балансы, выписки и историю платежей только для подтверждённых собственных юнитов в режиме чтения, а также сервис, бронирования, документы и коммуникацию с управлением. Записи других владельцев и внутренние финансовые операции закрыты.",
        accessNotes: [
          "Только подтверждённые собственные юниты и авторизованные записи",
          "Другие владельцы, персонал, отчёты компании и внутренние финансовые операции закрыты",
        ],
        cards: {
          tickets: {
            title: "Сервисные заявки",
            description: "Создавайте заявку по своему юниту и отслеживайте статус.",
          },
          calendar: {
            title: "Бронирования",
            description: "Аренда, check-in/out и календарь доступности.",
          },
          finance: {
            title: "Баланс и выписка",
            description: "Балансы, выписки и история платежей только для ваших подтверждённых собственных юнитов в режиме чтения.",
          },
          documents: {
            title: "Документы",
            description: "Авторизованные договоры, TAPU и операционные документы.",
          },
          communications: {
            title: "Коммуникации",
            description: "Безопасные сообщения и уведомления с командой управления.",
          },
        },
      },
      tenant: {
        title: "Рабочее пространство арендатора",
        description:
          "Эта роль видит только сервис, бронирования, документы и коммуникации в авторизованном объеме. Матрица юнитов, финансы, отчеты и управление пользователями закрыты.",
        accessNotes: [
          "Только авторизованный юнит и разрешенные действия",
          "Записи владельцев, отчеты, финансы и другие юниты закрыты",
        ],
        cards: {
          tickets: {
            title: "Сервисные заявки",
            description: "Создавайте заявки на обслуживание и отслеживайте их статус.",
          },
          calendar: {
            title: "Бронирования",
            description: "Check-in, check-out и авторизованные потоки бронирований.",
          },
          documents: {
            title: "Документы",
            description: "Авторизованные договоры аренды и операционные документы.",
          },
          communications: {
            title: "Коммуникации",
            description: "Пишите команде управления и отслеживайте уведомления.",
          },
        },
      },
    },
    roleScenes: {
      common: {
        liveFilterLabel: "Живой фильтр доступа",
        rhythmTitle: "Ритм рабочего пространства",
        rhythmDescription: "Hover и переходы карточек показывают реальный поток модулей.",
      },
      accountant: {
        eyebrow: "Финансовый контроль",
        title: "Оплаты, документы и одобрения в одном виде",
        metricLabel: "оплат подтверждено за месяц",
        status: "Финансовые данные открыты, операционные данные закрыты",
        bars: ["Оплаты", "Депозит", "Документ"],
        timeline: [
          { label: "Журнал", detail: "Проверка взносов и баланса" },
          { label: "Документ", detail: "Файлы оплат/TAPU" },
          { label: "Отчет", detail: "Финансовый вывод" },
        ],
      },
      staff: {
        eyebrow: "Полевой операционный поток",
        title: "Назначенные работы, SLA и доказательства",
        metricLabel: "видимых задач сегодня",
        status: "Полевая очередь открыта, финансы и пользователи закрыты",
        bars: ["SLA", "Доказательства", "Маршрут"],
        timeline: [
          { label: "Заявка", detail: "Назначенная сервисная работа" },
          { label: "Поле", detail: "Фото и заметка" },
          { label: "Закрытие", detail: "Проверка менеджера" },
        ],
      },
      owner: {
        eyebrow: "Портал владельца",
        title: "Понятные балансы и операции по собственным юнитам",
        metricLabel: "авторизованных зон действий",
        status: "Выписка только для чтения, документы и коммуникации по собственным юнитам",
        bars: ["Сервис", "Баланс", "Документ"],
        timeline: [
          { label: "Юнит", detail: "Авторизованная запись" },
          { label: "Финансы", detail: "Баланс и история платежей" },
          { label: "Сообщение", detail: "Коммуникация с управлением" },
        ],
      },
      tenant: {
        eyebrow: "Портал арендатора",
        title: "Быстрый доступ к сервису, бронированиям и документам",
        metricLabel: "открытых модулей пользователя",
        status: "Матрица юнитов, финансы и отчеты закрыты",
        bars: ["Сервис", "Календарь", "Документ"],
        timeline: [
          { label: "Заявка", detail: "Обслуживание или поддержка" },
          { label: "Календарь", detail: "Поток check-in/out" },
          { label: "Документ", detail: "Авторизованные файлы" },
        ],
      },
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
      title: "Операционные предупреждения",
      subtitle: "Живые сигналы, требующие приоритетного внимания.",
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
      badge: "{complete} активно · {ready} готово к проверке · {progress} в работе · {blocked} заблокировано",
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
      financeSummaryTitle: "Финансовая сводка",
      financeSummarySubtitle: "Ежемесячные взносы, сбор и риск депозита с одного взгляда.",
      slaRemaining: "{value} ч",
      slaOverdue: "просрочено на {value} ч",
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

// Human, localized labels for raw backend table names and status enums that can
// leak through live snapshot data. A raw snake_case identifier (e.g.
// "client_action_requests", "waiting_approval") must never reach the screen in
// any locale. Tokens containing an underscore are safe to replace anywhere;
// bare single-word tokens are only replaced when they form the whole value, so
// we never corrupt the same word inside a normal sentence.
const backendTermLabels: Record<DashboardHomeLocale, Record<string, string>> = {
  tr: {
    client_action_requests: "onay kuyruğu",
    service_tickets: "servis talebi",
    service_ticket: "servis talebi",
    service_orders: "servis siparişi",
    service_order: "servis siparişi",
    workforce_tasks: "saha görevi",
    workforce_task: "saha görevi",
    ai_action_logs: "AI aksiyon kaydı",
    finance_ledger_entries: "finans kaydı",
    payment_transactions: "ödeme kaydı",
    access_events: "erişim kaydı",
    import_batches: "veri aktarımı",
    reservations: "rezervasyon",
    documents: "belge",
    units: "daire",
    waiting_approval: "onay bekliyor",
    in_progress: "işlemde",
    triage: "ön inceleme",
    assigned: "atandı",
    open: "açık",
  },
  en: {
    client_action_requests: "approval queue",
    service_tickets: "service request",
    service_ticket: "service request",
    service_orders: "service order",
    service_order: "service order",
    workforce_tasks: "field task",
    workforce_task: "field task",
    ai_action_logs: "AI recommendation",
    finance_ledger_entries: "finance record",
    payment_transactions: "payment record",
    access_events: "access record",
    import_batches: "data import",
    reservations: "reservation",
    documents: "document",
    units: "unit",
    waiting_approval: "waiting approval",
    in_progress: "in progress",
    triage: "triage",
    assigned: "assigned",
    open: "open",
  },
  de: {
    client_action_requests: "Freigabewarteschlange",
    service_tickets: "Serviceanfrage",
    service_ticket: "Serviceanfrage",
    service_orders: "Serviceauftrag",
    service_order: "Serviceauftrag",
    workforce_tasks: "Feldaufgabe",
    workforce_task: "Feldaufgabe",
    ai_action_logs: "KI-Empfehlung",
    finance_ledger_entries: "Finanzeintrag",
    payment_transactions: "Zahlungseintrag",
    access_events: "Zugangseintrag",
    import_batches: "Datenimport",
    reservations: "Reservierung",
    documents: "Dokument",
    units: "Einheit",
    waiting_approval: "wartet auf Freigabe",
    in_progress: "in Arbeit",
    triage: "Ersteinschätzung",
    assigned: "zugewiesen",
    open: "offen",
  },
  ru: {
    client_action_requests: "очередь согласований",
    service_tickets: "сервисная заявка",
    service_ticket: "сервисная заявка",
    service_orders: "сервисный заказ",
    service_order: "сервисный заказ",
    workforce_tasks: "полевая задача",
    workforce_task: "полевая задача",
    ai_action_logs: "AI-рекомендация",
    finance_ledger_entries: "финансовая запись",
    payment_transactions: "запись об оплате",
    access_events: "запись доступа",
    import_batches: "импорт данных",
    reservations: "бронирование",
    documents: "документ",
    units: "юнит",
    waiting_approval: "ожидает согласования",
    in_progress: "в работе",
    triage: "первичная оценка",
    assigned: "назначено",
    open: "открыто",
  },
}

const backendTermFallback: Record<DashboardHomeLocale, string> = {
  tr: "operasyon kaydı",
  en: "operations record",
  de: "Betriebsvorgang",
  ru: "операционная запись",
}

// Matches a bare backend identifier: lowercase segments joined by "_" or "."
// (e.g. service_tickets, waiting_approval, ticket.create.ai_draft, unit.detail.view).
const rawBackendTokenPattern = /^[a-z][a-z0-9]*([._][a-z0-9]+)+$/

/**
 * Replace backend table names / status enums with human, localized labels so no
 * raw snake_case identifier or table name reaches the UI in any locale. If the
 * value is still an unrecognized raw identifier after mapping, a friendly
 * localized fallback is returned instead.
 */
export function localizeBackendTerm(value: string, locale: string): string {
  if (!value) return value
  const resolved = resolveDashboardHomeLocale(locale)
  const labels = backendTermLabels[resolved]

  let result = value
  // 1) Multi-word tokens (with underscores) are safe to swap anywhere.
  for (const [token, label] of Object.entries(labels)) {
    if (!token.includes("_")) continue
    result = result.replace(new RegExp(`\\b${token}\\b`, "gi"), label)
  }

  // 2) Bare single-word tokens are only swapped when they are the whole value.
  const bareKey = result.trim().toLowerCase()
  if (!bareKey.includes("_") && labels[bareKey]) {
    return labels[bareKey]
  }

  // 3) Anything still shaped like a raw snake_case identifier gets a friendly label.
  if (rawBackendTokenPattern.test(result.trim())) {
    return backendTermFallback[resolved]
  }

  return result
}
