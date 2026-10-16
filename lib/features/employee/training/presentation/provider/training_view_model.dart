import 'dart:developer';
import 'dart:typed_data';

import 'package:bhmh/core/config/firebase_storage_collecation_constant.dart';
import 'package:bhmh/core/error/app_failures.dart';
import 'package:bhmh/core/services/storage_service.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/training/data/data_source/training_service.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/presentation/provider/training_provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// =============================================================================
// TRAINING VIEW MODEL (Riverpod 3.0 Notifier)
// =============================================================================
// Orchestrates training certificate uploads and status transitions.
//
// Architecture matches TaskViewModel:
// - AsyncValue<void> for one-shot action state
// - Typed Failure propagation
// - UID resolved from auth state at call-time
// - Cross-platform: Uses Uint8List for uploads to support Web/Mobile.
// =============================================================================

class TrainingViewModel extends Notifier<AsyncValue<void>> {
  late final TrainingService _trainingService;
  late final StorageService _storageService;

  @override
  AsyncValue<void> build() {
    _trainingService = ref.read(trainingServiceProvider);
    _storageService = ref.read(storageServiceProvider);
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

  // ── Submit Certificate ────────────────────────────────────────────────────

  /// Uploads a certificate file to Storage and persists the URL in Firestore.
  /// Uses PlatformFile and raw bytes for Web & Mobile compatibility.
  Future<bool> submitCertificate({
    required String trainingId,
    required PlatformFile? file,
    DateTime? completionDate,
    DateTime? expirationDate,
    bool? noExpiration,
  }) async {
    if (file == null) {
      state = AsyncValue.error(
        const ValidationFailure(message: 'No file selected.'),
        StackTrace.current,
      );
      return false;
    }

    state = const AsyncValue.loading();
    try {
      final uid = _requireUid();

      // ── 1. Extract File Bytes ──
      // Always use bytes (Uint8List) for cross-platform consistency.
      final Uint8List? fileBytes = file.bytes;
      if (fileBytes == null || fileBytes.isEmpty) {
        throw const ValidationFailure(
          message: 'The selected file is empty or could not be read.',
          code: 'file-empty',
        );
      }

      // ── 2. Determine Storage Path ──
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final safeFileName = file.name.replaceAll(RegExp(r'\s+'), '_');
      final fileName = '${timestamp}_$safeFileName';

      final storagePath = StoragePaths.trainingCertificate(
        uid: uid,
        trainingId: trainingId,
        fileName: fileName,
      );

      // ── 3. Execute Upload ──
      final downloadUrl = await _storageService.uploadFile(
        fileBytes: fileBytes,
        fileName: file.name,
        storagePath: storagePath,
        customMetadata: {
          'trainingId': trainingId,
          'uploadedBy': uid,
          'originalName': file.name,
        },
      );

      // ── 4. Persist in Firestore ──
      await _trainingService.submitCertificate(
        uid: uid,
        trainingId: trainingId,
        certificateUrl: downloadUrl,
        completionDate: completionDate,
        expirationDate: expirationDate,
        noExpiration: noExpiration,
      );

      log('✅ [TRAINING-VM] Certificate submitted for $trainingId');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [TRAINING-VM] Certificate error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [TRAINING-VM] Unexpected certificate error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // ── Update Training Status ────────────────────────────────────────────────

  /// Updates the status of a training item.
  Future<bool> updateTrainingStatus({
    required String trainingId,
    required TrainingStatus status,
  }) async {
    state = const AsyncValue.loading();
    try {
      final uid = _requireUid();

      await _trainingService.updateTrainingStatus(
        uid: uid,
        trainingId: trainingId,
        status: status,
      );

      log('✅ [TRAINING-VM] Training $trainingId → ${status.name}');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [TRAINING-VM] Status error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [TRAINING-VM] Unexpected status error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }
}
