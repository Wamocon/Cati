import { MailCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  className?: string
}

export function GoogleLogo({ className }: BrandLogoProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 18 18"
      className={cn("h-5 w-5", className)}
    >
      <path
        fill="#4285f4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.909c1.702-1.567 2.683-3.875 2.683-6.616Z"
      />
      <path
        fill="#34a853"
        d="M9 18c2.43 0 4.467-.806 5.957-2.18l-2.909-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#fbbc05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.957H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.043l3.007-2.332Z"
      />
      <path
        fill="#ea4335"
        d="M9 3.58c1.322 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.957L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  )
}

export function YandexLogo({ className }: BrandLogoProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", className)}
    >
      <circle cx="12" cy="12" r="12" fill="#fc3f1d" />
      <path
        fill="#fff"
        d="M13.32 18.8h-2.18v-5.36H9.92L7.02 18.8H4.6l3.2-5.84a4.27 4.27 0 0 1-2.03-1.5 4.07 4.07 0 0 1-.72-2.43c0-1.24.43-2.22 1.3-2.94.86-.72 2.04-1.08 3.54-1.08h3.43V18.8Zm-2.18-7.1V6.84H9.98c-.86 0-1.52.19-1.98.57-.46.38-.69.94-.69 1.67 0 .78.22 1.39.67 1.82.45.53 1.1.8 1.95.8h1.21Z"
      />
    </svg>
  )
}

export function MagicLinkLogo({ className }: BrandLogoProps) {
  return <MailCheck aria-hidden="true" className={cn("h-5 w-5", className)} />
}
