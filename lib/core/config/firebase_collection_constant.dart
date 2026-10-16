// =============================================================================
// FIREBASE COLLECTION CONSTANTS
// =============================================================================
// Single source of truth for all Firestore collection paths.
// Prevents typos, enables refactoring, and enforces consistency.
// Usage: import as `FirebaseConstant` → FirebaseConstant.users
// =============================================================================

/// Top-level user profiles collection
const String users = "users";

/// Onboarding tasks assigned to a user (sub-collection under users)
/// Path: users/{uid}/onboarding_tasks/{taskId}
const String onboardingTasks = "onboarding_tasks";

/// Training items assigned to a user (sub-collection under users)
/// Path: users/{uid}/trainings/{trainingId}
const String trainings = "trainings";

/// Global onboarding task templates (admin-defined)
/// Path: onboarding_templates/{templateId}
const String onboardingTemplates = "onboarding_templates";

/// Global training templates (admin-defined)
/// Path: training_templates/{templateId}
const String trainingTemplates = "training_templates";

/// Background clearance items for a user (sub-collection under users)
/// Path: users/{uid}/clearance/{clearanceId}
const String clearanceItems = "clearance";

/// Audit logs for tracking user actions (top-level collection or as needed)
/// Path: audit_logs/{logId}
const String auditLogs = "audit_logs";

/// System messages and broadcast announcements
/// Path: messages/{messageId}
const String messages = "messages";

/// User-specific notifications and alerts
/// Path: users/{uid}/notifications/{notificationId}
const String notifications = "notifications";
