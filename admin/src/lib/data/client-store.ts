"use client"

import { MemoryDataStore } from "@/lib/data/memory-store"
import { seedDemoWorkspace } from "@/lib/data/seed"
import {
  DataError,
  type DataDocRef,
  type DataDocSnapshot,
  type DataDocument,
  type DataQueryOptions,
  type DataQuerySnapshot,
  type DataStore,
  type DataTransaction,
  type StoredFileRecord,
  type Unsubscribe,
} from "@/lib/data/types"

function normalizePath(raw: string): string {
  return raw
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join("/")
}

function hydrateSnapshot(raw: {
  id: string
  path: string
  exists: boolean
  data?: DataDocument
}): DataDocSnapshot {
  const segments = raw.path.split("/")
  const parentParentId = segments.length >= 3 ? segments[segments.length - 3] : null
  return {
    id: raw.id,
    path: raw.path,
    ref: {
      id: raw.id,
      path: raw.path,
      parent: {
        parent: parentParentId ? { id: parentParentId } : null,
      },
    },
    exists: () => raw.exists,
    data: () => (raw.exists && raw.data ? { ...raw.data } : undefined),
  }
}

async function postJson<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/data", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new DataError(
      typeof data.code === "string" ? data.code : "unknown",
      typeof data.error === "string" ? data.error : `Request failed (${res.status})`,
    )
  }
  return data as T
}

interface WatcherEntry {
  refresh: () => Promise<void>
}

export class RemoteHttpDataStore implements DataStore {
  private readonly watchers = new Set<WatcherEntry>()
  private pollTimer: ReturnType<typeof setInterval> | null = null

  private ensurePolling(): void {
    if (this.pollTimer !== null || this.watchers.size === 0) {
      return
    }
    this.pollTimer = setInterval(() => {
      void this.refreshAll()
    }, 3000)
  }

  private stopPollingIfIdle(): void {
    if (this.watchers.size === 0 && this.pollTimer !== null) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  async refreshAll(): Promise<void> {
    await Promise.all(Array.from(this.watchers).map((w) => w.refresh()))
  }

  async getDoc(path: string): Promise<DataDocSnapshot> {
    const res = await postJson<{
      snapshot: { id: string; path: string; exists: boolean; data?: DataDocument }
    }>({ op: "getDoc", path: normalizePath(path) })
    return hydrateSnapshot(res.snapshot)
  }

  async getCollection(
    path: string,
    options?: DataQueryOptions,
  ): Promise<DataQuerySnapshot> {
    const res = await postJson<{
      docs: Array<{ id: string; path: string; exists: boolean; data?: DataDocument }>
    }>({ op: "getCollection", path: normalizePath(path), options })
    return { docs: res.docs.map(hydrateSnapshot) }
  }

  async getCollectionGroup(
    collectionId: string,
    options?: DataQueryOptions,
  ): Promise<DataQuerySnapshot> {
    const res = await postJson<{
      docs: Array<{ id: string; path: string; exists: boolean; data?: DataDocument }>
    }>({ op: "getCollectionGroup", collectionId, options })
    return { docs: res.docs.map(hydrateSnapshot) }
  }

  async setDoc(
    path: string,
    data: DataDocument,
    options?: { merge?: boolean },
  ): Promise<void> {
    await postJson({ op: "setDoc", path: normalizePath(path), data, options })
    await this.refreshAll()
  }

  async updateDoc(path: string, data: DataDocument): Promise<void> {
    await postJson({ op: "updateDoc", path: normalizePath(path), data })
    await this.refreshAll()
  }

  async addDoc(collectionPath: string, data: DataDocument): Promise<DataDocRef> {
    const res = await postJson<{ ref: DataDocRef }>({
      op: "addDoc",
      collectionPath: normalizePath(collectionPath),
      data,
    })
    await this.refreshAll()
    return res.ref
  }

  async deleteDoc(path: string): Promise<void> {
    await postJson({ op: "deleteDoc", path: normalizePath(path) })
    await this.refreshAll()
  }

  async runTransaction<T>(fn: (tx: DataTransaction) => Promise<T>): Promise<T> {
    const MAX_ATTEMPTS = 5
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      let readPaths: string[] = []
      let startVersion: number | null = null
      const ops: Array<{
        type: "set" | "update" | "delete"
        path: string
        data?: DataDocument
        options?: { merge?: boolean }
      }> = []

      const tx: DataTransaction = {
        get: async (path: string) => {
          const normalized = normalizePath(path)
          const res = await postJson<{
            snapshot: { id: string; path: string; exists: boolean; data?: DataDocument }
            version: number
          }>({ op: "getDoc", path: normalized })
          if (startVersion === null) {
            startVersion = res.version
          }
          readPaths.push(normalized)
          return hydrateSnapshot(res.snapshot)
        },
        set: (path: string, data: DataDocument, options?: { merge?: boolean }) => {
          ops.push({ type: "set", path: normalizePath(path), data, options })
        },
        update: (path: string, data: DataDocument) => {
          ops.push({ type: "update", path: normalizePath(path), data })
        },
        delete: (path: string) => {
          ops.push({ type: "delete", path: normalizePath(path) })
        },
      }

      const result = await fn(tx)

      if (ops.length > 0) {
        try {
          await postJson({
            op: "commitTransaction",
            startVersion,
            readPaths,
            ops,
          })
          await this.refreshAll()
        } catch (err) {
          if (err instanceof DataError && err.code === "aborted") {
            readPaths = []
            continue
          }
          throw err
        }
      }

      return result
    }

    throw new DataError("aborted", "Transaction aborted after concurrent modification.")
  }

