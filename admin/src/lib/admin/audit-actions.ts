import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { toDateOrNull } from "@/lib/data/dates"
import { serverNow } from "@/lib/data/memory-store"
import type { DataStore, Unsubscribe } from "@/lib/data/types"

export interface AuditLogEntry {
  id: string
  actorId: string
  actorName: string
  actionType: string
  targetId: string
  description: string
  metadata: Record<string, unknown>
  timestamp: Date | null
  platform?: string
}

export interface LogAuditActionInput {
  actorId: string
  actorName: string
  actionType: string
  targetId: string
  description: string
  metadata?: Record<string, unknown>
  db?: DataStore
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function mapAuditLogDoc(id: string, data: Record<string, unknown>): AuditLogEntry {
  const actorId = asString(data.actorId) || asString(data.uid)
  const actorName = asString(data.actorName) || actorId || "System"
  const actionType = asString(data.actionType) || asString(data.action) || "AUDIT_EVENT"
  const targetId = asString(data.targetId) || asString(data.taskId)
  const rawDetails = asString(data.description) || asString(data.details)
  const metadata =
    data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : {}

  return {
    id,
    actorId,
    actorName,
    actionType,
    targetId,
    description: rawDetails || actionType,
    metadata,
    timestamp: toDateOrNull(data.timestamp),
    platform: asString(data.platform) || undefined,
  }
}

export async function logAuditAction({
  actorId,
  actorName,
  actionType,
  targetId,
  description,
  metadata = {},
  db,
}: LogAuditActionInput): Promise<void> {
  try {
    const store = db ?? getClientDataStore()
    await store.addDoc(DATA_COLLECTIONS.auditLogs, {
      actorId,
      actorName,
      actionType,
      targetId,
      description,
      metadata,
      platform: "web",
      timestamp: serverNow(),
    })
  } catch {
    // Non-blocking audit logging.
  }
}

export function subscribeAuditLogs(
  options: {
    actorId?: string
    maxEntries?: number
    db?: DataStore
  },
  onData: (entries: AuditLogEntry[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  try {
    const store = options.db ?? getClientDataStore()
    const maxRows = options.maxEntries ?? 100
    return store.subscribeCollection(
      DATA_COLLECTIONS.auditLogs,
      (snapshot) => {
        const items = snapshot.docs.map((snap) =>
          mapAuditLogDoc(snap.id, (snap.data() ?? {}) as Record<string, unknown>),
        )
        onData(items)
      },
      (err) => {
        onError?.(err instanceof Error ? err : new Error(String(err)))
      },
      {
        filters: options.actorId
          ? [{ field: "actorId", op: "==", value: options.actorId }]
          : undefined,
        orderBy: { field: "timestamp", direction: "desc" },
        limit: maxRows,
      },
    )
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)))
    return () => {}
  }
}
