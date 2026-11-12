import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { serverNow } from "@/lib/data/memory-store"
import type { DataStore } from "@/lib/data/types"

export type NotificationKind = "info" | "success" | "warning" | "error"

export interface TriggerNotificationInput {
  targetUserId: string
  title: string
  body: string
  type?: NotificationKind
  metadata?: Record<string, unknown>
  db?: DataStore
}

export async function triggerNotification({
  targetUserId,
  title,
  body,
  type = "info",
  metadata,
  db,
}: TriggerNotificationInput): Promise<void> {
  const uid = targetUserId.trim()
  if (!uid) {
    return
  }
  try {
    const store = db ?? getClientDataStore()
    await store.addDoc(
      `${DATA_COLLECTIONS.users}/${uid}/${DATA_COLLECTIONS.notifications}`,
      {
        userId: uid,
        title: title.trim(),
        body: body.trim(),
        type,
        isRead: false,
        timestamp: serverNow(),
        ...(metadata ? { metadata } : {}),
      },
    )
  } catch {
    // Best-effort notification delivery.
  }
}
