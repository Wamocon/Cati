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
      transition: { staggerChildren: 0.035, delayChildren: 0.025 * i },
    }),
  }

  const child: Variants = {
    hidden: {
      opacity: 0,
      y: 10,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.28,
        ease: "easeOut",
      },
    },
  }

  if (reduced) {
    return (
      <h1 className={cn("kinetic-headline perspective-1000 overflow-visible", className)}>
        {words.map((word, index) => {
          const isHighlight = highlight && word.toLowerCase() === highlight.toLowerCase()
          return (
            <Fragment key={index}>
              <span className={cn("inline-block", isHighlight && highlightClassName)}>
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
    <motion.h1
      className={cn("kinetic-headline perspective-1000 overflow-visible", className)}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => {
        const isHighlight = highlight && word.toLowerCase() === highlight.toLowerCase()
        return (
          <Fragment key={index}>
            <motion.span
              variants={child}
              className={cn("inline-block origin-bottom", isHighlight && highlightClassName)}
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
