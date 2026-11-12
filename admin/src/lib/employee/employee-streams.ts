import { getClientDataStore } from "@/lib/data/client-store"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import type { DataStore, Unsubscribe } from "@/lib/data/types"
import {
  mapClearanceDoc,
  mapTaskDoc,
  mapTrainingDoc,
  type EmployeeClearanceDoc,
  type EmployeeTaskDoc,
  type EmployeeTrainingDoc,
} from "@/lib/admin/employee-detail-streams"
import {
  computeModuleProgress,
  type ModuleProgress,
} from "@/lib/admin/progress-models"
import {
  buildComplianceModel,
  mapClearanceStatus,
  mapTrainingStatus,
} from "@/lib/admin/compliance-helpers"
import { STATUS_UI, type TaskStatus } from "@/lib/admin/task-status"

export type ComplianceModel = ReturnType<typeof buildComplianceModel>

export function formatPortalStatus(status: string): string {
  if (status in STATUS_UI) {
    return STATUS_UI[status as TaskStatus].label
  }
  switch (status) {
    case "actionRequired":
      return "Action Required"
    case "overdue":
      return "Overdue"
    case "inProgress":
      return "In Progress"
    case "cleared":
      return "Cleared"
    default:
      return status
  }
}

export { mapClearanceStatus, mapTrainingStatus }

export interface EmployeeProfileData {
  uid: string
  name: string
  email: string
  role: string
  isActive: boolean
  adminId: string | null
  photoUrl: string | null
  department: string | null
  phoneNumber: string | null
  notificationPreferences: {
    pushEnabled: boolean
    emailEnabled: boolean
    taskReminders: boolean
    adminAlerts: boolean
  }
}

export interface EmployeeWorkspaceSnapshot {
  profile: EmployeeProfileData | null
  tasks: EmployeeTaskDoc[]
  trainings: EmployeeTrainingDoc[]
  clearances: EmployeeClearanceDoc[]
  progress: ModuleProgress
  compliance: ComplianceModel
  ready: {
    profile: boolean
    tasks: boolean
    trainings: boolean
    clearances: boolean
  }
}

export const EMPTY_EMPLOYEE_WORKSPACE: EmployeeWorkspaceSnapshot = {
  profile: null,
  tasks: [],
  trainings: [],
  clearances: [],
  progress: {
    overall: 0,
    onboarding: 0,
    training: 0,
    clearance: 0,
  },
  compliance: buildComplianceModel({
    tasks: { kind: "pending" },
    trainings: { kind: "pending" },
    clearances: { kind: "pending" },
  }),
  ready: {
    profile: false,
    tasks: false,
    trainings: false,
    clearances: false,
  },
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function mapProfile(uid: string, data: Record<string, unknown>): EmployeeProfileData {
  const rawPrefs =
    data.notificationPreferences && typeof data.notificationPreferences === "object"
      ? (data.notificationPreferences as Record<string, unknown>)
      : {}
  return {
    uid,
    name: asString(data.name) || asString(data.email) || "Employee",
    email: asString(data.email),
    role: asString(data.role) || "employee",
    isActive: data.isActive === true,
    adminId: asString(data.adminId) || null,
    photoUrl: asString(data.photoUrl) || null,
    department: asString(data.department) || null,
    phoneNumber: asString(data.phoneNumber) || null,
    notificationPreferences: {
      pushEnabled: rawPrefs.pushEnabled !== false,
      emailEnabled: rawPrefs.emailEnabled !== false,
      taskReminders: rawPrefs.taskReminders !== false,
      adminAlerts: rawPrefs.adminAlerts !== false,
    },
  }
}

export function subscribeEmployeeWorkspace(
  uid: string,
  onData: (snapshot: EmployeeWorkspaceSnapshot) => void,
  onError?: (error: Error) => void,
  store?: DataStore,
): Unsubscribe {
  if (!uid.trim()) {
    onData(EMPTY_EMPLOYEE_WORKSPACE)
    return () => {}
  }

  try {
    const db = store ?? getClientDataStore()
    let profile: EmployeeProfileData | null = null
    let tasks: EmployeeTaskDoc[] = []
    let trainings: EmployeeTrainingDoc[] = []
    let clearances: EmployeeClearanceDoc[] = []
    const ready = {
      profile: false,
      tasks: false,
      trainings: false,
      clearances: false,
    }

    const emit = () => {
      const progress = computeModuleProgress({
        tasks,
        trainings,
        clearances,
      })
      const compliance = buildComplianceModel({
        tasks: ready.tasks ? { kind: "ready", items: tasks } : { kind: "pending" },
        trainings: ready.trainings ? { kind: "ready", items: trainings } : { kind: "pending" },
        clearances: ready.clearances ? { kind: "ready", items: clearances } : { kind: "pending" },
      })
      onData({
        profile,
        tasks,
        trainings,
        clearances,
        progress,
        compliance,
        ready: { ...ready },
      })
    }

    const handleErr = (err: unknown) => {
      onError?.(err instanceof Error ? err : new Error(String(err)))
    }

    const unsubProfile = db.subscribeDoc(
      `${DATA_COLLECTIONS.users}/${uid}`,
      (snap) => {
        profile = snap.exists()
          ? mapProfile(uid, (snap.data() ?? {}) as Record<string, unknown>)
          : null
        ready.profile = true
        emit()
      },
      handleErr,
    )

    const unsubTasks = db.subscribeCollection(
      `${DATA_COLLECTIONS.users}/${uid}/${DATA_COLLECTIONS.onboardingTasks}`,
      (snap) => {
        tasks = snap.docs.map((d) => mapTaskDoc(d.id, (d.data() ?? {}) as Record<string, unknown>))
        ready.tasks = true
        emit()
      },
      handleErr,
    )

    const unsubTrainings = db.subscribeCollection(
      `${DATA_COLLECTIONS.users}/${uid}/${DATA_COLLECTIONS.trainings}`,
      (snap) => {
        trainings = snap.docs.map((d) =>
          mapTrainingDoc(d.id, (d.data() ?? {}) as Record<string, unknown>),
        )
        ready.trainings = true
        emit()
      },
      handleErr,
    )

    const unsubClearance = db.subscribeCollection(
      `${DATA_COLLECTIONS.users}/${uid}/${DATA_COLLECTIONS.clearanceItems}`,
      (snap) => {
        clearances = snap.docs.map((d) =>
          mapClearanceDoc(d.id, (d.data() ?? {}) as Record<string, unknown>),
        )
        ready.clearances = true
        emit()
      },
      handleErr,
    )

    return () => {
      unsubProfile()
      unsubTasks()
      unsubTrainings()
      unsubClearance()
    }
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)))
    return () => {}
  }
}
