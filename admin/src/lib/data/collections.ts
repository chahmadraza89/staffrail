/**
 * Logical collection paths shared across the database-free store,
 * server route handlers, and client repositories.
 */
export const DATA_COLLECTIONS = {
  users: "users",
  onboardingTasks: "onboarding_tasks",
  trainings: "trainings",
  clearanceItems: "clearance",
  onboardingTemplates: "onboarding_templates",
  trainingTemplates: "training_templates",
  auditLogs: "audit_logs",
  messages: "messages",
  notifications: "notifications",
} as const
