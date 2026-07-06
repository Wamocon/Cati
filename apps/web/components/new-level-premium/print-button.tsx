"use client"

import { Printer } from "lucide-react"

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-lg transition hover:bg-primary/90 print:hidden"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  )
}
