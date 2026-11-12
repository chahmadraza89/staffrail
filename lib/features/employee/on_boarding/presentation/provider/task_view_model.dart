import 'dart:developer';
import 'package:bhmh/core/config/firebase_storage_collecation_constant.dart';
import 'package:bhmh/core/error/app_failures.dart';
import 'package:bhmh/core/services/storage_service.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/on_boarding/data/data_source/file_picker_serivce.dart';
import 'package:bhmh/features/employee/on_boarding/data/data_source/onboarding_service.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// =============================================================================
// TASK VIEW MODEL (Riverpod 3.0 Notifier)
// =============================================================================
// Orchestrates all onboarding task actions:
// - Acknowledge → Firestore status update
// - Upload      → Storage upload + Firestore URL persistence
// - Sign        → Storage upload + Firestore URL persistence
//
// Design Decisions:
// 1. Uses AsyncValue<void> for one-shot action state (loading/error/done).
// 2. All errors are caught as typed Failures and surfaced to the UI.
// 3. UID is resolved at call-time from authStateProvider (no stale state).
// 4. File picker is a separate concern, injected via provider.
// =============================================================================

class TaskViewModel extends Notifier<AsyncValue<void>> {
  late final OnboardingService _onboardingService;
  late final StorageService _storageService;
  late final FilePickerService _filePickerService;

