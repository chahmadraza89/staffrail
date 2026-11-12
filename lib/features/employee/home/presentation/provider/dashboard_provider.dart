import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/clearance/presentation/provider/clearance_provider.dart';
import 'package:bhmh/features/employee/home/presentation/widget/dashboard_action_item.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/presentation/provider/training_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ── Default seed data (used when Firestore collections are empty) ─────────────

final _defaultOnboardingTasks = <CompilationSubTask>[
  CompilationSubTask(
    id: 'offer_letter_signed',
    title: 'Offer Letter Signed',
    subtitle: 'Signature Required',
    status: TaskStatus.notStarted,
    actionType: TaskActionType.signature,
  ),
  CompilationSubTask(
    id: 'personal_details',
    title: 'Personal Details',
    subtitle: 'Required',
    status: TaskStatus.pending,
    actionType: TaskActionType.upload,
  ),
  CompilationSubTask(
    id: 'w4_form',
    title: 'W-4 Form',
    subtitle: 'Signature Required',
    status: TaskStatus.pending,
    actionType: TaskActionType.signature,
  ),
  CompilationSubTask(
    id: 'employee_handbook',
    title: 'Employee Handbook',
    subtitle: 'Acknowledge Required',
    status: TaskStatus.notStarted,
    actionType: TaskActionType.acknowledge,
  ),
  CompilationSubTask(
    id: 'initial_orientation',
    title: 'Initial Orientation',
    subtitle: 'Required',
    status: TaskStatus.pending,
    actionType: TaskActionType.upload,
  ),
  CompilationSubTask(
    id: 'laptop_selection',
    title: 'Laptop Selection',
    subtitle: 'Confirmed',
    status: TaskStatus.notStarted,
    actionType: TaskActionType.acknowledge,
  ),
];

final _defaultTrainings = <TrainingEntity>[
  TrainingEntity(
    id: 'workplace_safety',
    title: 'Workplace Safety Essentials',
    description: 'Learn fundamental safety protocols.',
    durationText: '45 mins',
    status: TrainingStatus.pending,
    dueDate: DateTime.now().add(const Duration(days: 14)),
  ),
  TrainingEntity(
    id: 'info_security',
    title: 'Information Security & Privacy',
    description: 'Best practices for protecting sensitive data.',
    durationText: '60 mins',
    status: TrainingStatus.overdue,
    dueDate: DateTime.now().subtract(const Duration(days: 7)),
  ),
  TrainingEntity(
    id: 'code_of_conduct',
    title: 'Code of Conduct Acknowledgment',
    description: 'Professional standards and ethical guidelines.',
    durationText: '30 mins',
    status: TrainingStatus.pending,
    dueDate: DateTime.now().add(const Duration(days: 30)),
  ),
];

final _defaultClearanceItems = <ClearanceEntity>[
  ClearanceEntity(
    id: 'driving_background_verification_report',
    title: 'Driving Background Verification Report',
    description: 'Official driving record verification.',
    status: ClearanceStatus.pending,
  ),
  ClearanceEntity(
    id: 'criminal_background_verification_report',
    title: 'Criminal Background Verification Report',
    description: 'Official state/federal criminal history report.',
    status: ClearanceStatus.pending,
  ),
  ClearanceEntity(
    id: 'drug_screening_results',
    title: 'Drug Screening Results',
    description: 'Official drug screening results verification.',
    status: ClearanceStatus.pending,
  ),
  ClearanceEntity(
    id: 'tb_status_report',
    title: 'TB Status Report',
    description: 'Official TB test results verification.',
    status: ClearanceStatus.pending,
  ),
];

// ── Action Items Provider ───────────────────────────────────────────────────

