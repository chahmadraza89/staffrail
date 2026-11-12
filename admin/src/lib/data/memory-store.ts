import { toDateOrNull } from "@/lib/data/dates"
import {
  DataError,
  type DataDocRef,
  type DataDocSnapshot,
  type DataDocument,
  type DataFilter,
  type DataQueryOptions,
  type DataQuerySnapshot,
  type DataStore,
  type DataTransaction,
  type StoredFileRecord,
  type Unsubscribe,
} from "@/lib/data/types"

const SERVER_TS_SENTINEL = "__STAFFRAIL_SERVER_TIMESTAMP__"

export function serverNow(): unknown {
  return SERVER_TS_SENTINEL
}

function normalizePath(raw: string): string {
  return raw
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join("/")
}

function resolveSentinels(value: unknown, now: Date): unknown {
  if (value === SERVER_TS_SENTINEL) {
    return new Date(now.getTime())
  }
  if (value instanceof Date) {
    return new Date(value.getTime())
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveSentinels(item, now))
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>
    if (typeof record.toDate === "function") {
      const d = (record as { toDate: () => Date }).toDate()
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : value
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(record)) {
      if (v !== undefined) {
        out[k] = resolveSentinels(v, now)
      }
    }
    return out
  }
  return value
}

function cloneValue(value: unknown): unknown {
  if (value instanceof Date) {
    return new Date(value.getTime())
  }
  if (value instanceof Uint8Array) {
    return new Uint8Array(value)
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item))
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = cloneValue(v)
    }
    return out
  }
  return value
}

function cloneDoc(doc: DataDocument): DataDocument {
  return cloneValue(doc) as DataDocument
}

function makeSnapshot(path: string, data: DataDocument | undefined): DataDocSnapshot {
  const segments = path.split("/")
  const id = segments[segments.length - 1] ?? ""
  const parentParentId = segments.length >= 3 ? segments[segments.length - 3] : null
  const cloned = data ? cloneDoc(data) : undefined
  return {
    id,
    path,
    ref: {
      id,
      path,
      parent: {
        parent: parentParentId ? { id: parentParentId } : null,
      },
    },
    exists: () => cloned !== undefined,
    data: () => (cloned ? cloneDoc(cloned) : undefined),
  }
}

function compareValues(a: unknown, b: unknown): number {
  const da = toDateOrNull(a)
  const db = toDateOrNull(b)
  if (da && db) {
    return da.getTime() - db.getTime()
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b
  }
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b)
  }
  if (a === b) {
    return 0
  }
  if (a === null || a === undefined) {
    return -1
  }
  if (b === null || b === undefined) {
    return 1
  }
  return String(a).localeCompare(String(b))
}

function matchesFilters(doc: DataDocument, filters?: DataFilter[]): boolean {
  if (!filters || filters.length === 0) {
    return true
  }
  for (const filter of filters) {
    const val = doc[filter.field]
    if (filter.op === "==") {
      if (val !== filter.value) {
        return false
      }
    } else if (filter.op === "in") {
      if (!Array.isArray(filter.value) || !filter.value.includes(val)) {
        return false
      }
    }
  }
  return true
}

function applyQueryOptions(
  entries: Array<[string, DataDocument]>,
  options?: DataQueryOptions,
): DataDocSnapshot[] {
  let filtered = entries.filter(([, data]) => matchesFilters(data, options?.filters))

  if (options?.orderBy) {
    const { field, direction } = options.orderBy
    filtered = [...filtered].sort(([, a], [, b]) => {
      const cmp = compareValues(a[field], b[field])
      return direction === "desc" ? -cmp : cmp
    })
  }

  if (typeof options?.limit === "number" && options.limit >= 0) {
    filtered = filtered.slice(0, options.limit)
  }

  return filtered.map(([path, data]) => makeSnapshot(path, data))
}

function createId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID().replace(/-/g, "").slice(0, 20)
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

interface ListenerEntry {
  notify: () => void
}

