// Turkish overrides for English seed enum/status values that would otherwise
// leak untranslated on the default (tr) locale. Keys are the raw English seed
// values from site-management-data.ts (buyerGoal, districtCheck, documentType,
// status, risk, checklist nextAction). Turkish source strings are NOT listed
// here — they pass through unchanged via localizeBusinessCopy's `?? text`.
export const trCopy: Record<string, string> = {
  // buyerGoal
  investment: "Yatırım",
  holiday_home: "Tatil evi",
  residence: "Oturum izni",
  citizenship: "Vatandaşlık",
  // districtCheck
  clear: "Uygun",
  quota_review: "Kota incelemesi",
  restricted: "Kısıtlı",
  // documentType (KYC/TAPU/EIDS stay as acronyms)
  Reservation: "Rezervasyon",
  "Payment Plan": "Ödeme planı",
  "Sales Contract": "Satış sözleşmesi",
  // checklist status
  verified: "Doğrulandı",
  pending: "Beklemede",
  missing: "Eksik",
  rejected: "Reddedildi",
  // risk
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  // checklist owner roles
  Finance: "Finans",
  Compliance: "Uyum",
  "Legal partner": "Hukuk ortağı",
  "Listing admin": "İlan yöneticisi",
  // checklist / eligibility nextAction
  "Ready for payment-plan signature": "Ödeme planı imzasına hazır",
  "Collect buyer signature": "Alıcı imzasını topla",
  "Request passport and source-of-funds pack": "Pasaport ve fon kaynağı paketini iste",
  "Validate title deed pack before contract": "Sözleşmeden önce tapu paketini doğrula",
  "Keep listing authorization attached": "İlan yetki belgesini ekli tut",
  "Correct buyer name before reservation": "Rezervasyondan önce alıcı adını düzelt",
  "Proceed with reservation and ROI pack": "Rezervasyon ve ROI paketiyle devam et",
  "Check residence-zone status before promise": "Söz vermeden önce oturum bölgesi durumunu kontrol et",
  "Need appraisal and source-of-funds review": "Ekspertiz ve fon kaynağı incelemesi gerekli",
  "Do not promise residence suitability": "Oturum uygunluğu için söz verme",
  // service-order nextAction
  "Payment plan signature pending": "Ödeme planı imzası bekleniyor",
  "No blocker": "Engel yok",
}
