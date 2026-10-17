/**
 * Firestore collection paths — single source of truth mirrored from the
 * Flutter app (lib/core/config/firebase_collection_constant.dart).
 * Path structure must NEVER diverge between the two clients.
 */

export const FIREBASE_COLLECTIONS = {
  /** Top-level user profiles collection */
  users: "users",
  /** users/{uid}/onboarding_tasks/{taskId} */
  onboardingTasks: "onboarding_tasks",
  /** users/{uid}/trainings/{trainingId} */
  trainings: "trainings",
  /** users/{uid}/clearance/{clearanceId} */
  clearanceItems: "clearance",
  /** onboarding_templates/{templateId} */
  onboardingTemplates: "onboarding_templates",
  /** training_templates/{templateId} */
  trainingTemplates: "training_templates",
  /** audit_logs/{logId} */
  auditLogs: "audit_logs",
  /** messages/{messageId} */
  messages: "messages",
  /** users/{uid}/notifications/{notificationId} */
  notifications: "notifications",
} as const
