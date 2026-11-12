"use client"

import { callLocalServerAction, getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { serverNow } from "@/lib/data/memory-store"
import type { DataStore } from "@/lib/data/types"
import {
  isStrongPassword,
  passwordValidationMessage,
  validateProfileName,
  validateProfilePhoto,
} from "@/lib/admin/profile-models"

export type ProfileActionErrorCode =
  | "invalid-name"
  | "invalid-photo"
  | "invalid-password"
  | "not-signed-in"
  | "session-mismatch"
  | "wrong-password"
  | "too-many-requests"
  | "requires-recent-login"
  | "weak-password"
  | "permission-denied"
  | "too-many-linked-accounts"
  | "conflict"
  | "network"
  | "unknown"

const ERROR_MESSAGES: Record<ProfileActionErrorCode, string> = {
  "invalid-name": "Name is required.",
  "invalid-photo": "Choose a valid image smaller than 5 MB.",
  "invalid-password": "Enter a password that meets every requirement.",
  "not-signed-in": "Your browser session has expired. Sign in again and retry.",
  "session-mismatch":
    "This browser is signed in as a different account. Sign in again before changing this profile.",
  "wrong-password": "Incorrect password. Please try again.",
  "too-many-requests": "Too many attempts. Please try again later.",
  "requires-recent-login": "Sign in again before making this security-sensitive change.",
  "weak-password": "Password was rejected. Choose a stronger one.",
  "permission-denied": "You do not have permission to perform this change.",
  "too-many-linked-accounts":
    "This workspace has more linked accounts than one atomic server operation can dissolve. Contact support.",
  conflict:
    "The workspace changed while this operation was running. Refresh and try again.",
  network: "Network error. Check your connection and try again.",
  unknown: "The request could not be completed. Please try again.",
}

export class ProfileActionError extends Error {
  readonly code: ProfileActionErrorCode

  constructor(code: ProfileActionErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code])
    this.name = "ProfileActionError"
    this.code = code
  }
}

export interface UpdateProfileInput {
  uid: string
  name: string
  photoFile?: File | null
}

export interface UpdateProfileResult {
  name: string
  photoUrl?: string
}

async function readFileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") {
    return new Uint8Array(await file.arrayBuffer())
  }
  return new Uint8Array(Math.max(1, Math.min(file.size ?? 1, 64)))
}

export async function updateAdminProfile(
  { uid, name, photoFile }: UpdateProfileInput,
  store: DataStore = getClientDataStore(),
): Promise<UpdateProfileResult> {
  const cleanedName = name.trim()
  const nameError = validateProfileName(cleanedName)
  if (nameError) {
    throw new ProfileActionError("invalid-name", nameError)
  }
  if (photoFile) {
    const photoError = validateProfilePhoto(photoFile)
    if (photoError) {
      throw new ProfileActionError("invalid-photo", photoError)
    }
  }

  try {
    let photoUrl: string | undefined
    if (photoFile) {
      const path = `profiles/${uid}/${Date.now()}_${safePhotoName(photoFile.name)}`
      const bytes = await readFileBytes(photoFile)
      photoUrl = await store.uploadFile(path, bytes, photoFile.type || "image/png")
    }

    const updates: Record<string, unknown> = {
      name: cleanedName,
      updatedAt: serverNow(),
    }
    if (photoUrl !== undefined) {
      updates.photoUrl = photoUrl
    }

    await store.updateDoc(`${DATA_COLLECTIONS.users}/${uid}`, updates)
    return photoUrl === undefined
      ? { name: cleanedName }
      : { name: cleanedName, photoUrl }
  } catch (error) {
    throw toProfileActionError(error)
  }
}

export interface ChangePasswordInput {
  uid: string
  email: string
  currentPassword: string
  newPassword: string
}

export async function changeAdminPassword(
  { currentPassword, newPassword }: ChangePasswordInput,
  changeFn: (currentPassword: string, newPassword: string) => Promise<void> = (cur, next) =>
    callLocalServerAction("changePassword", { currentPassword: cur, newPassword: next }),
): Promise<void> {
  if (currentPassword.length === 0) {
    throw new ProfileActionError("wrong-password", "Enter your current password.")
  }
  const passwordError = passwordValidationMessage(newPassword)
  if (passwordError || !isStrongPassword(newPassword)) {
    throw new ProfileActionError("invalid-password", passwordError ?? undefined)
  }

  try {
    await changeFn(currentPassword, newPassword)
  } catch (error) {
    throw toProfileActionError(error)
  }
}

export interface DeleteWorkspaceInput {
  uid: string
  email: string
  password: string
}

export interface DeleteWorkspaceResult {
  cascaded: number
}

export async function deleteAdminWorkspace(
  { password }: DeleteWorkspaceInput,
  dissolveFn: (password: string) => Promise<{ success?: boolean; cascaded?: number }> = (pw) =>
    callLocalServerAction<{ success?: boolean; cascaded?: number }>(
      "deleteAdminWorkspace",
      { password: pw },
    ),
): Promise<DeleteWorkspaceResult> {
  if (password.length === 0) {
    throw new ProfileActionError("wrong-password", "Enter your current password.")
  }

  try {
    const response = await dissolveFn(password)
    if (response?.success !== true) {
      throw new ProfileActionError(
        "conflict",
        "The workspace dissolution did not complete. Refresh and try again.",
      )
    }

    return { cascaded: Number(response.cascaded ?? 0) }
  } catch (error) {
    throw toProfileActionError(error)
  }
}

function safePhotoName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]/g, "_")
  return cleaned && cleaned.length > 0 ? cleaned : "photo"
}

function toProfileActionError(error: unknown): ProfileActionError {
  if (error instanceof ProfileActionError) {
    return error
  }

  const code = String((error as { code?: unknown })?.code ?? "")

  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return new ProfileActionError("wrong-password")
    case "auth/too-many-requests":
      return new ProfileActionError("too-many-requests")
    case "auth/requires-recent-login":
      return new ProfileActionError("requires-recent-login")
    case "auth/weak-password":
      return new ProfileActionError("weak-password")
    case "unauthenticated":
      return new ProfileActionError("not-signed-in")
    case "permission-denied":
      return new ProfileActionError("permission-denied")
    case "resource-exhausted":
      return new ProfileActionError("too-many-linked-accounts")
    case "aborted":
      return new ProfileActionError("conflict")
    case "unavailable":
    case "deadline-exceeded":
      return new ProfileActionError("network")
    default:
      return new ProfileActionError("unknown")
  }
}
