import { NextRequest, NextResponse } from "next/server"

import { analyzePortalSession } from "@/lib/auth/employee-guard"
import { assertSameOrigin, OriginError } from "@/lib/auth/origin"
import { requireHttpsOrigins } from "@/lib/auth/session"
import {
  confirmPasswordResetWithToken,
  createPasswordResetRequest,
  dissolveWorkspaceLocal,
  getServerDataStore,
  LocalAuthError,
  markAccountEmailVerified,
  registerStaffLocal,
  syncAuthAccountFromProfileWrite,
  updateAccountPassword,
} from "@/lib/data/server-store"
import {
  DataError,
  type DataDocSnapshot,
  type DataDocument,
  type DataQueryOptions,
} from "@/lib/data/types"
import { UploadValidationError, validateUploadPayload } from "@/lib/data/upload-policy"

const globalVersionCache = globalThis as unknown as {
  __staffrailStoreVersion?: number
}

function currentVersion(): number {
  return globalVersionCache.__staffrailStoreVersion ?? 1
}

function bumpVersion(): number {
  globalVersionCache.__staffrailStoreVersion = currentVersion() + 1
  return globalVersionCache.__staffrailStoreVersion
}

function serializeSnapshot(snap: DataDocSnapshot) {
  return {
    id: snap.id,
    path: snap.path,
    exists: snap.exists(),
    data: snap.exists() ? snap.data() : undefined,
  }
}

function checkOrigin(request: NextRequest): void {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? ""
  assertSameOrigin({
    originHeader: request.headers.get("origin"),
    refererHeader: request.headers.get("referer"),
    host,
    requireHttps: requireHttpsOrigins({
      host,
      forwardedProto: request.headers.get("x-forwarded-proto"),
    }),
  })
}

type PathAccessMode = "read" | "create" | "mutate" | "upload"

