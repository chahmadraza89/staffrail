// =============================================================================
// FIREBASE STORAGE PATH CONSTANTS
// =============================================================================
// Single source of truth for all Firebase Storage folder paths.
// All paths are relative to the storage bucket root.
// Dynamic segments (e.g., {uid}) must be interpolated at runtime.
// =============================================================================

class StoragePaths {
  StoragePaths._(); // Prevent instantiation

  // ── Base Segments ─────────────────────────────────────────────────────────
  static const String _usersRoot = 'users';

  // ── Onboarding Documents ──────────────────────────────────────────────────
  /// Path: users/{uid}/onboarding/{taskId}/{filename}
  static String onboardingDocument({
    required String uid,
    required String taskId,
    required String fileName,
  }) =>
      '$_usersRoot/$uid/onboarding/$taskId/$fileName';

  /// Folder path for listing all onboarding files for a task
  static String onboardingFolder({
    required String uid,
    required String taskId,
  }) =>
      '$_usersRoot/$uid/onboarding/$taskId';

  // ── Training Certificates ─────────────────────────────────────────────────
  /// Path: users/{uid}/training/{trainingId}/{filename}
  static String trainingCertificate({
    required String uid,
    required String trainingId,
    required String fileName,
  }) =>
      '$_usersRoot/$uid/training/$trainingId/$fileName';

  /// Folder path for listing all training files
  static String trainingFolder({
    required String uid,
    required String trainingId,
  }) =>
      '$_usersRoot/$uid/training/$trainingId';

  // ── Profile Images ────────────────────────────────────────────────────────
  /// Path: users/{uid}/profile/{filename}
  static String profileImage({
    required String uid,
    required String fileName,
  }) =>
      '$_usersRoot/$uid/profile/$fileName';

  // ── Digital Signatures ────────────────────────────────────────────────────
  /// Path: users/{uid}/signatures/{taskId}/{filename}
  static String signatureImage({
    required String uid,
    required String taskId,
    required String fileName,
  }) =>
      '$_usersRoot/$uid/signatures/$taskId/$fileName';
}
