import {
  DEFAULT_CLEARANCES,
  DEFAULT_ONBOARDING_TASKS,
  DEFAULT_TRAININGS,
  clearanceFields,
  onboardingTaskFields,
  trainingFields,
} from "@/lib/admin/seed-templates"
import { DATA_COLLECTIONS } from "@/lib/data/collections"
import type { MemoryDataStore } from "@/lib/data/memory-store"

export const DEMO_CREDENTIALS = {
  adminEmail: "admin@staffrail.local",
  employeeEmail: "employee@staffrail.local",
  password: "DemoPassword123!",
} as const

export interface DemoUserSeed {
  uid: string
  email: string
  name: string
  role: "admin" | "employee"
  isActive: boolean
  adminId: string | null
  department: string | null
  phoneNumber: string | null
  emailVerified: boolean
}

export const DEMO_USERS: readonly DemoUserSeed[] = [
  {
    uid: "demo-admin-1",
    email: DEMO_CREDENTIALS.adminEmail,
    name: "Jordan Taylor",
    role: "admin",
    isActive: true,
    adminId: null,
    department: "Compliance & Operations",
    phoneNumber: "+1 (555) 010-1000",
    emailVerified: true,
  },
  {
    uid: "demo-emp-1",
    email: DEMO_CREDENTIALS.employeeEmail,
    name: "Alex Morgan",
    role: "employee",
    isActive: true,
    adminId: "demo-admin-1",
    department: "Clinical Services",
    phoneNumber: "+1 (555) 010-2001",
    emailVerified: true,
  },
  {
    uid: "demo-emp-2",
    email: "samira@staffrail.local",
    name: "Samira Patel",
    role: "employee",
    isActive: true,
    adminId: "demo-admin-1",
    department: "Behavioral Care",
    phoneNumber: "+1 (555) 010-2002",
    emailVerified: true,
  },
  {
    uid: "demo-emp-3",
    email: "chris@staffrail.local",
    name: "Chris Lee",
    role: "employee",
    isActive: true,
    adminId: "demo-admin-1",
    department: "Intake & Outreach",
    phoneNumber: "+1 (555) 010-2003",
    emailVerified: true,
  },
] as const

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

