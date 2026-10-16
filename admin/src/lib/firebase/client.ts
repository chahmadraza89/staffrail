import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

/**
 * Public (browser) Firebase configuration for StaffRail Admin.
 *
 * These values are the standard Firebase web-app identifiers and are safe
 * to ship in the browser (the Flutter employee app ships the same data).
 * See `.env.example` for documentation of each variable.
 */

const REQUIRED_PUBLIC_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
] as const

export class FirebaseConfigError extends Error {
  readonly missing: readonly string[]

  constructor(missing: readonly string[]) {
    super(
      `StaffRail Admin is missing required Firebase browser configuration: ` +
        `${missing.join(", ")}. Copy .env.example to .env.local and fill in ` +
        `every NEXT_PUBLIC_FIREBASE_* variable (see admin/README.md).`,
    )
    this.name = "FirebaseConfigError"
    this.missing = missing
  }
}

function readPublicConfig(): FirebaseOptions {
  const missing: string[] = []
  const values: Record<string, string> = {}

  for (const key of REQUIRED_PUBLIC_KEYS) {
    const value = process.env[key]
    if (typeof value === "string" && value.trim().length > 0) {
      values[key] = value.trim()
    } else {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new FirebaseConfigError(missing)
  }

  return {
    apiKey: values.NEXT_PUBLIC_FIREBASE_API_KEY,
    appId: values.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: values.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    projectId: values.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    authDomain: values.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    storageBucket: values.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  }
}

let cachedConfig: FirebaseOptions | null = null

export function getPublicFirebaseConfig(): FirebaseOptions {
  cachedConfig ??= readPublicConfig()
  return cachedConfig
}

/**
 * Single app instance — safe against hot-reload duplicate initialization.
 */
export function getFirebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(getPublicFirebaseConfig())
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp())
}

export function getFirebaseFirestore(): Firestore {
  return getFirestore(getFirebaseApp())
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp())
}

/**
 * Configured but not yet used in this file — re-export for convenience so
 * feature screens can acquire all services from one module.
 */
export { getApp, getApps }
