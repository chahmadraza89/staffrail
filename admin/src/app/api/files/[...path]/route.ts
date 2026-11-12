import { NextRequest, NextResponse } from "next/server"

import { analyzePortalSession } from "@/lib/auth/employee-guard"
import { getServerDataStore } from "@/lib/data/server-store"
import {
  INLINE_SAFE_MIME_TYPES,
  sanitizeContentDispositionFilename,
} from "@/lib/data/upload-policy"

function canReadStoredFile(
  segments: readonly string[],
  session: { uid: string; role: "admin" | "employee" },
): boolean {
  if (session.role === "admin") {
    return true
  }
  const [root, ownerId] = segments
  if (root === "demo") {
    return true
  }
  if ((root === "users" || root === "profiles") && ownerId === session.uid) {
    return true
  }
  return false
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const session = await analyzePortalSession()
  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { path } = await context.params
  if (!Array.isArray(path) || path.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let decodedSegments: string[]
  try {
    decodedSegments = path.map((seg) => decodeURIComponent(seg))
  } catch {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  if (
    decodedSegments.some(
      (seg) => seg.length === 0 || seg === ".." || seg === "." || seg.includes("\\") || seg.includes("/"),
    )
  ) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  if (!canReadStoredFile(decodedSegments, session.context)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const normalizedPath = decodedSegments.join("/")
  const file = getServerDataStore().getFile(normalizedPath)
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = new Uint8Array(file.bytes.length)
  body.set(file.bytes)

  const safeName = sanitizeContentDispositionFilename(
    decodedSegments[decodedSegments.length - 1] ?? "file",
  )
  const disposition = INLINE_SAFE_MIME_TYPES.has(file.contentType.toLowerCase())
    ? "inline"
    : "attachment"

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  })
}
