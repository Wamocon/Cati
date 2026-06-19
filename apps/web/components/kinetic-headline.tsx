"use client"

import { cn } from "@/lib/utils"
import { motion, type Variants } from "framer-motion"

interface KineticHeadlineProps {
  text: string
  className?: string
  highlight?: string
  highlightClassName?: string
}

export function KineticHeadline({
  text,
  className,
  highlight,
  highlightClassName,
}: KineticHeadlineProps) {
  const words = text.split(" ")

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.04 * i },
    }),
  }

  const child: Variants = {
    hidden: {
      opacity: 0,
      y: 24,
      rotateX: -45,
    },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        damping: 18,
        stiffness: 120,
      },
    },
  }

  return (
    <motion.h1
      className={cn("perspective-1000 overflow-hidden", className)}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {words.map((word, index) => {
        const isHighlight =
          highlight && word.toLowerCase() === highlight.toLowerCase()
        return (
          <motion.span
            key={index}
            variants={child}
            className={cn(
              "mr-[0.25em] inline-block origin-bottom",
              isHighlight && highlightClassName
            )}
          >
            {word}
          </motion.span>
        )
      })}
    </motion.h1>
  )
}
