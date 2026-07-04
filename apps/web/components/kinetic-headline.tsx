"use client"

import { cn } from "@/lib/utils"
import { motion, type Variants, useReducedMotion } from "framer-motion"
import { Fragment } from "react"

interface KineticHeadlineProps {
  text: string
  className?: string
  highlight?: string
  highlightClassName?: string
}

export function KineticHeadline({ text, className, highlight, highlightClassName }: KineticHeadlineProps) {
  const reduced = useReducedMotion()
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

  if (reduced) {
    return (
      <h1 className={cn("perspective-1000 overflow-hidden", className)}>
        {words.map((word, index) => {
          const isHighlight = highlight && word.toLowerCase() === highlight.toLowerCase()
          return (
            <Fragment key={index}>
              <span className={cn("inline-block [overflow-wrap:anywhere]", isHighlight && highlightClassName)}>
                {word}
              </span>
              {index < words.length - 1 ? " " : null}
            </Fragment>
          )
        })}
      </h1>
    )
  }

  return (
    <motion.h1 className={cn("perspective-1000 overflow-hidden", className)} variants={container} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      {words.map((word, index) => {
        const isHighlight = highlight && word.toLowerCase() === highlight.toLowerCase()
        return (
          <Fragment key={index}>
            <motion.span
              variants={child}
              className={cn("inline-block origin-bottom [overflow-wrap:anywhere]", isHighlight && highlightClassName)}
            >
              {word}
            </motion.span>
            {index < words.length - 1 ? " " : null}
          </Fragment>
        )
      })}
    </motion.h1>
  )
}
