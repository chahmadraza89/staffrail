import "server-only"

import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

import { DATA_COLLECTIONS } from "@/lib/data/collections"
import { MemoryDataStore, serverNow } from "@/lib/data/memory-store"
import { DEMO_CREDENTIALS, DEMO_USERS, seedDemoWorkspace } from "@/lib/data/seed"
import { DataError, type AuthAccountRecord } from "@/lib/data/types"

const globalCache = globalThis as unknown as {
  __staffrailServerStore?: MemoryDataStore
  __staffrailAuthAccounts?: Map<string, AuthAccountRecord>
  __staffrailResetTokens?: Map<string, { uid: string; email: string; expiresAt: number }>
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt ?? randomBytes(16).toString("hex")
  const derived = scryptSync(password, actualSalt, 64).toString("hex")
  return { hash: derived, salt: actualSalt }
}

function verifyPasswordHash(password: string, hash: string, salt: string): boolean {
  try {
    const derived = scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, "hex")
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

function ensureInitialized(): {
  store: MemoryDataStore
  accounts: Map<string, AuthAccountRecord>
  resetTokens: Map<string, { uid: string; email: string; expiresAt: number }>
} {
  if (!globalCache.__staffrailServerStore) {
    const store = new MemoryDataStore()
    seedDemoWorkspace(store)
    globalCache.__staffrailServerStore = store
  }

  if (!globalCache.__staffrailAuthAccounts) {
    const accounts = new Map<string, AuthAccountRecord>()
    const nowSec = Math.floor(Date.now() / 1000)
    for (const user of DEMO_USERS) {
      const { hash, salt } = hashPassword(DEMO_CREDENTIALS.password)
      accounts.set(user.uid, {
        uid: user.uid,
        email: user.email.toLowerCase(),
        passwordHash: hash,
        passwordSalt: salt,
        emailVerified: user.emailVerified,
        disabled: !user.isActive,
        lastAuthTime: nowSec,
        tokenValidAfter: 0,
      })
    }
    globalCache.__staffrailAuthAccounts = accounts
  }

  if (!globalCache.__staffrailResetTokens) {
    globalCache.__staffrailResetTokens = new Map()
  }

  return {
    store: globalCache.__staffrailServerStore,
    accounts: globalCache.__staffrailAuthAccounts,
    resetTokens: globalCache.__staffrailResetTokens,
  }
}

export function getServerDataStore(): MemoryDataStore {
  return ensureInitialized().store
}

export function getAuthAccountByUid(uid: string): AuthAccountRecord | null {
  return ensureInitialized().accounts.get(uid) ?? null
}

export function getAuthAccountByEmail(email: string): AuthAccountRecord | null {
  const normalized = email.trim().toLowerCase()
  for (const account of ensureInitialized().accounts.values()) {
    if (account.email === normalized) {
      return account
    }
  }
  return null
}

export function syncAuthAccountFromProfileWrite(
  path: string,
  data: Record<string, unknown>,
): void {
  const clean = path.split("/").filter(Boolean)
  if (clean.length !== 2 || clean[0] !== DATA_COLLECTIONS.users) {
    return
  }
  const uid = clean[1]
  const account = getAuthAccountByUid(uid)
  if (!account) {
    return
  }
  if (typeof data.email === "string" && data.email.trim().length > 0) {
    const nextEmail = data.email.trim().toLowerCase()
    const existing = getAuthAccountByEmail(nextEmail)
    if (!existing || existing.uid === uid) {
      account.email = nextEmail
    }
  }
  const deactivated =
    data.isActive === false || (data.deletedAt !== undefined && data.deletedAt !== null)
  if (deactivated) {
    account.disabled = true
    account.tokenValidAfter = Math.floor(Date.now() / 1000)
  } else if (data.isActive === true && data.deletedAt === null) {
    account.disabled = false
  }
}

export function resetServerStoreForTests(): void {
  globalCache.__staffrailServerStore = undefined
  globalCache.__staffrailAuthAccounts = undefined
  globalCache.__staffrailResetTokens = undefined
}

export class LocalAuthError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "LocalAuthError"
    this.code = code
  }
}

