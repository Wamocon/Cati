import { cn } from "@/lib/utils"

interface Card3DProps {
  children: React.ReactNode
  className?: string
  innerClassName?: string
  glow?: boolean
}

export function Card3D({ children, className, innerClassName, glow = true }: Card3DProps) {
  return (
    <div className={cn("group min-w-0", className)}>
      <div
        className={cn(
          "premium-surface relative isolate min-w-0 overflow-hidden rounded-xl p-5 transition-colors duration-150",
          glow && "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-primary/20",
          innerClassName
        )}
      >
        {glow && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/15" />
        )}
        <div className="relative z-10 min-w-0">{children}</div>
      </div>
    </div>
  )
}
