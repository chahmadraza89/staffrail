import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/features/admin/admin_clearance/data/data_source/admin_clearance_service.dart';
import 'package:bhmh/features/admin/admin_clearance/data/model/admin_clearance_model.dart';
import 'package:bhmh/features/admin/admin_clearance/domain/admin_clearance_domain.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/core/services/audit_service.dart';
import 'package:bhmh/core/services/compliance_provider.dart';
import 'package:bhmh/features/employee/home/presentation/provider/notification_provider.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final auditServiceProvider = Provider<AuditService>((ref) => AuditService());

final adminClearanceServiceProvider = Provider<AdminClearanceService>((ref) {
  return AdminClearanceService(
    firestore: LocalDataStore.instance,
    auditService: ref.watch(auditServiceProvider),
    notificationService: ref.watch(notificationServiceProvider),
    complianceService: ref.watch(complianceServiceProvider),
  );
});

/// Streams all clearance tasks for the current admin across all employees.
final adminClearanceTasksProvider =
    StreamProvider.autoDispose<List<ClearanceEntity>>((ref) {
      final uid = ref.watch(
        currentUserProvider.select((user) => user.value?.uid),
      );

            if (uid == null) return const Stream.empty();

      final service = ref.watch(adminClearanceServiceProvider);
      
      // 🚀 SELF-HEALING: Trigger background data repair (Fire-and-forget)
      service.repairClearanceData(uid);

      return service.streamAdminClearanceTasks(uid);
    });

/// Computes the action required items dynamically from the task stream.
final adminClearanceActionItemsProvider =
    Provider.autoDispose<List<AdminClearanceActionItem>>((ref) {
      final tasks = ref.watch(adminClearanceTasksProvider).value ?? [];
      return AdminClearanceDomain.mapToActions(tasks);
    });

/// Computes the overview statistics dynamically from the task stream.
final adminClearanceStatsProvider =
    Provider.autoDispose<List<AdminClearanceStat>>((ref) {
      final tasks = ref.watch(adminClearanceTasksProvider).value ?? [];
      return AdminClearanceDomain.computeStats(tasks);
    });

/// Computes the recent approvals dynamically from the task stream.
final adminClearanceRecentApprovalsProvider =
    Provider.autoDispose<(List<RecentApproval>, int)>((ref) {
      final tasks = ref.watch(adminClearanceTasksProvider).value ?? [];
      return AdminClearanceDomain.mapToRecentApprovals(tasks);
    });
