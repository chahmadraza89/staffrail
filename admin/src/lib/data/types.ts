export type DataDocument = Record<string, unknown>

export interface DataDocRef {
  id: string
  path: string
}

export interface DataDocSnapshot {
  id: string
  path: string
  ref: DataDocRef & { parent: { parent: { id: string } | null } }
  exists: () => boolean
  data: () => DataDocument | undefined
}

export interface DataQuerySnapshot {
  docs: DataDocSnapshot[]
}

export interface DataFilter {
  field: string
  op: "==" | "in"
  value: unknown
}

export interface DataQueryOptions {
  filters?: DataFilter[]
  orderBy?: { field: string; direction: "asc" | "desc" }
  limit?: number
}

export interface DataTransaction {
  get: (path: string) => Promise<DataDocSnapshot>
  set: (path: string, data: DataDocument, options?: { merge?: boolean }) => void
  update: (path: string, data: DataDocument) => void
  delete: (path: string) => void
}

export interface StoredFileRecord {
  path: string
  bytes: Uint8Array
  contentType: string
  metadata: Record<string, string>
  createdAt: number
}

export interface AuthAccountRecord {
  uid: string
  email: string
  passwordHash: string
  passwordSalt: string
  emailVerified: boolean
  disabled: boolean
  lastAuthTime: number
  tokenValidAfter: number
}

export type Unsubscribe = () => void

export class DataError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "DataError"
    this.code = code
  }
}

export interface DataStore {
  getDoc: (path: string) => Promise<DataDocSnapshot>
  getCollection: (path: string, options?: DataQueryOptions) => Promise<DataQuerySnapshot>
  getCollectionGroup: (collectionId: string, options?: DataQueryOptions) => Promise<DataQuerySnapshot>
  setDoc: (path: string, data: DataDocument, options?: { merge?: boolean }) => Promise<void>
  updateDoc: (path: string, data: DataDocument) => Promise<void>
  addDoc: (collectionPath: string, data: DataDocument) => Promise<DataDocRef>
  deleteDoc: (path: string) => Promise<void>
  runTransaction: <T>(fn: (tx: DataTransaction) => Promise<T>) => Promise<T>
  subscribeDoc: (
    path: string,
    onData: (snapshot: DataDocSnapshot) => void,
    onError?: (error: Error) => void,
  ) => Unsubscribe
  subscribeCollection: (
    path: string,
    onData: (snapshot: DataQuerySnapshot) => void,
    onError?: (error: Error) => void,
    options?: DataQueryOptions,
  ) => Unsubscribe
  subscribeCollectionGroup: (
    collectionId: string,
    onData: (snapshot: DataQuerySnapshot) => void,
    onError?: (error: Error) => void,
    options?: DataQueryOptions,
  ) => Unsubscribe
  uploadFile: (
    path: string,
    bytes: Uint8Array,
    contentType: string,
    metadata?: Record<string, string>,
  ) => Promise<string>
  deleteFile: (path: string) => Promise<void>
  getFile: (path: string) => StoredFileRecord | null
}
