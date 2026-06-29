"use client"

import { useEffect, useRef } from "react"

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasGradient
) {
  roundedRect(ctx, x, y, width, height, radius)
  ctx.fillStyle = fillStyle
  ctx.fill()
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeStyle: string,
  lineWidth = 1
) {
  roundedRect(ctx, x, y, width, height, radius)
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  alpha: number
) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.ellipse(x, y + 18, width * 0.38, 28, 0, 0, Math.PI * 2)
  ctx.ellipse(x + width * 0.24, y + 10, width * 0.3, 34, 0, 0, Math.PI * 2)
  ctx.ellipse(x + width * 0.48, y + 22, width * 0.34, 25, 0, 0, Math.PI * 2)
  ctx.ellipse(x + width * 0.74, y + 25, width * 0.28, 20, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawStream(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  progress: number,
  color: string
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.setLineDash([8, 10])
  ctx.lineDashOffset = -progress * 40
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.bezierCurveTo((x1 + x2) / 2, y1 - 24, (x1 + x2) / 2, y2 + 24, x2, y2)
  ctx.stroke()
  ctx.restore()
}

function drawModuleCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  accent: string,
  frame: number
) {
  fillRoundedRect(ctx, x, y, width, 78, 12, "rgba(255,255,255,0.78)")
  strokeRoundedRect(ctx, x, y, width, 78, 12, "rgba(6,107,99,0.15)")

  fillRoundedRect(ctx, x + 14, y + 16, 30, 30, 8, `${accent}22`)
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(x + 29, y + 31, 7 + Math.sin(frame * Math.PI * 2) * 1.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "rgba(16,24,32,0.68)"
  ctx.font = "700 11px Segoe UI, sans-serif"
  ctx.fillText(label, x + 56, y + 26)
  ctx.fillStyle = "#101820"
  ctx.font = "900 22px Segoe UI, sans-serif"
  ctx.fillText(value, x + 56, y + 54)

  fillRoundedRect(ctx, x + width - 48, y + 20, 26, 8, 99, `${accent}33`)
  fillRoundedRect(ctx, x + width - 48, y + 36, 36, 8, 99, "rgba(16,24,32,0.08)")
  fillRoundedRect(ctx, x + width - 48, y + 52, 22, 8, 99, "rgba(16,24,32,0.08)")
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  frame: number,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height)

  const sky = ctx.createLinearGradient(0, 0, width, height)
  sky.addColorStop(0, "#f7fbff")
  sky.addColorStop(0.42, "#e9f4f1")
  sky.addColorStop(1, "#fff5df")
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(width * 0.5, height * 0.26, 20, width * 0.5, height * 0.26, width * 0.58)
  glow.addColorStop(0, "rgba(50,214,189,0.32)")
  glow.addColorStop(0.46, "rgba(226,183,93,0.16)")
  glow.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  drawCloud(ctx, width * 0.05 + frame * 18, height * 0.16, width * 0.35, 0.52)
  drawCloud(ctx, width * 0.58 - frame * 16, height * 0.09, width * 0.4, 0.48)
  drawCloud(ctx, width * 0.22 - frame * 10, height * 0.76, width * 0.48, 0.5)

  const floatY = Math.sin(frame * Math.PI * 2) * 10
  const tilt = (frame - 0.5) * 10
  const panelX = width * 0.16
  const panelY = height * 0.16 + floatY
  const panelW = width * 0.68
  const panelH = height * 0.58

  ctx.save()
  ctx.translate(panelX + panelW / 2, panelY + panelH / 2)
  ctx.rotate((tilt * Math.PI) / 180)
  ctx.translate(-(panelX + panelW / 2), -(panelY + panelH / 2))

  ctx.shadowColor = "rgba(6,107,99,0.22)"
  ctx.shadowBlur = 34
  ctx.shadowOffsetY = 24
  fillRoundedRect(ctx, panelX, panelY, panelW, panelH, 20, "rgba(255,255,255,0.88)")
  ctx.shadowColor = "transparent"
  strokeRoundedRect(ctx, panelX, panelY, panelW, panelH, 20, "rgba(6,107,99,0.16)", 1.4)

  fillRoundedRect(ctx, panelX, panelY, panelW, 58, 20, "rgba(6,107,99,0.08)")
  fillRoundedRect(ctx, panelX + 22, panelY + 18, 86, 22, 99, "#066b63")
  ctx.fillStyle = "#ffffff"
  ctx.font = "900 12px Segoe UI, sans-serif"
  ctx.fillText("1CATI ERP", panelX + 37, panelY + 33)

  fillRoundedRect(ctx, panelX + panelW - 170, panelY + 17, 116, 24, 99, "rgba(50,214,189,0.18)")
  ctx.fillStyle = "#066b63"
  ctx.font = "800 11px Segoe UI, sans-serif"
  ctx.fillText("LIVE WORKSPACE", panelX + panelW - 154, panelY + 33)

  const cardW = (panelW - 70) / 2
  drawModuleCard(ctx, panelX + 22, panelY + 86, cardW, "PORTFOLIO", "769", "#066b63", frame)
  drawModuleCard(ctx, panelX + 48 + cardW, panelY + 86, cardW, "SERVICE SLA", "4", "#d97706", frame)
  drawModuleCard(ctx, panelX + 22, panelY + 184, cardW, "COLLECTION", "1.4M", "#0ea5e9", frame)
  drawModuleCard(ctx, panelX + 48 + cardW, panelY + 184, cardW, "COMPLIANCE", "99%", "#10b981", frame)

  const chartX = panelX + 22
  const chartY = panelY + 292
  fillRoundedRect(ctx, chartX, chartY, panelW - 44, 92, 14, "rgba(238,243,241,0.8)")
  for (let index = 0; index < 7; index += 1) {
    const barHeight = 22 + Math.sin(frame * Math.PI * 2 + index) * 8 + index * 4
    fillRoundedRect(
      ctx,
      chartX + 22 + index * ((panelW - 94) / 7),
      chartY + 68 - barHeight,
      18,
      barHeight,
      5,
      index % 2 === 0 ? "#066b63" : "#b9822b"
    )
  }
  ctx.restore()

  drawStream(ctx, width * 0.08, height * 0.38, width * 0.17, height * 0.4, frame, "rgba(6,107,99,0.5)")
  drawStream(ctx, width * 0.92, height * 0.48, width * 0.82, height * 0.46, frame, "rgba(185,130,43,0.5)")
  drawStream(ctx, width * 0.47, height * 0.88, width * 0.52, height * 0.74, frame, "rgba(14,165,233,0.4)")

  const badgeY = height * 0.74 + Math.sin(frame * Math.PI * 2 + 0.5) * 6
  fillRoundedRect(ctx, width * 0.58, badgeY, width * 0.3, 48, 14, "rgba(255,255,255,0.74)")
  strokeRoundedRect(ctx, width * 0.58, badgeY, width * 0.3, 48, 14, "rgba(6,107,99,0.12)")
  ctx.fillStyle = "#066b63"
  ctx.font = "900 12px Segoe UI, sans-serif"
  ctx.fillText("ROLE-BASED ACCESS", width * 0.61, badgeY + 29)
}