  subscribeDoc(
    path: string,
    onData: (snapshot: DataDocSnapshot) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    let active = true
    const entry: WatcherEntry = {
      refresh: async () => {
        if (!active) return
        try {
          const snap = await this.getDoc(path)
          if (active) onData(snap)
        } catch (err) {
          if (active) onError?.(err instanceof Error ? err : new Error(String(err)))
        }
      },
    }
    this.watchers.add(entry)
    this.ensurePolling()
    void entry.refresh()
    return () => {
      active = false
      this.watchers.delete(entry)
      this.stopPollingIfIdle()
    }
  }

  subscribeCollection(
    path: string,
    onData: (snapshot: DataQuerySnapshot) => void,
    onError?: (error: Error) => void,
    options?: DataQueryOptions,
  ): Unsubscribe {
    let active = true
    const entry: WatcherEntry = {
      refresh: async () => {
        if (!active) return
        try {
          const snap = await this.getCollection(path, options)
          if (active) onData(snap)
        } catch (err) {
          if (active) onError?.(err instanceof Error ? err : new Error(String(err)))
        }
      },
    }
    this.watchers.add(entry)
    this.ensurePolling()
    void entry.refresh()
    return () => {
      active = false
      this.watchers.delete(entry)
      this.stopPollingIfIdle()
    }
  }

  subscribeCollectionGroup(
    collectionId: string,
    onData: (snapshot: DataQuerySnapshot) => void,
    onError?: (error: Error) => void,
    options?: DataQueryOptions,
  ): Unsubscribe {
    let active = true
    const entry: WatcherEntry = {
      refresh: async () => {
        if (!active) return
        try {
          const snap = await this.getCollectionGroup(collectionId, options)
          if (active) onData(snap)
        } catch (err) {
          if (active) onError?.(err instanceof Error ? err : new Error(String(err)))
        }
      },
    }
    this.watchers.add(entry)
    this.ensurePolling()
    void entry.refresh()
    return () => {
      active = false
      this.watchers.delete(entry)
      this.stopPollingIfIdle()
    }
  }

  async uploadFile(
    path: string,
    bytes: Uint8Array,
    contentType: string,
    metadata: Record<string, string> = {},
  ): Promise<string> {
    const form = new FormData()
    const copy = new Uint8Array(bytes.length)
    copy.set(bytes)
    form.append("file", new Blob([copy], { type: contentType || "application/octet-stream" }))
    form.append("path", normalizePath(path))
    form.append("contentType", contentType || "application/octet-stream")
    form.append("metadata", JSON.stringify(metadata))

    const res = await fetch("/api/data", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    })
    const payload = (await res.json().catch(() => ({}))) as {
      url?: string
      code?: string
      error?: string
    }
    if (!res.ok || typeof payload.url !== "string") {
      throw new DataError(
        payload.code ?? "unknown",
        payload.error ?? `Upload failed (${res.status})`,
      )
    }
    return payload.url
  }

  async deleteFile(path: string): Promise<void> {
    await postJson({ op: "deleteFile", path: normalizePath(path) })
  }

  getFile(): StoredFileRecord | null {
    return null
  }
}

const globalClientCache = globalThis as unknown as {
  __staffrailClientDataStore?: DataStore
}

export function getClientDataStore(): DataStore {
  if (globalClientCache.__staffrailClientDataStore) {
    return globalClientCache.__staffrailClientDataStore
  }

  const isTestEnv =
    typeof process !== "undefined" &&
    (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST))

  if (typeof window !== "undefined" && !isTestEnv) {
    globalClientCache.__staffrailClientDataStore = new RemoteHttpDataStore()
  } else {
    const store = new MemoryDataStore()
    seedDemoWorkspace(store)
    globalClientCache.__staffrailClientDataStore = store
  }

  return globalClientCache.__staffrailClientDataStore
}

export async function callLocalServerAction<T>(
  action: string,
  payload: Record<string, unknown>,
): Promise<T> {
  return postJson<T>({ op: "action", action, ...payload })
}
