/**
 * Pure-Node PDF 1.4 document writer.
 *
 * Replaces `functions/src/pdf/simple-pdf.ts` inside the Next.js Node.js runtime
 * with zero native or external binary dependencies so audit PDF generation runs
 * natively without external cloud functions.
 */

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN_X = 48
const MARGIN_TOP = 52
const MARGIN_BOTTOM = 54
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2

export type PdfFontKey = "regular" | "bold" | "italic"

const FONT_RESOURCE: Record<PdfFontKey, string> = {
  regular: "F1",
  bold: "F2",
  italic: "F3",
}

const FONT_POSTSCRIPT: Record<string, string> = {
  F1: "Helvetica",
  F2: "Helvetica-Bold",
  F3: "Helvetica-Oblique",
}

export function sanitizePdfText(value: string): string {
  // Strip control characters except newline/tab, normalize smart punctuation to
  // WinAnsi/ASCII equivalents so standard Type1 Helvetica renders cleanly.
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "*")
    .replace(/\u00A0/g, " ")
    .replace(/\t/g, "  ")
    .replace(/[^\x20-\x7E\n\r]/g, "?")
}

export function escapePdfLiteral(value: string): string {
  return sanitizePdfText(value)
    .replace(/[\r\n]+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}

function estimateCharWidth(font: PdfFontKey, size: number): number {
  const factor = font === "bold" ? 0.58 : 0.5
  return size * factor
}

export function wrapPdfText(
  text: string,
  maxWidthPts: number,
  font: PdfFontKey,
  fontSize: number,
): string[] {
  const clean = sanitizePdfText(text)
  const avgChar = Math.max(2, estimateCharWidth(font, fontSize))
  const maxChars = Math.max(12, Math.floor(maxWidthPts / avgChar))
  const lines: string[] = []

  for (const rawParagraph of clean.split(/\r?\n/)) {
    const trimmed = rawParagraph.trimEnd()
    if (trimmed.length === 0) {
      lines.push("")
      continue
    }

    const words = trimmed.split(/\s+/)
    let current = ""
    for (const word of words) {
      if (word.length > maxChars) {
        if (current) {
          lines.push(current)
          current = ""
        }
        for (let i = 0; i < word.length; i += maxChars) {
          lines.push(word.slice(i, i + maxChars))
        }
        continue
      }
      const next = current ? `${current} ${word}` : word
      if (next.length <= maxChars) {
        current = next
      } else {
        if (current) {
          lines.push(current)
        }
        current = word
      }
    }
    if (current) {
      lines.push(current)
    }
  }

  return lines.length > 0 ? lines : [""]
}

interface TextStyle {
  font?: PdfFontKey
  size?: number
  color?: [number, number, number]
  lineHeight?: number
  indent?: number
  spaceAfter?: number
}

export class SimplePdfDocument {
  private readonly pages: string[][] = []
  private currentPage: string[] = []
  private cursorY = PAGE_HEIGHT - MARGIN_TOP
  private readonly footerText: string

  constructor(options: { footerText?: string } = {}) {
    this.footerText =
      options.footerText ?? "StaffRail — Confidential Compliance Audit Record"
    this.startPage()
  }

  private startPage(): void {
    this.currentPage = []
    this.pages.push(this.currentPage)
    this.cursorY = PAGE_HEIGHT - MARGIN_TOP
  }

  private ensureSpace(heightPts: number): void {
    if (this.cursorY - heightPts < MARGIN_BOTTOM) {
      this.startPage()
    }
  }

  private drawTextLine(
    text: string,
    x: number,
    y: number,
    font: PdfFontKey,
    size: number,
    color: [number, number, number],
  ): void {
    const [r, g, b] = color
    const resource = FONT_RESOURCE[font]
    this.currentPage.push(
      `BT ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg /${resource} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfLiteral(text)}) Tj ET`,
    )
  }

  addSpacer(heightPts = 10): void {
    this.cursorY -= heightPts
    if (this.cursorY < MARGIN_BOTTOM) {
      this.startPage()
    }
  }

  addDivider(spaceBefore = 4, spaceAfter = 10): void {
    this.addSpacer(spaceBefore)
    this.ensureSpace(8)
    const y = this.cursorY
    this.currentPage.push(
      `0.820 0.850 0.890 RG 0.75 w ${MARGIN_X} ${y.toFixed(2)} m ${(PAGE_WIDTH - MARGIN_X).toFixed(2)} ${y.toFixed(2)} l S`,
    )
    this.cursorY -= spaceAfter
  }

  addHeaderBanner(
    organization: string,
    title: string,
    subtitleLines: string[],
  ): void {
    const blockHeight = 56 + subtitleLines.length * 13
    this.ensureSpace(blockHeight)
    const topY = this.cursorY
    const rectBottom = topY - blockHeight
    // Light slate header box with deep navy border bar on the left.
    this.currentPage.push(
      `0.953 0.969 0.988 rg ${MARGIN_X} ${rectBottom.toFixed(2)} ${CONTENT_WIDTH} ${blockHeight.toFixed(2)} re f`,
    )
    this.currentPage.push(
      `0.098 0.255 0.451 rg ${MARGIN_X} ${rectBottom.toFixed(2)} 4 ${blockHeight.toFixed(2)} re f`,
    )

    let textY = topY - 18
    this.drawTextLine(organization, MARGIN_X + 14, textY, "bold", 10, [0.098, 0.255, 0.451])
    textY -= 17
    for (const line of wrapPdfText(title, CONTENT_WIDTH - 24, "bold", 13).slice(0, 2)) {
      this.drawTextLine(line, MARGIN_X + 14, textY, "bold", 13, [0.059, 0.090, 0.165])
      textY -= 15
    }
    for (const sub of subtitleLines) {
      this.drawTextLine(sub, MARGIN_X + 14, textY, "regular", 9, [0.278, 0.333, 0.412])
      textY -= 12
    }

    this.cursorY = rectBottom - 14
  }

  addSectionHeading(title: string): void {
    this.ensureSpace(26)
    this.cursorY -= 4
    this.drawTextLine(title, MARGIN_X, this.cursorY, "bold", 11, [0.098, 0.255, 0.451])
    this.cursorY -= 5
    this.currentPage.push(
      `0.780 0.835 0.902 RG 0.8 w ${MARGIN_X} ${this.cursorY.toFixed(2)} m ${(PAGE_WIDTH - MARGIN_X).toFixed(2)} ${this.cursorY.toFixed(2)} l S`,
    )
    this.cursorY -= 12
  }

  addParagraph(text: string, style: TextStyle = {}): void {
    const font = style.font ?? "regular"
    const size = style.size ?? 10
    const color = style.color ?? [0.118, 0.161, 0.231]
    const lineHeight = style.lineHeight ?? Math.round(size * 1.4)
    const indent = style.indent ?? 0
    const spaceAfter = style.spaceAfter ?? 6

    const lines = wrapPdfText(text, CONTENT_WIDTH - indent, font, size)
    for (const line of lines) {
      this.ensureSpace(lineHeight)
      if (line.length > 0) {
        this.drawTextLine(line, MARGIN_X + indent, this.cursorY, font, size, color)
      }
      this.cursorY -= lineHeight
    }
    this.cursorY -= spaceAfter
  }

  addBullet(text: string): void {
    const size = 9.5
    const lineHeight = 13.5
    const lines = wrapPdfText(text, CONTENT_WIDTH - 16, "regular", size)
    lines.forEach((line, index) => {
      this.ensureSpace(lineHeight)
      if (index === 0) {
        this.drawTextLine("*", MARGIN_X + 4, this.cursorY, "bold", size, [0.098, 0.255, 0.451])
      }
      this.drawTextLine(line, MARGIN_X + 16, this.cursorY, "regular", size, [0.118, 0.161, 0.231])
      this.cursorY -= lineHeight
    })
    this.cursorY -= 3
  }

  addCallout(label: string, body: string, tone: "warning" | "info" = "info"): void {
    const bg: [number, number, number] = tone === "warning" ? [0.996, 0.949, 0.949] : [0.945, 0.961, 0.976]
    const accent: [number, number, number] = tone === "warning" ? [0.725, 0.110, 0.110] : [0.098, 0.255, 0.451]
    const wrapped = wrapPdfText(body, CONTENT_WIDTH - 24, "regular", 9.5)
    const height = 24 + wrapped.length * 13
    this.ensureSpace(height + 6)
    const topY = this.cursorY
    const bottomY = topY - height
    this.currentPage.push(
      `${bg[0]} ${bg[1]} ${bg[2]} rg ${MARGIN_X} ${bottomY.toFixed(2)} ${CONTENT_WIDTH} ${height.toFixed(2)} re f`,
    )
    this.currentPage.push(
      `${accent[0]} ${accent[1]} ${accent[2]} rg ${MARGIN_X} ${bottomY.toFixed(2)} 3 ${height.toFixed(2)} re f`,
    )
    let y = topY - 14
    this.drawTextLine(label, MARGIN_X + 12, y, "bold", 9.5, accent)
    y -= 14
    for (const line of wrapped) {
      this.drawTextLine(line, MARGIN_X + 12, y, "regular", 9.5, [0.118, 0.161, 0.231])
      y -= 13
    }
    this.cursorY = bottomY - 10
  }

  addKeyValueRows(rows: Array<{ label: string; value: string }>): void {
    const labelColWidth = 185
    const valueColWidth = CONTENT_WIDTH - labelColWidth - 12

    for (const row of rows) {
      const labelLines = wrapPdfText(row.label, labelColWidth - 8, "bold", 9)
      const valueLines = wrapPdfText(row.value || "-", valueColWidth, "regular", 9.5)
      const rowLines = Math.max(labelLines.length, valueLines.length)
      const rowHeight = rowLines * 13 + 6

      this.ensureSpace(rowHeight)
      const startY = this.cursorY
      for (let i = 0; i < labelLines.length; i++) {
        this.drawTextLine(
          labelLines[i],
          MARGIN_X + 4,
          startY - i * 13,
          "bold",
          9,
          [0.278, 0.333, 0.412],
        )
      }
      for (let i = 0; i < valueLines.length; i++) {
        this.drawTextLine(
          valueLines[i],
          MARGIN_X + labelColWidth + 12,
          startY - i * 13,
          "regular",
          9.5,
          [0.059, 0.090, 0.165],
        )
      }
      this.cursorY = startY - rowHeight + 2
      this.currentPage.push(
        `0.925 0.941 0.961 RG 0.5 w ${MARGIN_X} ${(this.cursorY + 3).toFixed(2)} m ${(PAGE_WIDTH - MARGIN_X).toFixed(2)} ${(this.cursorY + 3).toFixed(2)} l S`,
      )
      this.cursorY -= 3
    }
    this.addSpacer(4)
  }

  toBuffer(): Buffer {
    const pageCount = this.pages.length
    const finalPages = this.pages.map((commands, index) => {
      const footerY = 26
      const footerLeft = `BT 0.450 0.500 0.570 rg /F1 8 Tf ${MARGIN_X} ${footerY} Td (${escapePdfLiteral(this.footerText)}) Tj ET`
      const pageLabel = `Page ${index + 1} of ${pageCount}`
      const footerRightX = PAGE_WIDTH - MARGIN_X - pageLabel.length * 4.5
      const footerRight = `BT 0.450 0.500 0.570 rg /F1 8 Tf ${footerRightX.toFixed(2)} ${footerY} Td (${escapePdfLiteral(pageLabel)}) Tj ET`
      return [...commands, footerLeft, footerRight].join("\n")
    })

    // Objects layout:
    // 1: Catalog
    // 2: Pages
    // 3..5: Standard Fonts F1, F2, F3
    // Then for each page i: Content object, Page object
    const objects: string[] = []
    const fontIds = [3, 4, 5]
    const pageObjIds: number[] = []
    const firstPageObjIndex = 6

    finalPages.forEach((_, idx) => {
      pageObjIds.push(firstPageObjIndex + idx * 2 + 1)
    })

    objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objects.push(
      `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>\nendobj\n`,
    )

    const fontKeys = Object.keys(FONT_POSTSCRIPT)
    fontKeys.forEach((key, idx) => {
      const id = fontIds[idx]
      objects.push(
        `${id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /${FONT_POSTSCRIPT[key]} /Encoding /WinAnsiEncoding >>\nendobj\n`,
      )
    })

    finalPages.forEach((stream, idx) => {
      const contentId = firstPageObjIndex + idx * 2
      const pageId = contentId + 1
      const streamBytes = Buffer.byteLength(stream, "latin1")
      objects.push(
        `${contentId} 0 obj\n<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream\nendobj\n`,
      )
      objects.push(
        `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
      )
    })

    const header = "%PDF-1.4\n%SR\n"
    const chunks: Buffer[] = [Buffer.from(header, "latin1")]
    const offsets: number[] = [0]
    let cursor = chunks[0].length

    for (const obj of objects) {
      offsets.push(cursor)
      const buf = Buffer.from(obj, "latin1")
      chunks.push(buf)
      cursor += buf.length
    }

    const xrefOffset = cursor
    const xrefLines: string[] = [
      `xref`,
      `0 ${offsets.length}`,
      `0000000000 65535 f `,
      ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    ]
    const trailer = [
      "trailer",
      `<< /Size ${offsets.length} /Root 1 0 R >>`,
      "startxref",
      String(xrefOffset),
      "%%EOF",
      "",
    ]
    chunks.push(Buffer.from(`${xrefLines.join("\n")}\n${trailer.join("\n")}`, "latin1"))
    return Buffer.concat(chunks)
  }
}