function assertPathAccess(
  path: string,
  session: { uid: string; role: "admin" | "employee" },
  mode: PathAccessMode,
): void {
  const clean = path.split("/").filter(Boolean)
  if (clean.length === 0 || clean.some((seg) => seg === ".." || seg === "." || seg.includes("\\"))) {
    throw new DataError("invalid-argument", "Invalid document path.")
  }

  if (session.role === "admin") {
    return
  }

  const root = clean[0]
  if (root === "users") {
    const targetUid = clean[1]
    if (targetUid === session.uid) {
      return
    }
    // Allow employees to create notification entries for their manager/admin.
    if (mode === "create" && clean[2] === "notifications") {
      return
    }
    throw new DataError("permission-denied", "Access denied for another user's records.")
  }
  if (root === "profiles" && clean[1] === session.uid && (mode === "read" || mode === "upload")) {
    return
  }
  if (root === "messages" && (mode === "read" || mode === "create")) {
    return
  }
  if (root === "audit_logs" && mode === "create") {
    return
  }
  if (root === "training_templates" && mode === "read") {
    return
  }

  throw new DataError("permission-denied", "Insufficient permissions.")
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    checkOrigin(request)

    const contentType = request.headers.get("content-type") ?? ""
    if (contentType.includes("multipart/form-data")) {
      const session = await analyzePortalSession()
      if (session.status !== "authenticated") {
        return NextResponse.json(
          { code: "unauthenticated", error: "Sign in required." },
          { status: 401 },
        )
      }

      const form = await request.formData()
      const file = form.get("file")
      const rawPath = String(form.get("path") ?? "")
      const fileType = String(form.get("contentType") ?? "application/octet-stream")
      const rawMeta = String(form.get("metadata") ?? "{}")

      if (!(file instanceof Blob)) {
        return NextResponse.json(
          { code: "invalid-argument", error: "File payload is required." },
          { status: 400 },
        )
      }
      assertPathAccess(rawPath, session.context, "upload")

      let metadata: Record<string, string> = {}
      try {
        const parsed = JSON.parse(rawMeta) as unknown
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          metadata = Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
          )
        }
      } catch {
        metadata = {}
      }

      const bytes = new Uint8Array(await file.arrayBuffer())
      const validatedContentType = validateUploadPayload(rawPath, fileType, bytes.byteLength)
      const url = await getServerDataStore().uploadFile(
        rawPath,
        bytes,
        validatedContentType,
        metadata,
      )
      return NextResponse.json({ ok: true, url })
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body.op !== "string") {
      return NextResponse.json(
        { code: "invalid-argument", error: "Invalid request payload." },
        { status: 400 },
      )
    }

    // Unauthenticated self-service auth actions (forgot password / email verification)
    if (body.op === "action") {
      const action = String(body.action ?? "")
      if (action === "requestPasswordReset") {
        const email = String(body.email ?? "")
        const { resetToken } = await createPasswordResetRequest(email)
        return NextResponse.json({
          ok: true,
          demoResetPath: resetToken ? `/forgot-password?token=${encodeURIComponent(resetToken)}` : null,
        })
      }
      if (action === "confirmPasswordReset") {
        const token = String(body.token ?? "")
        const newPassword = String(body.newPassword ?? "")
        await confirmPasswordResetWithToken(token, newPassword)
        return NextResponse.json({ ok: true })
      }
      if (action === "verifyEmail") {
        const email = String(body.email ?? "")
        const password = String(body.password ?? "")
        const markVerified = body.markVerified === true
        if (markVerified) {
          const result = await markAccountEmailVerified(email, password)
          return NextResponse.json({ ok: true, ...result })
        }
        const { authenticateWithPassword } = await import("@/lib/data/server-store")
        const acct = await authenticateWithPassword(email, password)
        return NextResponse.json({
          ok: true,
          emailVerified: acct.emailVerified,
          email: acct.email,
        })
      }
    }

    const session = await analyzePortalSession()
    if (session.status !== "authenticated") {
      return NextResponse.json(
        { code: "unauthenticated", error: "Sign in required." },
        { status: 401 },
      )
    }
    const ctx = session.context
    const store = getServerDataStore()

    if (body.op === "action") {
      const action = String(body.action ?? "")
      if (action === "changePassword") {
        await updateAccountPassword(
          ctx.uid,
          String(body.currentPassword ?? ""),
          String(body.newPassword ?? ""),
        )
        return NextResponse.json({ ok: true })
      }
      if (action === "registerStaff") {
        if (ctx.role !== "admin") {
          throw new DataError("permission-denied", "Only admins can register staff.")
        }
        const result = await registerStaffLocal({
          adminUid: ctx.uid,
          email: String(body.email ?? ""),
          name: String(body.name ?? ""),
          role: typeof body.role === "string" ? body.role : "employee",
          webProvisioning: body.webProvisioning === true,
        })
        bumpVersion()
        return NextResponse.json({ ok: true, ...result })
      }
      if (action === "deleteAdminWorkspace") {
        if (ctx.role !== "admin") {
          throw new DataError("permission-denied", "Only admins can dissolve a workspace.")
        }
        const result = await dissolveWorkspaceLocal({
          adminUid: ctx.uid,
          password: String(body.password ?? ""),
        })
        bumpVersion()
        return NextResponse.json(result)
      }
      return NextResponse.json(
        { code: "invalid-argument", error: `Unknown action: ${action}` },
        { status: 400 },
      )
    }

    switch (body.op) {
      case "getDoc": {
        const path = String(body.path ?? "")
        assertPathAccess(path, ctx, "read")
        const snap = await store.getDoc(path)
        return NextResponse.json({
          snapshot: serializeSnapshot(snap),
          version: currentVersion(),
        })
      }
      case "getCollection": {
        const path = String(body.path ?? "")
        assertPathAccess(path, ctx, "read")
        const options = body.options as DataQueryOptions | undefined
        const snap = await store.getCollection(path, options)
        return NextResponse.json({ docs: snap.docs.map(serializeSnapshot) })
      }
      case "getCollectionGroup": {
        if (ctx.role !== "admin") {
          throw new DataError("permission-denied", "Collection group queries require admin role.")
        }
        const collectionId = String(body.collectionId ?? "")
        const options = body.options as DataQueryOptions | undefined
        const snap = await store.getCollectionGroup(collectionId, options)
        return NextResponse.json({ docs: snap.docs.map(serializeSnapshot) })
      }
      case "setDoc": {
        const path = String(body.path ?? "")
        assertPathAccess(path, ctx, "mutate")
        const data = (body.data ?? {}) as DataDocument
        const options = body.options as { merge?: boolean } | undefined
        await store.setDoc(path, data, options)
        syncAuthAccountFromProfileWrite(path, data)
        bumpVersion()
        return NextResponse.json({ ok: true })
      }
      case "updateDoc": {
        const path = String(body.path ?? "")
        assertPathAccess(path, ctx, "mutate")
        const data = (body.data ?? {}) as DataDocument
        await store.updateDoc(path, data)
        syncAuthAccountFromProfileWrite(path, data)
        bumpVersion()
        return NextResponse.json({ ok: true })
      }
      case "addDoc": {
        const collectionPath = String(body.collectionPath ?? "")
        assertPathAccess(collectionPath, ctx, "create")
        const data = (body.data ?? {}) as DataDocument
        const ref = await store.addDoc(collectionPath, data)
        bumpVersion()
        return NextResponse.json({ ref })
      }
      case "deleteDoc": {
        const path = String(body.path ?? "")
        assertPathAccess(path, ctx, "mutate")
        await store.deleteDoc(path)
        bumpVersion()
        return NextResponse.json({ ok: true })
      }
      case "commitTransaction": {
        const startVersion =
          typeof body.startVersion === "number" ? body.startVersion : null
        if (startVersion !== null && startVersion !== currentVersion()) {
          throw new DataError("aborted", "Concurrent modification detected.")
        }
        const ops = Array.isArray(body.ops)
          ? (body.ops as Array<{
              type: "set" | "update" | "delete"
              path: string
              data?: DataDocument
              options?: { merge?: boolean }
            }>)
          : []
        for (const op of ops) {
          assertPathAccess(op.path, ctx, "mutate")
        }
        await store.runTransaction(async (tx) => {
          for (const op of ops) {
            if (op.type === "set") {
              tx.set(op.path, op.data ?? {}, op.options)
            } else if (op.type === "update") {
              tx.update(op.path, op.data ?? {})
            } else if (op.type === "delete") {
              tx.delete(op.path)
            }
          }
        })
        for (const op of ops) {
          if ((op.type === "set" || op.type === "update") && op.data) {
            syncAuthAccountFromProfileWrite(op.path, op.data)
          }
        }
        bumpVersion()
        return NextResponse.json({ ok: true })
      }
      case "deleteFile": {
        const path = String(body.path ?? "")
        assertPathAccess(path, ctx, "mutate")
        await store.deleteFile(path)
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json(
          { code: "invalid-argument", error: "Unsupported operation." },
          { status: 400 },
        )
    }
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: 400 },
      )
    }
    if (error instanceof OriginError) {
      return NextResponse.json(
        { code: "permission-denied", error: error.message },
        { status: 403 },
      )
    }
    if (error instanceof LocalAuthError) {
      const status =
        error.code === "auth/invalid-credential" || error.code === "auth/wrong-password"
          ? 401
          : 400
      return NextResponse.json({ code: error.code, error: error.message }, { status })
    }
    if (error instanceof DataError) {
      const status =
        error.code === "permission-denied"
          ? 403
          : error.code === "not-found"
            ? 404
            : error.code === "aborted" || error.code === "already-exists"
              ? 409
              : error.code === "resource-exhausted"
                ? 429
                : 400
      return NextResponse.json({ code: error.code, error: error.message }, { status })
    }
    return NextResponse.json(
      {
        code: "internal",
        error: error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    )
  }
}