export async function authenticateWithPassword(
  email: string,
  password: string,
): Promise<AuthAccountRecord> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password) {
    throw new LocalAuthError("auth/invalid-credential", "Invalid email or password.")
  }

  const account = getAuthAccountByEmail(normalizedEmail)
  if (!account || !verifyPasswordHash(password, account.passwordHash, account.passwordSalt)) {
    throw new LocalAuthError("auth/invalid-credential", "Invalid email or password.")
  }

  if (account.disabled) {
    throw new LocalAuthError("auth/user-disabled", "This account has been disabled.")
  }

  account.lastAuthTime = Math.floor(Date.now() / 1000)
  return account
}

export async function verifyCurrentPassword(uid: string, password: string): Promise<void> {
  const account = getAuthAccountByUid(uid)
  if (!account || !verifyPasswordHash(password, account.passwordHash, account.passwordSalt)) {
    throw new LocalAuthError("auth/wrong-password", "Current password is incorrect.")
  }
}

export async function updateAccountPassword(
  uid: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await verifyCurrentPassword(uid, currentPassword)
  const account = getAuthAccountByUid(uid)
  if (!account) {
    throw new LocalAuthError("auth/user-not-found", "Account not found.")
  }
  const { hash, salt } = hashPassword(newPassword)
  account.passwordHash = hash
  account.passwordSalt = salt
  account.lastAuthTime = Math.floor(Date.now() / 1000)
}

export async function createPasswordResetRequest(
  email: string,
): Promise<{ resetToken: string | null }> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new LocalAuthError("auth/invalid-email", "Invalid email address.")
  }
  const account = getAuthAccountByEmail(normalized)
  if (!account) {
    return { resetToken: null }
  }
  const token = randomBytes(24).toString("hex")
  ensureInitialized().resetTokens.set(token, {
    uid: account.uid,
    email: account.email,
    expiresAt: Date.now() + 60 * 60 * 1000,
  })
  return { resetToken: token }
}

export async function confirmPasswordResetWithToken(
  token: string,
  newPassword: string,
): Promise<void> {
  const { resetTokens, accounts } = ensureInitialized()
  const record = resetTokens.get(token)
  if (!record || record.expiresAt < Date.now()) {
    throw new LocalAuthError("auth/invalid-action-code", "Reset link is invalid or has expired.")
  }
  const account = accounts.get(record.uid)
  if (!account) {
    throw new LocalAuthError("auth/user-not-found", "Account not found.")
  }
  const { hash, salt } = hashPassword(newPassword)
  account.passwordHash = hash
  account.passwordSalt = salt
  account.tokenValidAfter = Math.floor(Date.now() / 1000)
  resetTokens.delete(token)
}

export async function markAccountEmailVerified(
  email: string,
  password: string,
): Promise<{ emailVerified: boolean; email: string }> {
  const account = await authenticateWithPassword(email, password)
  account.emailVerified = true
  return { emailVerified: account.emailVerified, email: account.email }
}

export async function registerStaffLocal(input: {
  adminUid: string
  email: string
  name: string
  role?: string
  webProvisioning?: boolean
}): Promise<{ uid: string; resetLink: string | null }> {
  const { store, accounts } = ensureInitialized()
  const cleanEmail = input.email.trim().toLowerCase()
  const cleanName = input.name.trim()

  if (!cleanEmail || !cleanName) {
    throw new DataError("invalid-argument", "Employee name and email are required.")
  }
  if (getAuthAccountByEmail(cleanEmail)) {
    throw new DataError("already-exists", "An account with this email already exists.")
  }

  const uid = `emp_${randomBytes(8).toString("hex")}`
  const tempPassword = DEMO_CREDENTIALS.password
  const { hash, salt } = hashPassword(tempPassword)

  try {
    await store.runTransaction(async (tx) => {
      const adminSnap = await tx.get(`${DATA_COLLECTIONS.users}/${input.adminUid}`)
      if (!adminSnap.exists()) {
        throw new DataError("permission-denied", "Admin profile not found.")
      }
      const adminData = adminSnap.data() ?? {}
      if (
        adminData.role !== "admin" ||
        adminData.isActive !== true ||
        adminData.deletedAt != null
      ) {
        throw new DataError("permission-denied", "Only an active admin can register staff.")
      }

      const currentRev =
        typeof adminData.membershipRevision === "number" ? adminData.membershipRevision : 0
      tx.update(`${DATA_COLLECTIONS.users}/${input.adminUid}`, {
        membershipRevision: currentRev + 1,
        updatedAt: serverNow(),
      })

      tx.set(`${DATA_COLLECTIONS.users}/${uid}`, {
        uid,
        name: cleanName,
        email: cleanEmail,
        role: input.role === "admin" ? "admin" : "employee",
        adminId: input.adminUid,
        isActive: true,
        deletedAt: null,
        createdAt: serverNow(),
        lastLogin: serverNow(),
        updatedAt: serverNow(),
        ...(input.webProvisioning ? { setupStatus: "incomplete" } : {}),
        notificationPreferences: {
          pushEnabled: true,
          emailEnabled: true,
          taskReminders: true,
          adminAlerts: true,
        },
      })

      tx.set(`${DATA_COLLECTIONS.users}/${uid}/${DATA_COLLECTIONS.notifications}/welcome`, {
        userId: uid,
        title: "Welcome to StaffRail",
        body: "Your staff profile has been created. Complete your onboarding requirements.",
        type: "info",
        isRead: false,
        timestamp: serverNow(),
      })
    })
  } catch (err) {
    throw err
  }

  const nowSec = Math.floor(Date.now() / 1000)
  accounts.set(uid, {
    uid,
    email: cleanEmail,
    passwordHash: hash,
    passwordSalt: salt,
    emailVerified: true,
    disabled: false,
    lastAuthTime: nowSec,
    tokenValidAfter: 0,
  })

  const { resetToken } = await createPasswordResetRequest(cleanEmail)
  const resetLink = resetToken ? `/forgot-password?token=${encodeURIComponent(resetToken)}` : null

  return { uid, resetLink }
}

