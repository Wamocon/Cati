"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useSpring, useTransform, motion } from "framer-motion"

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
  duration = 1.5,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 })
  const display = useTransform(spring, (current) => Math.floor(current).toLocaleString("tr-TR"))
  const [displayValue, setDisplayValue] = useState("0")

  useEffect(() => {
    if (isInView) {
      spring.set(value)
    }
  }, [isInView, spring, value])

  useEffect(() => {
    return display.on("change", (v) => setDisplayValue(v))
  }, [display])

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {prefix}
      {displayValue}
      {suffix}
    </motion.span>
  )
}