function seedEmployeeSubcollections(
  store: MemoryDataStore,
  emp: DemoUserSeed,
  variant: "advanced" | "review-ready" | "fresh",
): void {
  const ctx = {
    employeeId: emp.uid,
    employeeName: emp.name,
    adminId: emp.adminId ?? "demo-admin-1",
  }

  for (const task of DEFAULT_ONBOARDING_TASKS) {
    const fields = onboardingTaskFields(task, ctx)
    fields.updatedAt = daysAgo(3)

    if (variant === "advanced") {
      if (task.id === "onboarding_acknowledgment_form") {
        fields.status = "verified"
        fields.isCompleted = true
        fields.signedAt = daysAgo(4)
        fields.completedAt = daysAgo(4)
        fields.signatureUrl = `typed:${emp.name}`
        fields.formData = { fullName: emp.name, acknowledged: true }
      } else if (task.id === "confidentiality_statement") {
        fields.status = "submitted"
        fields.signedAt = daysAgo(1)
        fields.signatureUrl = `typed:${emp.name}`
        fields.formData = { fullName: emp.name, agreed: true }
      } else if (task.id === "tax_documents_i_9") {
        fields.status = "pendingEmployerSignature"
        fields.signedAt = daysAgo(1)
        fields.signatureUrl = `typed:${emp.name}`
        fields.formData = {
          fullName: emp.name,
          citizenshipStatus: "A citizen of the United States",
          completedVirtually: "true",
        }
      } else if (task.id === "signed_offer_letter") {
        fields.status = "verified"
        fields.isCompleted = true
        fields.completedAt = daysAgo(5)
        fields.fileUrl = "/api/files/demo/signed_offer_letter.pdf"
      } else if (task.id === "resume") {
        fields.status = "submitted"
        fields.fileUrl = "/api/files/demo/alex_morgan_resume.pdf"
      }
    } else if (variant === "review-ready") {
      if (task.id === "onboarding_acknowledgment_form") {
        fields.status = "submitted"
        fields.signedAt = daysAgo(1)
        fields.signatureUrl = `typed:${emp.name}`
        fields.formData = { fullName: emp.name }
      } else if (task.id === "driver's_verification") {
        fields.status = "pendingEmployerSignature"
        fields.signedAt = daysAgo(1)
        fields.signatureUrl = `typed:${emp.name}`
        fields.formData = { ack_license: "true", ack_future: "true" }
      } else if (task.id === "job_description_acknowledgment") {
        fields.status = "verified"
        fields.isCompleted = true
        fields.completedAt = new Date()
        fields.signatureUrl = `typed:${emp.name}`
      }
    }

    store.docs.set(
      `${DATA_COLLECTIONS.users}/${emp.uid}/${DATA_COLLECTIONS.onboardingTasks}/${task.id}`,
      fields,
    )
  }

  for (const training of DEFAULT_TRAININGS) {
    const fields = trainingFields(training, ctx, daysAgo(10))
    fields.updatedAt = daysAgo(2)

    if (variant === "advanced") {
      if (training.id === "hipaa" || training.id === "cpr___first_aid") {
        fields.status = "verified"
        fields.completedAt = daysAgo(3)
        fields.completionDate = daysAgo(3)
        fields.certificateUrls = [`/api/files/demo/${training.id}_certificate.pdf`]
      } else if (training.id === "start") {
        fields.status = "underReview"
        fields.completedAt = daysAgo(1)
        fields.completionDate = daysAgo(1)
        fields.dueDate = daysFromNow(14)
        fields.certificateUrls = ["/api/files/demo/start_certificate.pdf"]
      }
    } else if (variant === "review-ready" && training.id === "hipaa") {
      fields.status = "underReview"
      fields.completedAt = daysAgo(1)
      fields.completionDate = daysAgo(1)
      fields.dueDate = daysFromNow(7)
      fields.certificateUrls = ["/api/files/demo/hipaa_samira.pdf"]
    }

    store.docs.set(
      `${DATA_COLLECTIONS.users}/${emp.uid}/${DATA_COLLECTIONS.trainings}/${training.id}`,
      fields,
    )
  }

  for (const clearance of DEFAULT_CLEARANCES) {
    const fields = clearanceFields(clearance, ctx)
    fields.updatedAt = daysAgo(2)

    if (variant === "advanced" && clearance.id === "tb_status_report") {
      fields.status = "verified"
      fields.submittedAt = daysAgo(5)
      fields.verifiedAt = daysAgo(4)
      fields.fileUrl = "/api/files/demo/tb_status_report.pdf"
    } else if (
      variant === "review-ready" &&
      clearance.id === "criminal_background_verification_report"
    ) {
      fields.status = "underReview"
      fields.submittedAt = daysAgo(1)
      fields.fileUrl = "/api/files/demo/background_check_samira.pdf"
    }

    store.docs.set(
      `${DATA_COLLECTIONS.users}/${emp.uid}/${DATA_COLLECTIONS.clearanceItems}/${clearance.id}`,
      fields,
    )
  }
}