export async function dissolveWorkspaceLocal(input: {
  adminUid: string
  password: string
}): Promise<{ success: true; cascaded: number }> {
  await verifyCurrentPassword(input.adminUid, input.password)

  const { store, accounts } = ensureInitialized()
  const MAX_LINKED_ACCOUNTS = 499

  const allUsersSnap = await store.getCollection(DATA_COLLECTIONS.users, {
    filters: [{ field: "adminId", op: "==", value: input.adminUid }],
  })
  const candidateIds = allUsersSnap.docs.map((d) => d.id)

  const cascadedUids = await store.runTransaction(async (tx) => {
    const adminSnap = await tx.get(`${DATA_COLLECTIONS.users}/${input.adminUid}`)
    if (!adminSnap.exists()) {
      throw new DataError("permission-denied", "Admin profile not found.")
    }
    const adminData = adminSnap.data() ?? {}
    if (
      adminData.role !== "admin" ||
      adminData.isActive !== true ||
      adminData.deletedAt != null
    ) {
      throw new DataError("permission-denied", "Only an active admin can dissolve this workspace.")
    }

    const activeLinkedIds: string[] = []
    for (const candidateId of candidateIds) {
      if (candidateId === input.adminUid) continue
      const snap = await tx.get(`${DATA_COLLECTIONS.users}/${candidateId}`)
      if (!snap.exists()) continue
      const data = snap.data() ?? {}
      if (
        data.adminId === input.adminUid &&
        data.isActive === true &&
        data.deletedAt == null
      ) {
        activeLinkedIds.push(candidateId)
      }
    }

    if (activeLinkedIds.length > MAX_LINKED_ACCOUNTS) {
      throw new DataError(
        "resource-exhausted",
        "Workspace exceeds maximum linked accounts for atomic dissolution.",
      )
    }

    const currentRev =
      typeof adminData.membershipRevision === "number" ? adminData.membershipRevision : 0

    for (const empId of activeLinkedIds) {
      tx.update(`${DATA_COLLECTIONS.users}/${empId}`, {
        isActive: false,
        deletedAt: serverNow(),
        deletionReason: "workspace_dissolved",
        updatedAt: serverNow(),
      })
    }

    tx.update(`${DATA_COLLECTIONS.users}/${input.adminUid}`, {
      isActive: false,
      deletedAt: serverNow(),
      deletionReason: "workspace_dissolved_by_admin",
      membershipRevision: currentRev + 1,
      updatedAt: serverNow(),
    })

    return activeLinkedIds
  })

  const nowSec = Math.floor(Date.now() / 1000)
  const adminAccount = accounts.get(input.adminUid)
  if (adminAccount) {
    adminAccount.disabled = true
    adminAccount.tokenValidAfter = nowSec
  }
  for (const empId of cascadedUids) {
    const empAccount = accounts.get(empId)
    if (empAccount) {
      empAccount.disabled = true
      empAccount.tokenValidAfter = nowSec
    }
  }

  return { success: true, cascaded: cascadedUids.length }
}
