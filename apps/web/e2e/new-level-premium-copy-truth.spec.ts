import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"

const readSource = (...segments: string[]) =>
  readFileSync(resolve(process.cwd(), ...segments), "utf8")

test.describe("New Level Premium public copy truth contract", () => {
  test("identity intake states minimized protection and policy-pending retention in every locale", () => {
    const registration = readSource(
      "components",
      "new-level-premium",
      "nlp-registration.tsx"
    )

    for (const required of [
      "müşteri ve hukuk tarafından onaylanmış KVKK politikası",
      "client and legal team approve the KVKK policy",
      "Freigabe der KVKK-Richtlinie durch den Kunden und die Rechtsberatung",
      "утверждения политики KVKK клиентом и юристами",
      "ham kimlik belgesi veya selfie yüklemesi kabul edilmez",
      "does not accept raw ID-document or selfie uploads",
      "Uploads roher Ausweisdokumente oder Selfies werden nicht angenommen",
      "загрузка исходных документов и селфи не принимается",
      "Doğrulanmış daireniz için hizmetlere, rezervasyonlara, yetkili belgelere ve yönetimle iletişime erişim",
      "services, reservations, authorized documents, and communications with management for your verified unit",
      "für Ihre verifizierte Einheit Zugriff auf Dienstleistungen, Reservierungen, freigegebene Dokumente und die Kommunikation mit der Verwaltung",
      "услугам, бронированиям, разрешённым документам и переписке с управляющей компанией по подтверждённой квартире",
    ]) {
      expect(registration).toContain(required)
    }

    for (const forbidden of [
      "süre bitince sileriz",
      "delete it after the retention period",
      "löschen sie nach Ablauf der Frist",
      "удаляем по истечении срока",
      "Kimliğimi doğrula",
      "Doğrulanıyor...",
      "Kimlik doğrulandı",
      "Verify my identity",
      "Verifying...",
      "Identity verified",
      "Identität verifizieren",
      "Wird geprüft...",
      "Identität verifiziert",
      "Подтвердить личность",
      "Проверка...",
      "Личность подтверждена",
      "Kendi daireniz için tam erişim",
      "full access for your own unit",
      "Vollzugriff für Ihre eigene Einheit",
      "полный доступ к своей квартире",
    ]) {
      expect(registration).not.toContain(forbidden)
    }
  })

  test("post-registration copy promises manual review, never automatic OCR or seconds", () => {
    const after = readSource("components", "new-level-premium", "nlp-after.tsx")

    for (const required of [
      "Manuel kimlik incelemesi",
      "Manual identity review",
      "Manuelle Identitätsprüfung",
      "Ручная проверка личности",
      "Kimlik doğrulama hizmeti de kullanılamadığı",
      "The identity-verification service is also unavailable",
      "Der Dienst zur Identitätsprüfung ist ebenfalls nicht verfügbar",
      "Сервис проверки личности также недоступен",
      "Bağlantılı işlem kayıtları",
      "Connected records",
      "Verknüpfte Vorgänge",
      "Связанные записи",
      "Hassas işlemler için denetim kaydı",
      "Audited sensitive actions",
      "Prüfprotokoll für sensible Vorgänge",
      "Аудит критически важных действий",
      "yalnızca onaylı bir ilişki bulunduğunda bağlanır",
      "linked only where an approved relationship exists",
      "nur bei freigegebener Beziehung verknüpft",
      "связываются только при одобренной связи",
      "doğrulanmış hassas akışlar izlenebilir kayıt bırakır",
      "Verified sensitive flows such as approvals, access and finance leave a traceable record",
      "Verifizierte sensible Abläufe wie Freigaben, Zutritt und Finanzen hinterlassen eine nachvollziehbare Spur",
      "Проверенные критически важные процессы — одобрения, доступ и финансы — оставляют отслеживаемую запись",
      "Erişiminiz rolünüzle sınırlıdır",
      "Access is role-scoped",
      "Ihr Zugriff ist rollenbezogen",
      "Доступ ограничен ролью",
      "yalnızca atanmış işleri görür",
      "staff see only assigned work",
      "Mitarbeitende nur zugewiesene Aufgaben",
      "сотрудники — только назначенную работу",
      "Süreli kiracı erişimini yalnızca doğrulanmış malik",
      "Only a verified owner can manage time-boxed tenant access",
      "Nur ein verifizierter Eigentümer kann befristeten Mieterzugang verwalten",
      "Только подтверждённый собственник может управлять ограниченным по времени доступом арендатора",
    ]) {
      expect(after).toContain(required)
    }

    for (const forbidden of [
      "Saniyeler içinde doğrulama",
      "OCR ve selfie eşleştirme, otomatik",
      "Verified in seconds",
      "OCR and selfie match, automatic",
      "In Sekunden verifiziert",
      "OCR und Selfie-Abgleich, automatisch",
      "Проверка за секунды",
      "OCR и сверка селфи, автоматически",
      "ScanFace",
      "IDV",
      "Rezervasyondan tapuya kadar tek kayıt",
      "From reservation to title deed, one record",
      "Von der Reservierung bis zum Grundbuch, ein Datensatz",
      "От брони до свидетельства, одна запись",
      "Her işlem kayıtlı ve izlenebilir",
      "Every action is logged and traceable",
      "Jede Aktion wird protokolliert und ist nachvollziehbar",
      "Каждое действие фиксируется и отслеживается",
      "Yalnızca kendi daireniz, kendi verileriniz",
      "Only your own unit, your own data",
      "Nur Ihre eigene Einheit, Ihre eigenen Daten",
      "Только ваша квартира, ваши данные",
      "Bakiye, servis ve belge ekranları",
      "Balance, service and document screens",
      "Saldo-, Service- und Dokumentansichten",
      "Экраны баланса, сервиса и документов",
      "Süreli kiracı erişimini kendiniz yönetirsiniz",
      "You manage time-boxed tenant access yourself",
      "Sie verwalten den befristeten Mieterzugang selbst",
      "Вы сами управляете срочным доступом арендатора",
    ]) {
      expect(after).not.toContain(forbidden)
    }

    expect(after).not.toMatch(/\bIDV\b|\blive(?:-|\s)/i)
    expect(after).not.toMatch(
      /tek kayıt|her işlem|one record|every action|ein datensatz|jede aktion|(?:одна|единая) запись|каждое действие/i
    )
  })

  test("capabilities carry their own demo or live boundary without blanket claims", () => {
    const why = readSource("components", "new-level-premium", "nlp-why.tsx")

    for (const required of [
      "Malik finans özeti — yerel doğrulandı",
      "Owner finance summary — locally verified",
      "Eigentümer-Finanzübersicht – lokal verifiziert",
      "Финансы собственника — проверено локально",
      "üretim girişi, onaylı veri erişimi veya canlı sağlayıcı bağlantısı",
      "production login, approved data access or a live provider connection",
      "Produktionsanmeldung, freigegebenen Datenzugriff oder eine Live-Anbindung",
      "защищённого рабочего входа, разрешённого доступа к данным или подключения действующего поставщика",
      "Belge listesi — dosyalar bekliyor",
      "Document list — files pending",
      "Dokumentenliste – Dateien ausstehend",
      "Список документов — файлы ожидают",
      "Erişim kararları — sağlayıcı kapılı",
      "Access decisions — provider-gated",
      "Zutrittsentscheidungen – Anbieter-Gate",
      "Решения о доступе — провайдер закрыт",
      "Genel ürün asistanı — sınırlı kapsam",
      "Public product assistant — limited scope",
      "Öffentlicher Produktassistent – begrenzt",
      "Публичный продуктовый ассистент — ограничен",
      "hesap verisi kullanmaz",
      "uses no account data",
      "keine Kontodaten",
      "не использует данные аккаунта",
      "E-posta, SMS, WhatsApp ve push teslimatı henüz bağlı değildir",
      "Email, SMS, WhatsApp and push delivery are not yet connected",
      "E-Mail, SMS, WhatsApp und Push sind noch nicht verbunden",
      "Электронная почта, SMS, WhatsApp и мобильные уведомления ещё не подключены",
    ]) {
      expect(why).toContain(required)
    }

    for (const forbidden of [
      "Yukarıdakilerin tümü mevcut sistemde çalışır",
      "All of the above works in the current system",
      "All dies funktioniert im aktuellen System",
      "Всё вышеперечисленное работает в текущей системе",
      "hepsi aynı derinlikte",
      "each with the same depth",
      "jeweils gleich tief",
      "с одинаковой глубиной",
    ]) {
      expect(why).not.toContain(forbidden)
    }

    // Architecture vocabulary stays in one concise release footnote per locale,
    // rather than becoming the public explanation for every capability.
    expect(why.match(/\bRLS\b/g)).toHaveLength(4)

    const russian = why.split("  ru: {")[1] ?? ""
    expect(russian).toContain("обязательной проверкой перед выпуском")
    expect(russian).toContain("готовность к рабочей эксплуатации")
    expect(russian).not.toMatch(
      /\b(?:production|live|push)\b|release-QA gate|release-gates?/i
    )
  })

  test("admin descriptions are assigned-company only in all four catalogs", () => {
    const expected: Record<string, string[]> = {
      tr: [
        "atandığı şirket",
        "kuruluşlar arası",
        "platform genelinde",
        "break-glass",
      ],
      en: [
        "assigned company only",
        "cross-organization",
        "platform control",
        "break-glass",
      ],
      de: [
        "zugewiesene Unternehmen",
        "organisationsübergreifende",
        "Plattformkontrolle",
        "Break-Glass",
      ],
      ru: [
        "назначенной компании",
        "межорганизационного",
        "платформенного управления",
        "break-glass",
      ],
    }

    for (const [locale, fragments] of Object.entries(expected)) {
      const messages = JSON.parse(readSource("messages", `${locale}.json`)) as {
        roles: { descriptions: { admin: string } }
      }
      const description = messages.roles.descriptions.admin
      for (const fragment of fragments) expect(description).toContain(fragment)
    }
  })

  test("identity provider and persistence guards remain fail-closed", () => {
    const identityRoute = readSource(
      "app",
      "api",
      "site-management",
      "identity-verification",
      "route.ts"
    )
    const registrationRoute = readSource(
      "app",
      "api",
      "site-management",
      "registration",
      "route.ts"
    )
    const migration = readSource(
      "..",
      "..",
      "supabase",
      "migrations",
      "00000000000025_registration_activation_workflow.sql"
    )

    expect(identityRoute).toContain(
      "body.idNumber !== undefined || body.idImage !== undefined || body.selfie !== undefined"
    )
    expect(identityRoute).toContain("IDV_RAW_IDENTITY_FORBIDDEN")
    expect(identityRoute).toContain('status: "manual_review_required"')
    expect(identityRoute).toContain("simulated: false")
    expect(identityRoute).toContain("IDV_PROVIDER_SESSION_REQUIRED")
    expect(registrationRoute).toContain(
      "const identityDigest = idNumber ? protectedIdentityDigest(idNumber) : null"
    )
    expect(registrationRoute).toMatch(
      /submitRegistration\(\{[\s\S]*?identityDigest,[\s\S]*?\}\)/
    )
    expect(migration).toContain("p_payload ? 'idNumber'")
  })
})