export function seedDemoWorkspace(store: MemoryDataStore): void {
  if (store.docs.size > 0) {
    return
  }

  for (const user of DEMO_USERS) {
    store.docs.set(`${DATA_COLLECTIONS.users}/${user.uid}`, {
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      adminId: user.adminId,
      department: user.department,
      phoneNumber: user.phoneNumber,
      photoUrl: null,
      createdAt: daysAgo(14),
      lastLogin: daysAgo(1),
      updatedAt: daysAgo(1),
      setupStatus: "complete",
      notificationPreferences: {
        pushEnabled: true,
        emailEnabled: true,
        taskReminders: true,
        adminAlerts: true,
      },
    })
  }

  seedEmployeeSubcollections(store, DEMO_USERS[1], "advanced")
  seedEmployeeSubcollections(store, DEMO_USERS[2], "review-ready")
  seedEmployeeSubcollections(store, DEMO_USERS[3], "fresh")

  // Seed training templates
  const templates = [
    {
      id: "hipaa",
      title: "HIPAA Privacy & Security",
      description: "Annual patient confidentiality, HIPAA safeguards, and breach reporting.",
      durationText: "2 hours",
      requirementType: "certificate",
      isActive: true,
      adminId: "demo-admin-1",
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30),
    },
    {
      id: "cpr___first_aid",
      title: "CPR / First Aid",
      description: "Basic life support, CPR certification, and emergency response readiness.",
      durationText: "4 hours",
      requirementType: "certificate",
      isActive: true,
      adminId: "demo-admin-1",
      createdAt: daysAgo(25),
      updatedAt: daysAgo(25),
    },
    {
      id: "start",
      title: "START Core Training",
      description: "Foundational clinical intake, documentation, and safety curriculum.",
      durationText: "8 hours",
      requirementType: "certificate",
      isActive: true,
      adminId: "demo-admin-1",
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    },
  ]

  for (const tpl of templates) {
    store.docs.set(`${DATA_COLLECTIONS.trainingTemplates}/${tpl.id}`, tpl)
  }

  // Seed sample PDFs in file store so demo links resolve cleanly
  const samplePdfBytes = new TextEncoder().encode(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n",
  )
  for (const name of [
    "signed_offer_letter.pdf",
    "alex_morgan_resume.pdf",
    "hipaa_certificate.pdf",
    "cpr___first_aid_certificate.pdf",
    "start_certificate.pdf",
    "hipaa_samira.pdf",
    "tb_status_report.pdf",
    "background_check_samira.pdf",
  ]) {
    store.files.set(`demo/${name}`, {
      path: `demo/${name}`,
      bytes: samplePdfBytes,
      contentType: "application/pdf",
      metadata: { demo: "true" },
      createdAt: Date.now(),
    })
  }

  // Seed notifications
  store.docs.set(
    `${DATA_COLLECTIONS.users}/demo-admin-1/${DATA_COLLECTIONS.notifications}/notif-1`,
    {
      userId: "demo-admin-1",
      title: "Clearance Document Uploaded",
      body: "Samira Patel submitted Criminal Background Verification Report for verification.",
      type: "info",
      isRead: false,
      timestamp: daysAgo(1),
    },
  )
  store.docs.set(
    `${DATA_COLLECTIONS.users}/demo-emp-1/${DATA_COLLECTIONS.notifications}/notif-emp-1`,
    {
      userId: "demo-emp-1",
      title: "Welcome to StaffRail",
      body: "Please review and complete your pending onboarding and training items.",
      type: "info",
      isRead: false,
      timestamp: daysAgo(5),
    },
  )

  // Seed messages
  store.docs.set(`${DATA_COLLECTIONS.messages}/msg-1`, {
    title: "Q4 Compliance Reminders",
    content: "Please ensure all annual training certificates and clearance documents are uploaded by month end.",
    authorId: "demo-admin-1",
    authorName: "Jordan Taylor",
    recipientId: "broadcast",
    isPushEnabled: true,
    timestamp: daysAgo(2),
  })

  // Seed audit logs
  store.docs.set(`${DATA_COLLECTIONS.auditLogs}/audit-1`, {
    actorId: "demo-admin-1",
    actorName: "Jordan Taylor",
    actionType: "CLEARANCE_VERIFIED",
    targetId: "demo-emp-1",
    description: "Verified TB Status Report for Alex Morgan",
    metadata: { clearanceId: "tb_status_report" },
    platform: "web",
    timestamp: daysAgo(4),
  })
}
