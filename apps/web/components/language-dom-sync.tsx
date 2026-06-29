"use client"

import { useEffect } from "react"

interface LanguageDomSyncProps {
  locale: string
}

export function LanguageDomSync({ locale }: LanguageDomSyncProps) {
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = "ltr"
  }, [locale])

  return null
}
