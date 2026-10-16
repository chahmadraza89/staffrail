import 'dart:developer';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/on_boarding/data/data_source/file_picker_serivce.dart';
import 'package:bhmh/features/employee/on_boarding/data/data_source/onboarding_service.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_view_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/core/services/compliance_provider.dart';
import 'package:bhmh/features/employee/home/presentation/provider/notification_provider.dart';

// =============================================================================
// ONBOARDING PROVIDERS (Dependency Injection)
// =============================================================================
// Follows the same DI pattern established in auth_provider.dart.
// Each provider has a single responsibility.
// =============================================================================

// 🔹 1. Infrastructure Providers
final filePickerServiceProvider = Provider<FilePickerService>((ref) {
  return FilePickerService();
});

// 🔹 2. Onboarding Service Injection (IoC)
final onboardingServiceProvider = Provider<OnboardingService>((ref) {
  return OnboardingService(
    firestore: FirebaseFirestore.instance,
    notificationService: ref.watch(notificationServiceProvider),
    complianceService: ref.watch(complianceServiceProvider),
  );
});

// 🔹 3. Real-Time Onboarding Tasks Stream
/// Streams onboarding tasks for the currently authenticated user.
/// Automatically re-fetches when auth state changes.
final onboardingTasksStreamProvider =
    StreamProvider.autoDispose<List<CompilationSubTask>>((ref) {
      final authState = ref.watch(authStateProvider);

      return authState.when(
        data: (firebaseUser) {
          if (firebaseUser == null) {
            return Stream.value([]);
          }
          log(
            '🔄 [PROVIDER] Switching onboarding stream for: ${firebaseUser.uid}',
          );
          final service = ref.watch(onboardingServiceProvider);
          return service.streamOnboardingTasks(firebaseUser.uid);
        },
        loading: () => const Stream.empty(),
        error: (e, stack) => Stream.error(e, stack),
      );
    });

/// Streams onboarding tasks for a specific employee ID.
/// Used primarily by admins to view/verify employee progress.
final employeeTasksStreamProvider = StreamProvider.autoDispose
    .family<List<CompilationSubTask>, String>((ref, uid) {
  final service = ref.watch(onboardingServiceProvider);
  return service.streamOnboardingTasks(uid);
});

// 🔹 4. Task Status Map (Derived from Stream)
/// Provides a reactive Map&lt;taskId, TaskStatus&gt; for quick UI lookups.
/// This replaces the old static TaskStateNotifier with real-time data.
final taskStatusMapProvider = Provider.autoDispose<Map<String, TaskStatus>>((
  ref,
) {
  final tasksAsync = ref.watch(onboardingTasksStreamProvider);

  return tasksAsync.when(
    data: (tasks) {
      return {for (final task in tasks) task.id: task.status};
    },
    loading: () => {},
    error: (_, _) => {},
  );
});

// 🔹 5. Completion Statistics
/// Computed provider for onboarding completion metrics.
/// Uses terminal task statuses (not isCompleted flag) for accuracy.
final onboardingCompletionProvider =
    Provider.autoDispose<({int total, int completed})>((ref) {
      final tasksAsync = ref.watch(onboardingTasksStreamProvider);

      return tasksAsync.when(
        data: (tasks) {
          final relevantTasks = tasks.where((t) => t.status != TaskStatus.noActionRequired).toList();
          final completed = relevantTasks
              .where(
                (t) =>
                    t.status == TaskStatus.completed ||
                    t.status == TaskStatus.verified ||
                    t.status == TaskStatus.cleared ||
                    t.status == TaskStatus.signed ||
                    t.status == TaskStatus.acknowledged ||
                    t.status == TaskStatus.confirmed,
              )
              .length;
          return (total: relevantTasks.length, completed: completed);
        },
        loading: () => (total: 0, completed: 0),
        error: (_, _) => (total: 0, completed: 0),
      );
    });

// 🔹 6. Onboarding Completion Check
/// Returns true only when ALL tasks are completed AND verified/signed.
/// This is the definitive check for "onboarding is fully done".
final isOnboardingCompleteProvider = Provider.autoDispose<bool>((ref) {
  final tasksAsync = ref.watch(onboardingTasksStreamProvider);

  return tasksAsync.when(
    data: (tasks) {
      final relevantTasks = tasks.where((t) => t.status != TaskStatus.noActionRequired).toList();
      if (relevantTasks.isEmpty) return false;
      return relevantTasks.every(
        (t) =>
            t.isCompleted &&
            (t.status == TaskStatus.completed ||
                t.status == TaskStatus.verified ||
                t.status == TaskStatus.signed ||
                t.status == TaskStatus.cleared ||
                t.status == TaskStatus.acknowledged ||
                t.status == TaskStatus.confirmed ||
                t.status == TaskStatus.submitted),
      );
    },
    loading: () => false,
    error: (_, _) => false,
  );
});

// 🔹 7. ViewModel Provider
final taskViewModelProvider = NotifierProvider<TaskViewModel, AsyncValue<void>>(
  TaskViewModel.new,
);
