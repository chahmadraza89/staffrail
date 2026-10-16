import 'package:bhmh/core/config/onboarding_constants.dart';
import 'package:bhmh/core/utils/compliance_helpers.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/employee_compilation_card.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/employee/training/presentation/provider/training_provider.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/clearance/presentation/provider/clearance_provider.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EmployeeComplicationCardData extends ConsumerWidget {
  const EmployeeComplicationCardData({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taskState = ref.watch(taskStatusMapProvider);
    final trainingsAsync = ref.watch(trainingsStreamProvider);
    final clearancesAsync = ref.watch(clearanceItemsStreamProvider);

    String getStatusSubtitle(TaskStatus status, String defaultSubtitle) {
      switch (status) {
        case TaskStatus.completed:
          return 'Completed';
        case TaskStatus.signed:
          return 'Signed';
        case TaskStatus.acknowledged:
          return 'Acknowledged';
        case TaskStatus.verified:
          return 'Verified';
        case TaskStatus.cleared:
          return 'Cleared';
        case TaskStatus.confirmed:
          return 'Confirmed';
        case TaskStatus.submitted:
          return 'Submitted';
        case TaskStatus.pending:
          return 'Pending';
        case TaskStatus.notStarted:
          return 'Not Started';
        case TaskStatus.pendingEmployerSignature:
          return 'Awaiting Admin Signature';
        default:
          return defaultSubtitle;
      }
    }

    bool checkCompleted(TaskStatus status) {
      return status == TaskStatus.completed ||
          status == TaskStatus.verified ||
          status == TaskStatus.cleared ||
          status == TaskStatus.signed ||
          status == TaskStatus.acknowledged ||
          status == TaskStatus.confirmed;
    }

    // ── DATA PREPARATION ──────────────────────────────────────────────

    // 1. Get Template Tasks and merge with live state
    final List<CompilationSubTask> templateTasks = OnboardingConstants.getDefaultTasks();
    final List<CompilationSubTask> mainTasks = templateTasks.map((task) {
      final status = taskState[task.id] ?? TaskStatus.notStarted;
      return task.copyWith(
        status: status,
        isCompleted: checkCompleted(status),
        subtitle: getStatusSubtitle(status, task.subtitle),
      );
    }).toList();

    // 2. Merge Trainings and Map to CompilationSubTask
    final List<CompilationSubTask> trainingSubTasks = trainingsAsync.maybeWhen(
      data: (items) {
        final defaultTrainings = OnboardingConstants.getDefaultTrainings();
        final actualMap = {for (var t in items) t.id: t};
        
        return defaultTrainings.map((dt) {
          final actual = actualMap[dt.id];
          final t = actual ?? dt;
          final taskStatus = t.status == TrainingStatus.completed
              ? TaskStatus.completed
              : (t.status == TrainingStatus.underReview
                  ? TaskStatus.submitted
                  : (t.status == TrainingStatus.pending ||
                          t.status == TrainingStatus.inProgress ||
                          t.status == TrainingStatus.overdue
                      ? TaskStatus.pending
                      : TaskStatus.notStarted));
          
          return CompilationSubTask(
            id: t.id,
            title: dt.title, // Enforce template title
            subtitle: getStatusSubtitle(taskStatus, dt.description),
            isCompleted: t.status == TrainingStatus.completed,
            subtitleIcon: Icons.school_rounded,
            status: taskStatus,
            actionType: TaskActionType.upload,
          );
        }).toList();
      },
      orElse: () => [],
    );

    // 3. Merge Clearances and Map to CompilationSubTask
    final List<CompilationSubTask> clearanceSubTasks = clearancesAsync.maybeWhen(
      data: (items) {
        final defaultClearances = OnboardingConstants.getDefaultClearances();
        final actualMap = {for (var c in items) c.id: c};
        
        return defaultClearances.map((dc) {
          final actual = actualMap[dc.id];
          final c = actual ?? dc;
          final taskStatus = c.status == ClearanceStatus.verified
              ? TaskStatus.completed
              : (c.status == ClearanceStatus.underReview
                  ? TaskStatus.submitted
                  : (c.status == ClearanceStatus.pending ||
                          c.status == ClearanceStatus.actionRequired
                      ? TaskStatus.pending
                      : TaskStatus.notStarted));
          
          return CompilationSubTask(
            id: c.id,
            title: dc.title, // Enforce template title
            subtitle: getStatusSubtitle(taskStatus, dc.description),
            isCompleted: c.status == ClearanceStatus.verified,
            subtitleIcon: Icons.verified_user_rounded,
            status: taskStatus,
            actionType: TaskActionType.upload,
          );
        }).toList();
      },
      orElse: () => [],
    );

    // 4. Group into Categories using the shared Helper
    final List<CompilationTask> tasks = ComplianceHelpers.groupTasksIntoCategories(
      tasks: mainTasks,
      trainingSubTasks: trainingSubTasks,
      clearanceSubTasks: clearanceSubTasks,
    );

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: tasks.length,
      itemBuilder: (context, index) {
        final task = tasks[index];
        return EmployeeCompilationCard(task: task);
      },
    );
  }
}
