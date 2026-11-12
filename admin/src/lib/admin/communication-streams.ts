import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { toDateOrNull } from "@/lib/data/dates"
import type { DataStore, Unsubscribe } from "@/lib/data/types"
import type { NotificationKind } from "@/lib/admin/notification-actions"

export interface AppNotificationItem {
  id: string
  userId: string
  title: string
  body: string
  type: NotificationKind
  timestamp: Date
  isRead: boolean
  metadata?: Record<string, unknown>
}

export interface StaffMessageItem {
  id: string
  title: string
  content: string
  authorId: string
  authorName: string
  recipientId: string
  recipientName?: string
  timestamp: Date
  isPushEnabled: boolean
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function toDate(value: unknown): Date {
  return toDateOrNull(value) ?? new Date(0)
}

function normalizeNotificationKind(raw: unknown): NotificationKind {
  if (raw === "success" || raw === "warning" || raw === "error" || raw === "info") {
    return raw
  }
  return "info"
}

export function mapNotificationDoc(
  id: string,
  userId: string,
  data: Record<string, unknown>,
): AppNotificationItem {
  return {
    id,
    userId: asString(data.userId) || userId,
    title: asString(data.title) || "Notification",
    body: asString(data.body),
    type: normalizeNotificationKind(data.type),
    timestamp: toDate(data.timestamp ?? data.createdAt),
    isRead: data.isRead === true,
    metadata:
      data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
        ? (data.metadata as Record<string, unknown>)
        : undefined,
  }
}

export function mapMessageDoc(id: string, data: Record<string, unknown>): StaffMessageItem {
  return {
    id,
    title: asString(data.title) || "Message",
    content: asString(data.content),
    authorId: asString(data.authorId),
    authorName: asString(data.authorName) || "Management",
    recipientId: asString(data.recipientId) || "broadcast",
    recipientName: asString(data.recipientName) || undefined,
    timestamp: toDate(data.timestamp),
    isPushEnabled: data.isPushEnabled === true,
  }
}

export function subscribeUserNotifications(
  userId: string,
  onData: (items: AppNotificationItem[]) => void,
  onError?: (error: Error) => void,
  store?: DataStore,
): Unsubscribe {
  if (!userId.trim()) {
    onData([])
    return () => {}
  }

  try {
    const db = store ?? getClientDataStore()
    return db.subscribeCollection(
      `${DATA_COLLECTIONS.users}/${userId}/${DATA_COLLECTIONS.notifications}`,
      (snapshot) => {
        const mapped = snapshot.docs
          .map((snap) =>
            mapNotificationDoc(snap.id, userId, (snap.data() ?? {}) as Record<string, unknown>),
          )
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        onData(mapped)
      },
      (err) => {
        onError?.(err instanceof Error ? err : new Error(String(err)))
      },
      { limit: 200 },
    )
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)))
    return () => {}
  }
}

export function subscribeAdminMessages(
  adminUid: string,
  onData: (items: StaffMessageItem[]) => void,
  onError?: (error: Error) => void,
  store?: DataStore,
): Unsubscribe {
  if (!adminUid.trim()) {
    onData([])
    return () => {}
  }

  try {
    const db = store ?? getClientDataStore()
    return db.subscribeCollection(
      DATA_COLLECTIONS.messages,
      (snapshot) => {
        const mapped = snapshot.docs
          .map((snap) => mapMessageDoc(snap.id, (snap.data() ?? {}) as Record<string, unknown>))
          .filter(
            (msg) =>
              msg.recipientId === "broadcast" ||
              msg.authorId === adminUid ||
              msg.recipientId === adminUid,
          )
        onData(mapped)
      },
      (err) => {
        onError?.(err instanceof Error ? err : new Error(String(err)))
      },
      { orderBy: { field: "timestamp", direction: "desc" }, limit: 50 },
    )
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)))
    return () => {}
  }
}

export function subscribeEmployeeMessages(
  employeeUid: string,
  onData: (items: StaffMessageItem[]) => void,
  onError?: (error: Error) => void,
  store?: DataStore,
): Unsubscribe {
  if (!employeeUid.trim()) {
    onData([])
    return () => {}
  }

  try {
    const db = store ?? getClientDataStore()
    const byId = new Map<string, StaffMessageItem>()
    const sentIds = new Set<string>()
    const inboxIds = new Set<string>()

    const emit = () => {
      const sorted = Array.from(byId.values()).sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      )
      onData(sorted)
    }

    const unsubInbox = db.subscribeCollection(
      DATA_COLLECTIONS.messages,
      (snapshot) => {
        const nextIds = new Set<string>()
        for (const snap of snapshot.docs) {
          nextIds.add(snap.id)
          byId.set(snap.id, mapMessageDoc(snap.id, (snap.data() ?? {}) as Record<string, unknown>))
        }
        for (const prev of inboxIds) {
          if (!nextIds.has(prev) && !sentIds.has(prev)) {
            byId.delete(prev)
          }
        }
        inboxIds.clear()
        for (const id of nextIds) inboxIds.add(id)
        emit()
      },
      (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
      {
        filters: [{ field: "recipientId", op: "in", value: ["broadcast", employeeUid] }],
        limit: 50,
      },
    )

    const unsubSent = db.subscribeCollection(
      DATA_COLLECTIONS.messages,
      (snapshot) => {
        const nextIds = new Set<string>()
        for (const snap of snapshot.docs) {
          nextIds.add(snap.id)
          byId.set(snap.id, mapMessageDoc(snap.id, (snap.data() ?? {}) as Record<string, unknown>))
        }
        for (const prev of sentIds) {
          if (!nextIds.has(prev) && !inboxIds.has(prev)) {
            byId.delete(prev)
          }
        }
        sentIds.clear()
        for (const id of nextIds) sentIds.add(id)
        emit()
      },
      (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
      {
        filters: [{ field: "authorId", op: "==", value: employeeUid }],
        limit: 30,
      },
    )

    return () => {
      unsubInbox()
      unsubSent()
    }
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)))
    return () => {}
  }
}