/**
 * Pure TypeScript in-memory document, file, and reactive pub/sub store.
 * Supports optimistic-concurrency transactions, subcollections, collection-group
 * queries, and live listener notifications with zero external database.
 */
export class MemoryDataStore implements DataStore {
  readonly docs = new Map<string, DataDocument>()
  readonly files = new Map<string, StoredFileRecord>()
  private version = 0
  private idCounter = 0
  private readonly listeners = new Set<ListenerEntry>()

  constructor(initialDocs?: Iterable<[string, DataDocument]>) {
    if (initialDocs) {
      for (const [path, data] of initialDocs) {
        this.docs.set(normalizePath(path), cloneDoc(data))
      }
    }
  }

  clear(): void {
    this.docs.clear()
    this.files.clear()
    this.version += 1
    this.notifyAll()
  }

  private nextId(): string {
    this.idCounter += 1
    return `${createId()}_${this.idCounter}`
  }

  private notifyAll(): void {
    for (const entry of Array.from(this.listeners)) {
      entry.notify()
    }
  }

  async getDoc(path: string): Promise<DataDocSnapshot> {
    const normalized = normalizePath(path)
    return makeSnapshot(normalized, this.docs.get(normalized))
  }

  async getCollection(
    path: string,
    options?: DataQueryOptions,
  ): Promise<DataQuerySnapshot> {
    const prefix = normalizePath(path)
    const depth = prefix.split("/").length + 1
    const entries: Array<[string, DataDocument]> = []
    for (const [docPath, data] of this.docs.entries()) {
      const segments = docPath.split("/")
      if (
        segments.length === depth &&
        docPath.startsWith(`${prefix}/`)
      ) {
        entries.push([docPath, data])
      }
    }
    return { docs: applyQueryOptions(entries, options) }
  }

  async getCollectionGroup(
    collectionId: string,
    options?: DataQueryOptions,
  ): Promise<DataQuerySnapshot> {
    const entries: Array<[string, DataDocument]> = []
    for (const [docPath, data] of this.docs.entries()) {
      const segments = docPath.split("/")
      if (segments.length >= 2 && segments[segments.length - 2] === collectionId) {
        entries.push([docPath, data])
      }
    }
    return { docs: applyQueryOptions(entries, options) }
  }

  async setDoc(
    path: string,
    data: DataDocument,
    options?: { merge?: boolean },
  ): Promise<void> {
    const normalized = normalizePath(path)
    const now = new Date()
    const resolved = resolveSentinels(data, now) as DataDocument
    if (options?.merge) {
      const existing = this.docs.get(normalized) ?? {}
      this.docs.set(normalized, { ...cloneDoc(existing), ...resolved })
    } else {
      this.docs.set(normalized, resolved)
    }
    this.version += 1
    this.notifyAll()
  }

  async updateDoc(path: string, data: DataDocument): Promise<void> {
    const normalized = normalizePath(path)
    const existing = this.docs.get(normalized)
    if (!existing) {
      throw new DataError("not-found", `Document not found at ${normalized}`)
    }
    const now = new Date()
    const resolved = resolveSentinels(data, now) as DataDocument
    this.docs.set(normalized, { ...cloneDoc(existing), ...resolved })
    this.version += 1
    this.notifyAll()
  }

  async addDoc(collectionPath: string, data: DataDocument): Promise<DataDocRef> {
    const normalizedCol = normalizePath(collectionPath)
    const id = this.nextId()
    const fullPath = `${normalizedCol}/${id}`
    await this.setDoc(fullPath, data)
    return { id, path: fullPath }
  }

  async deleteDoc(path: string): Promise<void> {
    const normalized = normalizePath(path)
    this.docs.delete(normalized)
    this.version += 1
    this.notifyAll()
  }

