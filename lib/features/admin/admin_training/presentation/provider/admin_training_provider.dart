import 'package:bhmh/features/admin/admin_training/data/data_scource/admin_training_service.dart';
import 'package:bhmh/features/admin/admin_training/data/model/admin_training_model.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// =============================================================================
// ADMIN TRAINING PROVIDERS
// =============================================================================
// Dependency injection and state management for the Admin Training module.
// =============================================================================

/// Provides the AdminTrainingService instance.
final adminTrainingServiceProvider = Provider<AdminTrainingService>((ref) {
  return AdminTrainingService();
});

/// Top-level statistics for the admin dashboard counters.
/// Dynamically aggregates compliance from employee progress by watching child providers.
/// Returns an [AsyncValue] to propagate loading and error states from its dependencies.
final adminTrainingStatsProvider =
    Provider<AsyncValue<AdminTrainingStatsModel>>((ref) {
      final userAsync = ref.watch(currentUserProvider);
      final templatesAsync = ref.watch(adminClinicTrainingsProvider);
      final assignmentsAsync = ref.watch(adminAllAssignmentsProvider);

      // If any of the mandatory data sources are loading, we return loading.
      if (userAsync.isLoading ||
          templatesAsync.isLoading ||
          assignmentsAsync.isLoading) {
        return const AsyncLoading();
      }

      // If there's an error in any source, group it.
      if (userAsync.hasError) {
        return AsyncError(userAsync.error!, userAsync.stackTrace!);
      }
      if (templatesAsync.hasError) {
        return AsyncError(templatesAsync.error!, templatesAsync.stackTrace!);
      }
      if (assignmentsAsync.hasError) {
        return AsyncError(
          assignmentsAsync.error!,
          assignmentsAsync.stackTrace!,
        );
      }

      // Data is ready
      final user = userAsync.value;
      if (user == null) {
        return const AsyncData(
          AdminTrainingStatsModel(
            totalActive: 0,
            complianceRate: 0,
            overdueCount: 0,
          ),
        );
      }

      final templates = templatesAsync.value ?? [];
      final assignments = assignmentsAsync.value ?? [];

      final now = DateTime.now();
      final totalActive = templates.length;

      int completedCount = 0;
      int totalAssignments = assignments.length;
      int overdueCount = 0;

      for (final a in assignments) {
        if (a.status == TrainingStatus.completed) {
          completedCount++;
        } else if (a.dueDate != null && a.dueDate!.isBefore(now)) {
          overdueCount++;
        }
      }

      final complianceRate = totalAssignments == 0
          ? 0.0
          : (completedCount / totalAssignments) * 100;

      final safeRate = complianceRate.isNaN || complianceRate.isInfinite ? 0.0 : complianceRate;
      return AsyncData(
        AdminTrainingStatsModel(
          totalActive: totalActive,
          complianceRate: double.parse(safeRate.toStringAsFixed(1)),
          overdueCount: overdueCount,
        ),
      );
    });

/// Streams all training assignments across all employees using a Collection Group query.
/// Scoped to the current admin via adminId for security and correctness.
final adminAllAssignmentsProvider = StreamProvider<List<TrainingEntity>>((ref) {
  final service = ref.watch(adminTrainingServiceProvider);
  final userAsync = ref.watch(currentUserProvider);

  return userAsync.when(
    data: (user) {
      if (user == null) return Stream.value([]);
      return service.streamAllAssignments(user.uid);
    },
    loading: () => const Stream.empty(),
    error: (e, stack) => Stream.error(e, stack),
  );
});

/// Map of templateId -> {completedCount, totalAssignedCount}
final adminTrainingComplianceProvider =
    Provider<Map<String, ({int completed, int total})>>((ref) {
      final assignmentsAsync = ref.watch(adminAllAssignmentsProvider);

      return assignmentsAsync.maybeWhen(
        data: (assignments) {
          final map = <String, ({int completed, int total})>{};
          for (final training in assignments) {
            final entry = map[training.id] ?? (completed: 0, total: 0);
            map[training.id] = (
              completed:
                  entry.completed +
                  (training.status == TrainingStatus.completed ? 1 : 0),
              total: entry.total + 1,
            );
          }
          return map;
        },
        orElse: () => <String, ({int completed, int total})>{},
      );
    });

/// Streams the master list of all training templates created by the admin.
final adminClinicTrainingsProvider = StreamProvider<List<AdminTrainingModel>>((
  ref,
) {
  final service = ref.watch(adminTrainingServiceProvider);
  return service.streamTrainingTemplates();
});