final dashboardActionItemsProvider =
    Provider.autoDispose<AsyncValue<List<DashboardActionItem>>>((ref) {
      final onboardingAsync = ref.watch(onboardingTasksStreamProvider);
      final trainingsAsync = ref.watch(trainingsStreamProvider);
      final clearanceAsync = ref.watch(clearanceItemsStreamProvider);

      return onboardingAsync.when(
        loading: () => const AsyncValue<List<DashboardActionItem>>.loading(),
        error: (e, st) => AsyncValue<List<DashboardActionItem>>.error(e, st),
        data: (onboardingTasks) {
          return trainingsAsync.when(
            loading: () =>
                const AsyncValue<List<DashboardActionItem>>.loading(),
            error: (e, st) =>
                AsyncValue<List<DashboardActionItem>>.error(e, st),
            data: (trainings) {
              return clearanceAsync.when(
                loading: () =>
                    const AsyncValue<List<DashboardActionItem>>.loading(),
                error: (_, _) => AsyncValue.data(<DashboardActionItem>[]),
                data: (clearanceItems) {
                  final items = <DashboardActionItem>[];

                  // Use real Firestore data; fall back to defaults if empty
                  final effectiveTrainings = trainings.isEmpty
                      ? _defaultTrainings
                      : trainings;
                  final effectiveClearance = clearanceItems.isEmpty
                      ? _defaultClearanceItems
                      : clearanceItems;
                  final effectiveTasks = onboardingTasks.isEmpty
                      ? _defaultOnboardingTasks
                      : onboardingTasks;

                  // 1. Overdue trainings (highest priority — red)
                  for (final t in effectiveTrainings.where(
                    (x) => x.status == TrainingStatus.overdue,
                  )) {
                    items.add(
                      DashboardActionItem(
                        id: 'training_overdue_${t.id}',
                        title: t.title,
                        module: 'Trainings',
                        icon: Icons.error_outline_rounded,
                        color: const Color(0xFFEF4444),
                        priority: 0,
                        entityId: t.id,
                        entityData: t,
                      ),
                    );
                  }

                  // 2. Pending onboarding tasks (orange/blue)
                  for (final task
                      in effectiveTasks
                          .where(
                            (t) =>
                                t.status == TaskStatus.pending ||
                                t.status == TaskStatus.submitted,
                          )
                          .take(3)) {
                    items.add(
                      DashboardActionItem(
                        id: 'onboarding_${task.id}',
                        title: task.title,
                        module: 'Onboarding',
                        icon: task.status == TaskStatus.pending
                            ? Icons.access_time_rounded
                            : Icons.upload_file_rounded,
                        color: task.status == TaskStatus.pending
                            ? const Color(0xFFF97316)
                            : const Color(0xFF3B82F6),
                        priority: 1,
                        entityId: task.id,
                        entityData: task,
                      ),
                    );
                  }

                  // 3. Not started onboarding tasks (grey)
                  for (final task
                      in effectiveTasks
                          .where((t) => t.status == TaskStatus.notStarted)
                          .take(2)) {
                    items.add(
                      DashboardActionItem(
                        id: 'onboarding_notstarted_${task.id}',
                        title: task.title,
                        module: 'Onboarding',
                        icon: Icons.circle_outlined,
                        color: const Color(0xFF6B7280),
                        priority: 2,
                        entityId: task.id,
                        entityData: task,
                      ),
                    );
                  }

                  // 4. Pending trainings (blue)
                  for (final t
                      in effectiveTrainings
                          .where((x) => x.status == TrainingStatus.pending)
                          .take(2)) {
                    items.add(
                      DashboardActionItem(
                        id: 'training_pending_${t.id}',
                        title: t.title,
                        module: 'Trainings',
                        icon: Icons.school_outlined,
                        color: const Color(0xFF3B82F6),
                        priority: 1,
                        entityId: t.id,
                        entityData: t,
                      ),
                    );
                  }

                  // 5. Clearance items needing action
                  for (final c
                      in effectiveClearance
                          .where(
                            (x) =>
                                x.status == ClearanceStatus.pending ||
                                x.status == ClearanceStatus.expired ||
                                x.status == ClearanceStatus.actionRequired,
                          )
                          .take(2)) {
                    items.add(
                      DashboardActionItem(
                        id: 'clearance_${c.id}',
                        title: c.title,
                        module: 'Clearance',
                        icon: c.status == ClearanceStatus.expired
                            ? Icons.error_outline_rounded
                            : c.status == ClearanceStatus.actionRequired
                            ? Icons.warning_amber_rounded
                            : Icons.hourglass_empty_rounded,
                        color: c.status == ClearanceStatus.expired
                            ? const Color(0xFFEF4444)
                            : c.status == ClearanceStatus.actionRequired
                            ? const Color(0xFFF59E0B)
                            : const Color(0xFF6B7280),
                        priority: c.status == ClearanceStatus.expired
                            ? 0
                            : c.status == ClearanceStatus.actionRequired
                            ? 1
                            : 2,
                        entityId: c.id,
                        entityData: c,
                      ),
                    );
                  }

                  items.sort((a, b) => a.priority.compareTo(b.priority));
                  return AsyncValue.data(items);
                },
              );
            },
          );
        },
      );
    });

// ── Quick Action Stats Provider ─────────────────────────────────────────────

final dashboardQuickActionStatsProvider =
    Provider.autoDispose<AsyncValue<DashboardQuickActionStats>>((ref) {
      final onboardingStats = ref.watch(onboardingCompletionProvider);
      final trainingStats = ref.watch(trainingCompletionProvider);
      final clearanceStats = ref.watch(clearanceCompletionProvider);

      return AsyncValue.data(
        DashboardQuickActionStats(
          onboardingTotal: onboardingStats.total,
          onboardingCompleted: onboardingStats.completed,
          trainingTotal: trainingStats.total,
          trainingCompleted: trainingStats.completed,
          clearanceTotal: clearanceStats.total,
          clearanceCompleted: clearanceStats.completed,
        ),
      );
    });

// ── Data Classes ─────────────────────────────────────────────────────────────

class DashboardQuickActionStats {
  final int onboardingTotal;
  final int onboardingCompleted;
  final int trainingTotal;
  final int trainingCompleted;
  final int clearanceTotal;
  final int clearanceCompleted;

  const DashboardQuickActionStats({
    required this.onboardingTotal,
    required this.onboardingCompleted,
    required this.trainingTotal,
    required this.trainingCompleted,
    required this.clearanceTotal,
    required this.clearanceCompleted,
  });

  double get onboardingProgress =>
      onboardingTotal == 0 ? 0 : onboardingCompleted / onboardingTotal;

  double get trainingProgress =>
      trainingTotal == 0 ? 0 : trainingCompleted / trainingTotal;

  double get clearanceProgress =>
      clearanceTotal == 0 ? 0 : clearanceCompleted / clearanceTotal;

  String get onboardingSubtitle =>
      '$onboardingCompleted/$onboardingTotal Tasks';
  String get trainingSubtitle => '$trainingCompleted/$trainingTotal Assigned';
  String get clearanceSubtitle => clearanceTotal == 0
      ? 'No items'
      : '$clearanceCompleted/$clearanceTotal Complete';
}
