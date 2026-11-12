import 'dart:developer';
import 'package:bhmh/features/admin/admin_clearance/presentation/provider/admin_clearance_provider.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Notifier to manage Admin actions on clearances (Verify/Reject)
class AdminClearanceViewModel extends Notifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() {
    return const AsyncValue.data(null);
  }

  Future<bool> verifyClearance({
    required String employeeId,
    required String clearanceId,
    String? signatureData,
  }) async {
    state = const AsyncValue.loading();
    try {
      final admin = ref.read(currentUserProvider).value;
      if (admin == null) throw Exception('Admin not logged in');

      final service = ref.read(adminClearanceServiceProvider);
      await service.verifyClearance(
        employeeId: employeeId,
        clearanceId: clearanceId,
        adminId: admin.uid,
        adminName: admin.name,
        signatureData: signatureData,
      );
      state = const AsyncValue.data(null);
      return true;
    } catch (e, stack) {
      log('❌ [ADMIN-CLEARANCE-VM] Verify Error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  Future<bool> rejectClearance({
    required String employeeId,
    required String clearanceId,
    required String reason,
  }) async {
    state = const AsyncValue.loading();
    try {
      final admin = ref.read(currentUserProvider).value;
      if (admin == null) throw Exception('Admin not logged in');

      final service = ref.read(adminClearanceServiceProvider);
      await service.rejectClearance(
        employeeId: employeeId,
        clearanceId: clearanceId,
        adminId: admin.uid,
        adminName: admin.name,
        reason: reason,
      );
      state = const AsyncValue.data(null);
      return true;
    } catch (e, stack) {
      log('❌ [ADMIN-CLEARANCE-VM] Reject Error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }
}

final adminClearanceViewModelProvider =
    NotifierProvider<AdminClearanceViewModel, AsyncValue<void>>(
      AdminClearanceViewModel.new,
    );
