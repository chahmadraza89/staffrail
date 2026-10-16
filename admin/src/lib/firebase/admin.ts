import "server-only"

import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth } from "firebase-admin/auth"

/**
 * Firebase Admin SDK (server-only).
 *
 * Credentials come from environment variables — never from
 * NEXT_PUBLIC_* and never bundled into client code. See .env.example.
 *
 * Supported forms:
 *  a) FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON  (entire service-account JSON)
 *  b) FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY
 *     (+ optional FIREBASE_ADMIN_PROJECT_ID, else the public project id)
 */

export class AdminConfigError extends Error {
  constructor(message: string) {
    super(
      `StaffRail Admin server is not configured for Firebase Admin SDK: ${message}. ` +
        `Set FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON (or the individual ` +
        `FIREBASE_ADMIN_* variables) per admin/README.md — never as NEXT_PUBLIC_*.`,
    )
    this.name = "AdminConfigError"
  }
}

export interface AdminCredentials {
  projectId: string
  clientEmail: string
  privateKey: string
}

function parseCredentials(): AdminCredentials {
  const json = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (typeof json === "string" && json.trim().length > 0) {
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>
      const { project_id: projectId, client_email: email, private_key: key } = parsed
      if (typeof projectId !== "string" || typeof email !== "string" || typeof key !== "string") {
        throw new Error("service account JSON is missing project_id, client_email or private_key")
      }
      return { projectId, clientEmail: email, privateKey: key }
    } catch (error) {
      throw new AdminConfigError(`could not parse FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON (${(error as Error).message})`)
    }
  }

  const projectId =
    typeof process.env.FIREBASE_ADMIN_PROJECT_ID === "string" && process.env.FIREBASE_ADMIN_PROJECT_ID
      ? process.env.FIREBASE_ADMIN_PROJECT_ID
      : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (!clientEmail || !privateKey) {
    throw new AdminConfigError(
      "provide FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON, or FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY",
    )
  }

  return {
    projectId: projectId ?? "",
    clientEmail,
    // dotenv-style values may encode newlines literally as \n.
    privateKey: privateKey.replace(/\\n/g, "\n"),
  }
}

let cachedApp: App | null = null

export function getAdminApp(): App {
  if (cachedApp) {
    return cachedApp
  }

  const credentials = parseCredentials()
  const existing = getApps().find((app) => app.name === "staffrail-admin-server")
  if (existing) {
    cachedApp = existing
    return cachedApp
  }

  try {
    cachedApp = initializeApp(
      {
        credential: cert(credentials),
        projectId: credentials.projectId || undefined,
      },
      "staffrail-admin-server",
    )
  } catch (error) {
    cachedApp = null
    throw new AdminConfigError(`could not initialize the app (${(error as Error).message})`)
  }

  return cachedApp
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp())
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp())
}
