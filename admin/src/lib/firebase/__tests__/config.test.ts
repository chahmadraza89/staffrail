import { describe, expect, it, beforeEach, afterEach } from "vitest"

import {
  getPublicFirebaseConfig,
  FirebaseConfigError,
} from "@/lib/firebase/client"

describe("Firebase browser config validation", () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    // Fresh copy so casted deletions don't leak across tests.
    for (const key of [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    ]) {
      delete process.env[key]
    }
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it("throws a clear error listing every missing variable", () => {
    expect(() => getPublicFirebaseConfig()).toThrow(FirebaseConfigError)
    try {
      getPublicFirebaseConfig()
    } catch (error) {
      const missing = (error as FirebaseConfigError).missing
      expect(missing).toEqual(
        expect.arrayContaining([
          "NEXT_PUBLIC_FIREBASE_API_KEY",
          "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
        ]),
      )
      expect(String(error)).toMatch(/\.env\.example/)
    }
  })

  it("rejects whitespace-only values as missing", () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "   "
    expect(() => getPublicFirebaseConfig()).toThrow(FirebaseConfigError)
  })

  it("accepts a complete configuration and maps values", () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-key"
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "test-app-id"
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "1234567890"
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project"
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test-project.firebaseapp.com"
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "test-project.firebasestorage.app"

    const config = getPublicFirebaseConfig()
    expect(config).toMatchObject({
      apiKey: "test-key",
      projectId: "test-project",
      authDomain: "test-project.firebaseapp.com",
    })
  })
})
