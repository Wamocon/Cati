const fs = require("fs")
const path = require("path")

const locales = ["en", "tr", "de", "ru"]
const messagesDir = path.join(__dirname, "..", "apps", "web", "messages")

const copy = {
  en: {
    comingSoon: "Coming soon",
    recentActivity: "Recent activity",
    permissionsTitle: "Your access",
    permissionsSubtitle: "Modules visible for your role",
  },
  tr: {
    comingSoon: "Yakında",
    recentActivity: "Son aktivite",
    permissionsTitle: "Erişiminiz",
    permissionsSubtitle: "Rolünüze göre görünen modüller",
  },
  de: {
    comingSoon: "Demnächst",
    recentActivity: "Letzte Aktivität",
    permissionsTitle: "Ihr Zugriff",
    permissionsSubtitle: "Für Ihre Rolle sichtbare Module",
  },
  ru: {
    comingSoon: "Скоро",
    recentActivity: "Последняя активность",
    permissionsTitle: "Ваш доступ",
    permissionsSubtitle: "Модули, видимые для вашей роли",
  },
}

for (const locale of locales) {
  const file = path.join(messagesDir, `${locale}.json`)
  const data = JSON.parse(fs.readFileSync(file, "utf8"))
  Object.assign(data.dashboard, copy[locale])
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n")
  console.log(`Updated ${locale}.json`)
}
