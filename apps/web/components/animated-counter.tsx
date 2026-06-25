interface AnimatedCounterProps {
  value: number
  suffix?: string
  prefix?: string
  className?: string
  duration?: number
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  className = "",
}: AnimatedCounterProps) {
  return (
    <span className={className}>
      {prefix}
      {Math.floor(value).toLocaleString("tr-TR")}
      {suffix}
    </span>
  )
}
