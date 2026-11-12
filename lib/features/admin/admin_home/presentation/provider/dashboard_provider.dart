import 'package:bhmh/features/admin/admin_home/data/model/admin_dashboard_models.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/provider/admin_clearance_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

/// Provider to track if data repair has been run for a specific admin.
final _dataRepairTrackerProvider = StateProvider.family<bool, String>((ref, adminId) => false);

/// Provider for Admin Dashboard Statistics.
/// Streams a tuple of (onboarding, completedToday, active) counts.
final adminDashboardStatsProvider = StreamProvider.autoDispose<(int, int, int)>(
  (ref) {
    final userAsync = ref.watch(currentUserProvider);

    return userAsync.when(
      data: (user) {
        if (user == null) return Stream.value((0, 0, 0));

        final onboardingService = ref.watch(onboardingServiceProvider);
        final clearanceService = ref.watch(adminClearanceServiceProvider);

        // 🚀 SELF-HEALING: Trigger background data repair (Fire-and-forget)
        // Ensures legacy data is patched with employee names for the dashboard.
        // Optimized: Only run once per session/adminId to prevent redundant traffic.
        // Using microtask to avoid "modifying providers during initialization" error.
        Future.microtask(() {
          final container = ref.read(_dataRepairTrackerProvider(user.uid));
          if (!container) {
            onboardingService.repairMissingTaskMetadata(user.uid);
            clearanceService.repairClearanceData(user.uid);
            ref.read(_dataRepairTrackerProvider(user.uid).notifier).state = true;
          }
        });

        return onboardingService.streamAdminDashboardStats(user.uid);
      },
      loading: () => const Stream.empty(),
      error: (e, stack) => Stream.error(e, stack),
    );
  },
);

/// Provider for Tasks requiring Admin Action.
/// Streams a list of [CompilationSubTask] across all employees managed by the admin.
final adminActionRequiredTasksProvider =
    StreamProvider.autoDispose<List<CompilationSubTask>>((ref) {
      final userAsync = ref.watch(currentUserProvider);

      return userAsync.when(
        data: (user) {
          if (user == null) return Stream.value([]);

          final onboardingService = ref.watch(onboardingServiceProvider);
          return onboardingService.streamAdminActionRequiredTasks(user.uid);
        },
        loading: () => const Stream.empty(),
        error: (e, stack) => Stream.error(e, stack),
      );
    });

/// Provider for tracking overall progress of all employees managed by the Admin.
/// Aggregates onboarding and training stats in real-time.
final adminEmployeesProgressProvider =
    StreamProvider.autoDispose<List<AdminEmployeeProgress>>((ref) {
      final userAsync = ref.watch(currentUserProvider);

      return userAsync.when(
        data: (user) {
          if (user == null) return Stream.value([]);

          final onboardingService = ref.watch(onboardingServiceProvider);
          return onboardingService.streamAdminEmployeesProgress(user.uid);
        },
        loading: () => const Stream.empty(),
        error: (e, stack) => Stream.error(e, stack),
      );
    });

/// Provider for a specific task being reviewed.
final reviewTaskProvider = StreamProvider.autoDispose
    .family<CompilationSubTask?, ({String employeeId, String taskId})>((
      ref,
      arg,
    ) {
      final onboardingService = ref.watch(onboardingServiceProvider);
      return onboardingService.streamTaskDetails(arg.employeeId, arg.taskId);
    });

final adminReviewProcessingProvider = Provider<StateController<bool>>((ref) {
  return StateController(false);
});

/// Provider for Compliance Alerts for the Admin Dashboard.
/// Synthesizes tasks requiring attention (Overdue, Signature Needed).
final complianceAlertsProvider = Provider.autoDispose<List<ComplianceAlert>>((ref) {
  final tasksAsync = ref.watch(adminActionRequiredTasksProvider);

  return tasksAsync.when(
    data: (tasks) {
      final List<ComplianceAlert> alerts = [];

      for (var task in tasks) {
        // 🚩 Logic for Overdue
        if (task.dueDate != null &&
            task.dueDate!.isBefore(DateTime.now()) &&
            !task.isCompleted) {
          alerts.add(
            ComplianceAlert(
              id: task.id,
              employeeId: task.employeeId ?? '',
              employeeName: task.employeeName ?? 'Unknown',
              taskTitle: task.title,
              category: 'Overdue',
              dueDate: task.dueDate,
              color: const Color(0xFFEF4444), // Red
            ),
          );
        }
        // 📝 Logic for Signature Needed (Admin side)
        else if (task.status == TaskStatus.waitingForApprover) {
          alerts.add(
            ComplianceAlert(
              id: task.id,
              employeeId: task.employeeId ?? '',
              employeeName: task.employeeName ?? 'Unknown',
              taskTitle: task.title,
              category: 'Signature Needed',
              dueDate: task.dueDate,
              color: const Color(0xFFF59E0B), // Amber
            ),
          );
        }
      }

      // Sort by due date (oldest first) or title
      alerts.sort((a, b) {
        if (a.dueDate != null && b.dueDate != null) {
          return a.dueDate!.compareTo(b.dueDate!);
        }
        return a.taskTitle.compareTo(b.taskTitle);
      });

      return alerts;
    },
    loading: () => [],
    error: (error, _) => [],
  );
});