  @override
  AsyncValue<void> build() {
    _onboardingService = ref.read(onboardingServiceProvider);
    _storageService = ref.read(storageServiceProvider);
    _filePickerService = ref.read(filePickerServiceProvider);
    return const AsyncValue.data(null);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /// Resolves the current user's UID. Throws if not authenticated.
  String _requireUid() {
    final userAsync = ref.read(authStateProvider);
    final user = userAsync.maybeWhen(data: (user) => user, orElse: () => null);
    if (user == null) {
      throw const ValidationFailure(
        message: 'You must be signed in to perform this action.',
        code: 'not-authenticated',
      );
    }
    return user.uid;
  }

  /// Resolves the current user's Admin ID (if they are an employee).
  String? _getAdminId() {
    final userAsync = ref.read(currentUserProvider);
    return userAsync.maybeWhen(data: (user) => user?.adminId, orElse: () => null);
  }

  /// Resolves the current user's full name.
  String? _getUserName() {
    final userAsync = ref.read(currentUserProvider);
    return userAsync.maybeWhen(data: (user) => user?.name, orElse: () => null);
  }

  // ── Save as Draft ─────────────────────────────────────────────────────────

  /// Saves progress WITHOUT submitting or locking the task.
  Future<bool> saveDraft({
    required String taskId,
    String? fileUrl,
    String? signatureData,
    String? taskTitle,
  }) async {
    state = const AsyncValue.loading();
    try {
      final uid = _requireUid();

      await _onboardingService.updateTaskStatus(
        uid: uid,
        taskId: taskId,
        status: TaskStatus.pending,
        isCompleted: false,
        isDraft: true,
        fileUrl: fileUrl,
        signatureUrl: signatureData,
        adminId: _getAdminId(),
        employeeName: _getUserName(),
        taskTitle: taskTitle,
      );

      log('✅ [VM] Draft saved for task $taskId');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [VM] Save draft error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [VM] Unexpected save draft error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // ── Submit Task (Final) ───────────────────────────────────────────────────

  /// Validates and submits the task. Locks editing, triggers HR workflow.
  Future<bool> submitTask({
    required String taskId,
    required TaskStatus status,
    String? fileUrl,
    String? signatureData,
    Map<String, dynamic>? formData,
    String? taskTitle,
  }) async {
    state = const AsyncValue.loading();
    try {
      final uid = _requireUid();

      // ── Hard Validation ────────────────────────────────────────────────────
      if (status == TaskStatus.submitted &&
          (fileUrl == null || fileUrl.isEmpty)) {
        throw const ValidationFailure(
          message: 'A file upload is required before submitting.',
          code: 'missing-file',
        );
      }
      if (status == TaskStatus.signed &&
          (signatureData == null || signatureData.isEmpty)) {
        throw const ValidationFailure(
          message: 'A signature is required before submitting.',
          code: 'missing-signature',
        );
      }

      // ── Submission ────────────────────────────────────────────────────────
      await _onboardingService.updateTaskStatus(
        uid: uid,
        taskId: taskId,
        status: status,
        isCompleted:
            status == TaskStatus.signed || status == TaskStatus.acknowledged,
        isDraft: false,
        fileUrl: fileUrl,
        signatureUrl: signatureData,
        formData: formData,
        adminId: _getAdminId(),
        employeeName: _getUserName(),
        taskTitle: taskTitle,
      );

      log('✅ [VM] Task $taskId submitted as ${status.name}');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [VM] Submit error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [VM] Unexpected submit error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // ── Submit Form Data ──────────────────────────────────────────────────────

  /// Validates and submits form data for HR documents.
  Future<bool> submitFormData({
    required String taskId,
    required Map<String, dynamic> formData,
    String? fileUrl,
    String? taskTitle,
    bool isDraft = false,
  }) async {
    state = const AsyncValue.loading();
    try {
      final uid = _requireUid();

      // ── Hard Validation (If not draft) ─────────────────────────────────────
      // Only reject if the form is completely empty.
      // Individual field-level validation (required vs optional) is handled
      // by the UI layer (DynamicFormBuilder / FormFieldSchema).
      if (!isDraft) {
        final hasAnyData = formData.values.any(
          (v) => v != null && (v is! String || v.trim().isNotEmpty),
        );
        if (!hasAnyData && (fileUrl == null || fileUrl.isEmpty)) {
          throw const ValidationFailure(
            message: 'Please fill in at least the required fields before submitting.',
            code: 'incomplete-form',
          );
        }
      }

      await _onboardingService.updateTaskStatus(
        uid: uid,
        taskId: taskId,
        status: isDraft ? TaskStatus.pending : TaskStatus.submitted,
        isCompleted: !isDraft,
        isDraft: isDraft,
        formData: formData,
        fileUrl: fileUrl,
        signedAt: isDraft ? null : DateTime.now(),
        employeeName: _getUserName(),
        taskTitle: taskTitle,
      );

      log('✅ [VM] Form ${isDraft ? 'drafted' : 'submitted'} for task $taskId');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [VM] Form submit error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [VM] Unexpected form error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // ── Acknowledge Task ──────────────────────────────────────────────────────

  /// Acknowledges a task (checkbox + submit).
  Future<bool> acknowledgeTask({
    required String taskId,
    String? taskTitle,
  }) async {
    state = const AsyncValue.loading();
    try {
      final uid = _requireUid();

      await _onboardingService.updateTaskStatus(
        uid: uid,
        taskId: taskId,
        status: TaskStatus.acknowledged,
        isCompleted: true,
        isDraft: false,
        adminId: _getAdminId(),
        employeeName: _getUserName(),
        taskTitle: taskTitle,
      );

      log('✅ [VM] Task $taskId acknowledged');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [VM] Acknowledge error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [VM] Unexpected acknowledge error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // ── Upload File ───────────────────────────────────────────────────────────

  /// Uploads a file to Firebase Storage and persists the download URL in Firestore.
  /// Cross-platform: Handles both mobile (path) and web (bytes).
  Future<bool> uploadFileForTask({
    required String taskId,
    PlatformFile? file,
    String? taskTitle,
    bool asDraft = false,
  }) async {
    state = const AsyncValue.loading();
    try {
      if (file == null) {
        throw const ValidationFailure(
          message: 'No file selected. Please choose a file to upload.',
          code: 'no-file',
        );
      }

      final bytes = file.bytes;
      if (bytes == null || bytes.isEmpty) {
        throw const ValidationFailure(
          message: 'Could not read file data. Please try again.',
          code: 'read-error',
        );
      }

      final uid = _requireUid();

      // 1. Upload to Firebase Storage
      final fileName =
          '${DateTime.now().millisecondsSinceEpoch}_${file.name.replaceAll(' ', '_')}';
      final storagePath = StoragePaths.onboardingDocument(
        uid: uid,
        taskId: taskId,
        fileName: fileName,
      );

      final downloadUrl = await _storageService.uploadFile(
        fileBytes: bytes,
        fileName: file.name,
        storagePath: storagePath,
        customMetadata: {'taskId': taskId, 'uploadedBy': uid},
      );

      // 2. Persist download URL in Firestore
      await _onboardingService.updateTaskStatus(
        uid: uid,
        taskId: taskId,
        status: asDraft ? TaskStatus.pending : TaskStatus.submitted,
        isCompleted: false,
        isDraft: asDraft,
        fileUrl: downloadUrl,
        adminId: _getAdminId(),
        employeeName: _getUserName(),
        taskTitle: taskTitle,
      );

      log('✅ [VM] File ${asDraft ? 'drafted' : 'uploaded'} for task $taskId');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [VM] Upload error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [VM] Unexpected upload error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  /// Uploads a file to Firebase Storage and returns the download URL, WITHOUT updating task status.
  Future<String?> uploadOnly({
    required String taskId,
    required PlatformFile file,
  }) async {
    state = const AsyncValue.loading();
    try {
      final bytes = file.bytes;
      if (bytes == null || bytes.isEmpty) {
        throw const ValidationFailure(
          message: 'Could not read file data. Please try again.',
          code: 'read-error',
        );
      }

      final uid = _requireUid();

      // 1. Upload to Firebase Storage
      final fileName =
          '${DateTime.now().millisecondsSinceEpoch}_${file.name.replaceAll(' ', '_')}';
      final storagePath = StoragePaths.onboardingDocument(
        uid: uid,
        taskId: taskId,
        fileName: fileName,
      );

      final downloadUrl = await _storageService.uploadFile(
        fileBytes: bytes,
        fileName: file.name,
        storagePath: storagePath,
        customMetadata: {'taskId': taskId, 'uploadedBy': uid},
      );

      state = const AsyncValue.data(null);
      return downloadUrl;
    } on Failure catch (e) {
      log('❌ [VM] uploadOnly error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return null;
    } catch (e, stack) {
      log('❌ [VM] Unexpected uploadOnly error: $e');
      state = AsyncValue.error(e, stack);
      return null;
    }
  }

  // ── Sign Task ─────────────────────────────────────────────────────────────

  /// Saves a digital signature by uploading the signature image to Storage
  /// and persisting the URL in Firestore.
  Future<bool> signTask({
    required String taskId,
    required String signatureData,
    Map<String, dynamic>? formData,
    String? taskTitle,
    bool asDraft = false,
  }) async {
    state = const AsyncValue.loading();
    try {
      if (signatureData.isEmpty) {
        throw const ValidationFailure(
          message: 'Signature is empty. Please sign before submitting.',
          code: 'empty-signature',
        );
      }

      final uid = _requireUid();

      await _onboardingService.updateTaskStatus(
        uid: uid,
        taskId: taskId,
        status: asDraft ? TaskStatus.pending : TaskStatus.signed,
        isCompleted: !asDraft,
        isDraft: asDraft,
        signatureUrl: signatureData,
        formData: formData,
        adminId: _getAdminId(),
        employeeName: _getUserName(),
        taskTitle: taskTitle,
      );

      log('✅ [VM] Task $taskId ${asDraft ? 'drafted' : 'signed'}');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [VM] Sign error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [VM] Unexpected sign error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // ── Update Task Status (Generic) ──────────────────────────────────────────

  /// Generic status update for any task.
  Future<bool> updateTaskStatus({
    required String taskId,
    required TaskStatus status,
    String? taskTitle,
  }) async {
    state = const AsyncValue.loading();
    try {
      final uid = _requireUid();

      final isCompleted =
          status == TaskStatus.completed ||
          status == TaskStatus.verified ||
          status == TaskStatus.cleared ||
          status == TaskStatus.signed ||
          status == TaskStatus.acknowledged;

      await _onboardingService.updateTaskStatus(
        uid: uid,
        taskId: taskId,
        status: status,
        isCompleted: isCompleted,
        adminId: _getAdminId(),
        employeeName: _getUserName(),
        taskTitle: taskTitle,
      );

      log('✅ [VM] Task $taskId status → ${status.name}');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [VM] Status update error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [VM] Unexpected status error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // ── Pick File ─────────────────────────────────────────────────────────────

  /// Opens the native file picker. Returns null if the user cancels.
  Future<PlatformFile?> pickFile({
    FileType fileType = FileType.any,
    List<String>? allowedExtensions,
  }) async {
    try {
      return await _filePickerService.pickFile(
        fileType: fileType,
        allowedExtensions: allowedExtensions,
      );
    } catch (e, stack) {
      log('❌ [VM] Pick file error: $e');
      state = AsyncValue.error(e, stack);
      return null;
    }
  }

  // ── v0.1: Split-Field Form Methods ──────────────────────────────────────

  /// Employee submits their side of a split-field form.
  /// Sets status to [pendingEmployerSignature] — awaits admin counter-sign.
  Future<bool> submitSplitForm({
    required String taskId,
    required Map<String, dynamic> formData,
    required String signatureData,
    String? fileUrl,
    String? taskTitle,
  }) async {
    state = const AsyncValue.loading();
    try {
      final uid = _requireUid();
      await _onboardingService.updateTaskStatus(
        uid: uid,
        taskId: taskId,
        status: TaskStatus.pendingEmployerSignature,
        isCompleted: false,
        formData: formData,
        fileUrl: fileUrl,
        signatureUrl: signatureData.isNotEmpty ? signatureData : null,
        signedAt: DateTime.now(),
        adminId: _getAdminId(),
        employeeName: _getUserName(),
        taskTitle: taskTitle,
      );

      log('✅ [VM] Split form submitted: $taskId → pendingEmployerSignature');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [VM] Split form error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [VM] Unexpected split form error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  /// Admin counter-signs a split-field form.
  /// Sets status to [completed] with [isLocked: true].
  Future<bool> adminCounterSign({
    required String taskId,
    required Map<String, dynamic> adminFormData,
    required String adminSignatureData,
    String? employeeId,
    String? taskTitle,
  }) async {
    state = const AsyncValue.loading();
    try {
      final uid = employeeId ?? _requireUid();
      await _onboardingService.updateTaskStatus(
        uid: uid,
        taskId: taskId,
        status: TaskStatus.completed,
        isCompleted: true,
        adminFormData: adminFormData,
        adminSignatureUrl: adminSignatureData,
        signedAt: DateTime.now(),
        adminId: _getAdminId(),
        employeeName: _getUserName(),
        taskTitle: taskTitle,
      );

      log('✅ [VM] Admin counter-signed: $taskId → completed + locked');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [VM] Counter-sign error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [VM] Unexpected counter-sign error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  /// Admin saves progress on a split-field form without finalizing.
  Future<bool> saveAdminDraft({
    required String taskId,
    required Map<String, dynamic> adminFormData,
    required TaskStatus currentStatus,
    String? employeeId,
    String? taskTitle,
  }) async {
    state = const AsyncValue.loading();
    try {
      final uid = employeeId ?? _requireUid();
      await _onboardingService.updateTaskStatus(
        uid: uid,
        taskId: taskId,
        status: currentStatus,
        isCompleted: false,
        adminFormData: adminFormData,
        adminId: _getAdminId(),
        taskTitle: taskTitle,
      );

      log('✅ [VM] Admin draft saved: $taskId');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [VM] Save admin draft error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [VM] Unexpected save admin draft error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }
}