export function ErpProductCloud({ className = "" }: { className?: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrapperElement = wrapperRef.current
    const canvasElement = canvasRef.current
    const context = canvasElement?.getContext("2d")
    if (!wrapperElement || !canvasElement || !context) return

    const wrapper = wrapperElement
    const canvas = canvasElement
    const ctx = context

    let width = 0
    let height = 0
    let raf = 0
    let cleanupGsap: (() => void) | undefined
    const frame = { value: 0.18 }

    function render() {
      drawScene(ctx, frame.value, width, height)
    }

    function resize() {
      const rect = wrapper.getBoundingClientRect()
      width = Math.max(rect.width, 320)
      height = Math.max(rect.height, 360)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      render()
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(wrapper)

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) {
      frame.value = 0.4
      render()
    } else {
      const introStartedAt = performance.now()
      const intro = (now: number) => {
        const progress = Math.min((now - introStartedAt) / 1200, 1)
        frame.value = 0.18 + progress * 0.18
        render()
        if (progress < 1) raf = requestAnimationFrame(intro)
      }
      raf = requestAnimationFrame(intro)

      void (async () => {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ])
        gsap.registerPlugin(ScrollTrigger)
        const introTween = gsap.fromTo(
          canvas,
          { opacity: 0, y: 28, rotateX: 8 },
          { opacity: 1, y: 0, rotateX: 0, duration: 0.9, ease: "power3.out" }
        )
        const scrubTween = gsap.to(frame, {
          value: 1,
          ease: "none",
          scrollTrigger: {
            trigger: wrapper,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
          onUpdate: render,
        })

        cleanupGsap = () => {
          introTween.kill()
          scrubTween.scrollTrigger?.kill()
          scrubTween.kill()
        }
      })().catch(() => {
        render()
      })
    }

    return () => {
      cancelAnimationFrame(raf)
      cleanupGsap?.()
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      className={`relative h-[390px] overflow-hidden rounded-2xl border border-white/70 bg-white/40 shadow-[0_26px_90px_rgba(6,107,99,0.18)] backdrop-blur md:h-[520px] ${className}`}
      aria-label="Animated ERP workspace preview"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/60" />
    </div>
  )
}
