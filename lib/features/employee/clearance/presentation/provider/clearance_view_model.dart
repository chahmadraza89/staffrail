import 'dart:developer';

import 'package:bhmh/core/config/firebase_storage_collecation_constant.dart';
import 'package:bhmh/core/error/app_failures.dart';
import 'package:bhmh/core/services/storage_service.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/clearance/data/data_source/clearance_service.dart';
import 'package:bhmh/features/employee/clearance/presentation/provider/clearance_provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ClearanceViewModel extends Notifier<AsyncValue<void>> {
  late final ClearanceService _clearanceService;
  late final StorageService _storageService;

  @override
  AsyncValue<void> build() {
    _clearanceService = ref.read(clearanceServiceProvider);
    _storageService = ref.read(storageServiceProvider);
    return const AsyncValue.data(null);
  }

  String _requireUid() {
    final user = ref.read(currentUserProvider).value;
    if (user == null) {
      throw const ValidationFailure(
        message: 'You must be signed in to perform this action.',
        code: 'not-authenticated',
      );
    }
    return user.uid;
  }

  Future<bool> submitDocument({
    required String itemId,
    required PlatformFile file,
  }) async {
    state = const AsyncValue.loading();
    try {
      final uid = _requireUid();

      // 1. Upload to Firebase Storage
      final fileName =
          '${DateTime.now().millisecondsSinceEpoch}_${file.name.replaceAll(' ', '_')}';
      final storagePath = StoragePaths.onboardingDocument(
        uid: uid,
        taskId: 'clearance_$itemId',
        fileName: fileName,
      );

      final bytes = file.bytes;
      if (bytes == null || bytes.isEmpty) {
        throw const ValidationFailure(
          message: 'Could not read file data. Please try again.',
          code: 'read-error',
        );
      }

      final downloadUrl = await _storageService.uploadFile(
        fileBytes: bytes,
        fileName: file.name,
        storagePath: storagePath,
        customMetadata: {'clearanceId': itemId, 'uploadedBy': uid},
      );

      // 2. Persist download URL in Firestore
      await _clearanceService.submitDocument(
        uid: uid,
        itemId: itemId,
        fileUrl: downloadUrl,
      );

      log('✅ [CLEARANCE-VM] Document submitted for $itemId');
      state = const AsyncValue.data(null);
      return true;
    } on Failure catch (e) {
      log('❌ [CLEARANCE-VM] Submit error: ${e.message}');
      state = AsyncValue.error(e, e.stackTrace ?? StackTrace.current);
      return false;
    } catch (e, stack) {
      log('❌ [CLEARANCE-VM] Unexpected error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }
}
