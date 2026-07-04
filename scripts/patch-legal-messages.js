const fs = require("fs")
const path = require("path")

const locales = ["en", "tr", "de", "ru"]
const messagesDir = path.join(__dirname, "..", "apps", "web", "messages")

const copy = {
  en: {
    privacy: {
      title: "Privacy Policy",
      updated: "Last updated: June 2026",
      intro:
        "Ataberk Estate and WAMOCON GmbH are committed to protecting your personal data. This policy describes what data we collect, how we use it, and your rights.",
      dataTitle: "Data we collect",
      dataText:
        "We collect contact details, property preferences, documents required for transactions (such as passport copies and TAPU scans), and usage data of the platform.",
      useTitle: "How we use data",
      useText:
        "Data is used to provide real-estate services, manage properties, comply with Turkish legal requirements, and improve the platform.",
      rightsTitle: "Your rights",
      rightsText:
        "You may request access, correction, or deletion of your personal data by contacting info@ataberkestate.com.",
    },
    terms: {
      title: "Terms of Use",
      updated: "Last updated: June 2026",
      intro:
        "By accessing the 1Çatı platform you agree to these terms. The platform is provided by WAMOCON GmbH on behalf of Ataberk Estate.",
      useTitle: "Acceptable use",
      useText:
        "Users must provide accurate information, keep login credentials secure, and use the platform only for lawful real-estate and property-management purposes.",
      liabilityTitle: "Liability",
      liabilityText:
        "The platform supports decision-making but does not replace legal, tax or investment advice. Ataberk Estate and WAMOCON are not liable for decisions made based on platform data.",
      contactTitle: "Contact",
      contactText: "For questions about these terms, contact info@ataberkestate.com.",
    },
  },
  tr: {
    privacy: {
      title: "Gizlilik Politikası",
      updated: "Son güncelleme: Haziran 2026",
      intro:
        "Ataberk Estate ve WAMOCON GmbH kişisel verilerinizi korumaya kararlıdır. Bu politika hangi verileri topladığımızı, nasıl kullandığımızı ve haklarınızı açıklar.",
      dataTitle: "Topladığımız veriler",
      dataText:
        "İletişim bilgileri, mülk tercihleri, işlemler için gerekli belgeler (pasaport kopyası, TAPU taraması vb.) ve platform kullanım verileri toplanır.",
      useTitle: "Verileri nasıl kullanıyoruz",
      useText:
        "Veriler, emlak hizmetleri sunmak, mülk yönetimi yapmak, Türk yasal gerekliliklerine uymak ve platformu geliştirmek için kullanılır.",
      rightsTitle: "Haklarınız",
      rightsText:
        "Kişisel verilerinize erişim, düzeltme veya silme talebinde bulunmak için info@ataberkestate.com adresine başvurabilirsiniz.",
    },
    terms: {
      title: "Kullanım Koşulları",
      updated: "Son güncelleme: Haziran 2026",
      intro:
        "1Çatı platformuna erişerek bu koşulları kabul etmiş sayılırsınız. Platform, WAMOCON GmbH tarafından Ataberk Estate adına sağlanmaktadır.",
      useTitle: "Kabul edilebilir kullanım",
      useText:
        "Kullanıcılar doğru bilgi vermeli, giriş bilgilerini güvenli tutmalı ve platformu yalnızca yasal emlak ve mülk yönetimi amaçlarıyla kullanmalıdır.",
      liabilityTitle: "Sorumluluk",
      liabilityText:
        "Platform karar almayı destekler ancak hukuki, vergi veya yatırım tavsiyesinin yerini tutmaz. Ataberk Estate ve WAMOCON, platform verilerine dayalı kararlardan sorumlu değildir.",
      contactTitle: "İletişim",
      contactText: "Bu koşullar hakkında sorularınız için info@ataberkestate.com adresine yazabilirsiniz.",
    },
  },
  de: {
    privacy: {
      title: "Datenschutzerklärung",
      updated: "Zuletzt aktualisiert: Juni 2026",
      intro:
        "Ataberk Estate und WAMOCON GmbH verpflichten sich zum Schutz Ihrer personenbezogenen Daten. Diese Erklärung beschreibt, welche Daten wir erheben, wie wir sie nutzen und welche Rechte Sie haben.",
      dataTitle: "Erhebte Daten",
      dataText:
        "Wir erheben Kontaktdaten, Immobilienpräferenzen, für Transaktionen erforderliche Dokumente (z. B. Passkopien, TAPU-Scans) und Nutzungsdaten der Plattform.",
      useTitle: "Verwendung der Daten",
      useText:
        "Die Daten dienen der Erbringung von Immobiliendienstleistungen, der Verwaltung von Objekten, der Einhaltung türkischer Rechtsvorschriften und der Verbesserung der Plattform.",
      rightsTitle: "Ihre Rechte",
      rightsText:
        "Sie können unter info@ataberkestate.com Auskunft, Berichtigung oder Löschung Ihrer personenbezogenen Daten verlangen.",
    },
    terms: {
      title: "Nutzungsbedingungen",
      updated: "Zuletzt aktualisiert: Juni 2026",
      intro:
        "Mit dem Zugriff auf die 1Çatı-Plattform akzeptieren Sie diese Bedingungen. Die Plattform wird von der WAMOCON GmbH im Auftrag von Ataberk Estate bereitgestellt.",
      useTitle: "Zulässige Nutzung",
      useText:
        "Nutzer müssen korrekte Angaben machen, ihre Zugangsdaten sicher aufbewahren und die Plattform nur für rechtmäßige Immobilien- und Verwaltungszwecke nutzen.",
      liabilityTitle: "Haftung",
      liabilityText:
        "Die Plattform unterstützt Entscheidungen, ersetzt aber keine Rechts-, Steuer- oder Anlageberatung. Ataberk Estate und WAMOCON haften nicht für auf Plattformdaten basierende Entscheidungen.",
      contactTitle: "Kontakt",
      contactText: "Bei Fragen zu diesen Bedingungen kontaktieren Sie info@ataberkestate.com.",
    },
  },
  ru: {
    privacy: {
      title: "Политика конфиденциальности",
      updated: "Последнее обновление: июнь 2026",
      intro:
        "Ataberk Estate и WAMOCON GmbH стремятся защищать ваши персональные данные. В этом документе описано, какие данные мы собираем, как используем и какие у вас есть права.",
      dataTitle: "Какие данные мы собираем",
      dataText:
        "Мы собираем контактные данные, предпочтения в недвижимости, документы, необходимые для сделок (копии паспортов, сканы TAPU), а также данные об использовании платформы.",
      useTitle: "Как мы используем данные",
      useText:
        "Данные используются для предоставления риелторских услуг, управления объектами, соблюдения требований турецкого законодательства и улучшения платформы.",
      rightsTitle: "Ваши права",
      rightsText:
        "Вы можете запросить доступ, исправление или удаление своих персональных данных, связавшись с info@ataberkestate.com.",
    },
    terms: {
      title: "Условия использования",
      updated: "Последнее обновление: июнь 2026",
      intro:
        "Получая доступ к платформе 1Çatı, вы соглашаетесь с этими условиями. Платформа предоставляется WAMOCON GmbH от имени Ataberk Estate.",
      useTitle: "Допустимое использование",
      useText:
        "Пользователи должны предоставлять достоверную информацию, надежно хранить учётные данные и использовать платформу только в законных целях недвижимости и управления объектами.",
      liabilityTitle: "Ответственность",
      liabilityText:
        "Платформа помогает принимать решения, но не заменяет юридические, налоговые или инвестиционные консультации. Ataberk Estate и WAMOCON не несут ответственности за решения, принятые на основе данных платформы.",
      contactTitle: "Контакт",
      contactText: "По вопросам об этих условиях обращайтесь на info@ataberkestate.com.",
    },
  },
}

for (const locale of locales) {
  const file = path.join(messagesDir, `${locale}.json`)
  const data = JSON.parse(fs.readFileSync(file, "utf8"))
  data.privacy = copy[locale].privacy
  data.terms = copy[locale].terms
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n")
  console.log(`Updated ${locale}.json`)
}