  async runTransaction<T>(fn: (tx: DataTransaction) => Promise<T>): Promise<T> {
    const MAX_ATTEMPTS = 5
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const startVersion = this.version
      const readPaths = new Set<string>()
      const pendingOps: Array<() => void> = []

      const tx: DataTransaction = {
        get: async (path: string) => {
          const normalized = normalizePath(path)
          readPaths.add(normalized)
          return makeSnapshot(normalized, this.docs.get(normalized))
        },
        set: (path: string, data: DataDocument, options?: { merge?: boolean }) => {
          const normalized = normalizePath(path)
          pendingOps.push(() => {
            const now = new Date()
            const resolved = resolveSentinels(data, now) as DataDocument
            if (options?.merge) {
              const existing = this.docs.get(normalized) ?? {}
              this.docs.set(normalized, { ...cloneDoc(existing), ...resolved })
            } else {
              this.docs.set(normalized, resolved)
            }
          })
        },
        update: (path: string, data: DataDocument) => {
          const normalized = normalizePath(path)
          pendingOps.push(() => {
            const existing = this.docs.get(normalized)
            if (!existing) {
              throw new DataError("not-found", `Document not found at ${normalized}`)
            }
            const now = new Date()
            const resolved = resolveSentinels(data, now) as DataDocument
            this.docs.set(normalized, { ...cloneDoc(existing), ...resolved })
          })
        },
        delete: (path: string) => {
          const normalized = normalizePath(path)
          pendingOps.push(() => {
            this.docs.delete(normalized)
          })
        },
      }

      const result = await fn(tx)

      if (this.version !== startVersion && readPaths.size > 0) {
        continue
      }

      if (pendingOps.length > 0) {
        for (const op of pendingOps) {
          op()
        }
        this.version += 1
        this.notifyAll()
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
    const normalized = normalizePath(path)

    const deliver = () => {
      if (!active) return
      try {
        onData(makeSnapshot(normalized, this.docs.get(normalized)))
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)))
      }
    }

    const entry: ListenerEntry = { notify: deliver }
    this.listeners.add(entry)
    queueMicrotask(deliver)

    return () => {
      active = false
      this.listeners.delete(entry)
    }
  }

  subscribeCollection(
    path: string,
    onData: (snapshot: DataQuerySnapshot) => void,
    onError?: (error: Error) => void,
    options?: DataQueryOptions,
  ): Unsubscribe {
    let active = true
    const normalized = normalizePath(path)

    const deliver = () => {
      if (!active) return
      void this.getCollection(normalized, options).then(
        (snap) => {
          if (active) onData(snap)
        },
        (err) => {
          if (active) onError?.(err instanceof Error ? err : new Error(String(err)))
        },
      )
    }

    const entry: ListenerEntry = { notify: deliver }
    this.listeners.add(entry)
    queueMicrotask(deliver)

    return () => {
      active = false
      this.listeners.delete(entry)
    }
  }

  subscribeCollectionGroup(
    collectionId: string,
    onData: (snapshot: DataQuerySnapshot) => void,
    onError?: (error: Error) => void,
    options?: DataQueryOptions,
  ): Unsubscribe {
    let active = true

    const deliver = () => {
      if (!active) return
      void this.getCollectionGroup(collectionId, options).then(
        (snap) => {
          if (active) onData(snap)
        },
        (err) => {
          if (active) onError?.(err instanceof Error ? err : new Error(String(err)))
        },
      )
    }

    const entry: ListenerEntry = { notify: deliver }
    this.listeners.add(entry)
    queueMicrotask(deliver)

    return () => {
      active = false
      this.listeners.delete(entry)
    }
  }

  async uploadFile(
    path: string,
    bytes: Uint8Array,
    contentType: string,
    metadata: Record<string, string> = {},
  ): Promise<string> {
    const normalized = normalizePath(path)
    this.files.set(normalized, {
      path: normalized,
      bytes: new Uint8Array(bytes),
      contentType: contentType || "application/octet-stream",
      metadata: { ...metadata },
      createdAt: Date.now(),
    })
    return `/api/files/${normalized.split("/").map(encodeURIComponent).join("/")}`
  }

  async deleteFile(path: string): Promise<void> {
    const normalized = normalizePath(path)
    this.files.delete(normalized)
  }

  getFile(path: string): StoredFileRecord | null {
    const normalized = normalizePath(path)
    return this.files.get(normalized) ?? null
  }
}
