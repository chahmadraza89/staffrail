"use client"

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { Check, Eraser } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Reviewer signature pad — web equivalent of the Flutter `AppSignaturePad`.
 * Exports a white-background PNG as base64 (the exact value the Flutter
 * service stores in `adminSignature`).
 *
 * Pointer capture keeps a stroke alive when the pointer leaves the canvas.
 * Drawing is disabled while a decision is being submitted.
 */
export function SignaturePad({
  onConfirm,
  submitting = false,
  disabled = false,
}: {
  onConfirm: (base64Png: string) => void
  submitting?: boolean
  disabled?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    let context: CanvasRenderingContext2D | null = null
    try {
      context = canvas.getContext("2d")
    } catch {
      // jsdom without the optional `canvas` package: leave the pad inert.
      return
    }
    if (!context) {
      return
    }

    const ratio = window.devicePixelRatio || 1
    const width = canvas.clientWidth || 600
    const height = 180
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, width, height)
    context.strokeStyle = "#0f172a"
    context.lineWidth = 2.5
    context.lineCap = "round"
    context.lineJoin = "round"
  }, [])

  const context = (): CanvasRenderingContext2D | null => {
    try {
      return canvasRef.current?.getContext("2d") ?? null
    } catch {
      return null
    }
  }

  const pointFrom = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || submitting) {
      return
    }
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const ctx = context()
    if (!ctx) {
      return
    }
    const point = pointFrom(event)
    drawingRef.current = true
    lastPointRef.current = point
    ctx.beginPath()
    ctx.arc(point.x, point.y, 1.25, 0, Math.PI * 2)
    ctx.fillStyle = "#0f172a"
    ctx.fill()
    setHasInk(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled || submitting) {
      return
    }
    const ctx = context()
    const previous = lastPointRef.current
    if (!ctx || !previous) {
      return
    }
    const point = pointFrom(event)
    ctx.beginPath()
    ctx.moveTo(previous.x, previous.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPointRef.current = point
  }

  const endStroke = () => {
    drawingRef.current = false
    lastPointRef.current = null
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = context()
    if (canvas && ctx) {
      const ratio = window.devicePixelRatio || 1
      const width = canvas.width / ratio
      const height = canvas.height / ratio
      ctx.save()
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }
    setHasInk(false)
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasInk || disabled || submitting) {
      return
    }
    try {
      const dataUrl = canvas.toDataURL("image/png")
      const base64 = dataUrl.split(",")[1]
      if (base64) {
        onConfirm(base64)
      }
    } catch {
      // A missing/blocked canvas backend cannot produce a signature; the
      // reviewer can clear and try again.
      setHasInk(false)
    }
  }

  return (
    <div className="space-y-3" data-testid="signature-pad">
      <div className="rounded-xl border bg-white p-1">
        <canvas
          ref={canvasRef}
          data-testid="signature-canvas"
          aria-label="Reviewer signature"
          className="h-[180px] w-full touch-none rounded-lg bg-white"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Draw your signature in the box. A signature is required before the
        clearance can be verified.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="signature-clear"
          onClick={handleClear}
          disabled={!hasInk || submitting}
        >
          <Eraser className="mr-1.5 size-3.5" />
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          data-testid="signature-confirm"
          onClick={handleConfirm}
          disabled={!hasInk || submitting || disabled}
        >
          <Check className="mr-1.5 size-3.5" />
          {submitting ? "Verifying…" : "Confirm signature"}
        </Button>
      </div>
    </div>
  )
}
