// @vitest-environment jsdom
/**
 * Signature pad — the web equivalent of the Flutter `AppSignaturePad`.
 *
 * jsdom has no canvas backend, so the 2D context and PNG export are stubbed;
 * the test still exercises the real pointer/confirm state machine and asserts
 * that the exported value is the base64 payload without the data-URL prefix.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { SignaturePad } from "@/components/admin/signature-pad"

let context: Record<string, ReturnType<typeof vi.fn>>

beforeEach(() => {
  context = {
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  }
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => context as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,ABC123",
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("SignaturePad", () => {
  it("keeps confirm disabled until ink exists, then exports base64 PNG", () => {
    const onConfirm = vi.fn()
    render(<SignaturePad onConfirm={onConfirm} />)

    const canvas = screen.getByTestId("signature-canvas")
    const confirm = screen.getByTestId("signature-confirm")
    expect(confirm).toBeDisabled()

    fireEvent.pointerDown(canvas, { clientX: 8, clientY: 8, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 24, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(canvas, { pointerId: 1 })

    expect(confirm).not.toBeDisabled()
    expect(context.lineTo).toHaveBeenCalledWith(24, 20)

    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith("ABC123")
  })

  it("clears the canvas and disables confirm again", () => {
    render(<SignaturePad onConfirm={vi.fn()} />)
    const canvas = screen.getByTestId("signature-canvas")
    const confirm = screen.getByTestId("signature-confirm")
    const clear = screen.getByTestId("signature-clear")

    fireEvent.pointerDown(canvas, { clientX: 4, clientY: 4, pointerId: 1 })
    expect(confirm).not.toBeDisabled()

    fireEvent.click(clear)
    expect(confirm).toBeDisabled()
  })

  it("disables both controls while submitting", () => {
    render(<SignaturePad onConfirm={vi.fn()} submitting />)

    expect(screen.getByTestId("signature-confirm")).toBeDisabled()
    expect(screen.getByTestId("signature-confirm")).toHaveTextContent("Verifying…")
    expect(screen.getByTestId("signature-clear")).toBeDisabled()
  })
})
