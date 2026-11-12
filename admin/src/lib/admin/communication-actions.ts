import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { serverNow } from "@/lib/data/memory-store"
import type { DataStore } from "@/lib/data/types"
import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { logAuditAction } from "@/lib/admin/audit-actions"
import { triggerNotification } from "@/lib/admin/notification-actions"

export interface PublishMessageInput {
  title: string
  content: string
  authorId: string
  authorName: string
  recipientId: string
  recipientName?: string
  isPushEnabled?: boolean
  broadcastRecipientUids?: string[]
  db?: DataStore
}

export async function publishStaffMessage({
  title,
  content,
  authorId,
  authorName,
  recipientId,
  recipientName,
  isPushEnabled = true,
  broadcastRecipientUids = [],
  db,
}: PublishMessageInput): Promise<string> {
  const cleanTitle = title.trim()
  const cleanContent = content.trim()
  const cleanAuthor = authorId.trim()
  const cleanRecipient = recipientId.trim()

  if (!cleanTitle) {
    throw new EmployeeActionError("Message subject/title is required.", "invalid-argument")
  }
  if (!cleanContent) {
    throw new EmployeeActionError("Message body cannot be empty.", "invalid-argument")
  }
  if (!cleanAuthor || !cleanRecipient) {
    throw new EmployeeActionError("Sender and recipient identifiers are required.", "invalid-argument")
  }

  const store = db ?? getClientDataStore()
  const docRef = await store.addDoc(DATA_COLLECTIONS.messages, {
    title: cleanTitle,
    content: cleanContent,
    authorId: cleanAuthor,
    authorName: authorName.trim() || "Staff Member",
    recipientId: cleanRecipient,
    ...(recipientName?.trim() ? { recipientName: recipientName.trim() } : {}),
    isPushEnabled,
    timestamp: serverNow(),
  })

  if (isPushEnabled) {
    if (cleanRecipient !== "broadcast") {
      await triggerNotification({
        targetUserId: cleanRecipient,
        title: `Message from ${authorName.trim() || "Management"}`,
        body: `${cleanTitle}: ${cleanContent.slice(0, 120)}`,
        type: "info",
        metadata: { messageId: docRef.id, type: "direct_message" },
        db: store,
      })
    } else if (broadcastRecipientUids.length > 0) {
      await Promise.all(
        broadcastRecipientUids.map((uid) =>
          triggerNotification({
            targetUserId: uid,
            title: `Announcement: ${cleanTitle}`,
            body: cleanContent.slice(0, 140),
            type: "info",
            metadata: { messageId: docRef.id, type: "broadcast_message" },
            db: store,
          }),
        ),
      )
    }
  }

  await logAuditAction({
    actorId: cleanAuthor,
    actorName: authorName.trim() || "Administrator",
    actionType: cleanRecipient === "broadcast" ? "MESSAGE_BROADCAST" : "MESSAGE_DIRECT",
    targetId: cleanRecipient,
    description: `Sent "${cleanTitle}" (${cleanRecipient === "broadcast" ? "Broadcast" : "Direct"})`,
    metadata: { messageId: docRef.id, isPushEnabled },
    db: store,
  })

  return docRef.id
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
  db?: DataStore,
): Promise<void> {
  if (!userId.trim() || !notificationId.trim()) {
    return
  }
  const store = db ?? getClientDataStore()
  await store.updateDoc(
    `${DATA_COLLECTIONS.users}/${userId}/${DATA_COLLECTIONS.notifications}/${notificationId}`,
    { isRead: true },
  )
}

export async function markAllNotificationsRead(
  userId: string,
  notificationIds: string[],
  db?: DataStore,
): Promise<void> {
  if (!userId.trim() || notificationIds.length === 0) {
    return
  }
  const store = db ?? getClientDataStore()
  await Promise.all(
    notificationIds.map((id) =>
      store.updateDoc(
        `${DATA_COLLECTIONS.users}/${userId}/${DATA_COLLECTIONS.notifications}/${id}`,
        { isRead: true },
      ),
    ),
  )
}

export async function clearAllNotifications(
  userId: string,
  notificationIds: string[],
  db?: DataStore,
): Promise<void> {
  if (!userId.trim() || notificationIds.length === 0) {
    return
  }
  const store = db ?? getClientDataStore()
  await Promise.all(
    notificationIds.map((id) =>
      store.deleteDoc(
        `${DATA_COLLECTIONS.users}/${userId}/${DATA_COLLECTIONS.notifications}/${id}`,
      ),
    ),
  )
}
