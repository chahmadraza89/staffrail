import 'package:bhmh/core/shared/tasks_compilation_score.dart';
import 'package:bhmh/core/config/onboarding_constants.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EmployeeTasksComplianceScore extends ConsumerWidget {
  const EmployeeTasksComplianceScore({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch task status map to rebuild when any task updates
    final taskState = ref.watch(taskStatusMapProvider);
    final completedCount = taskState.values
        .where(
          (status) =>
              status == TaskStatus.completed ||
              status == TaskStatus.verified ||
              status == TaskStatus.cleared ||
              status == TaskStatus.signed ||
              status == TaskStatus.acknowledged ||
              status == TaskStatus.confirmed,
        )
        .length;

    final skippedCount = taskState.values
        .where((status) => status == TaskStatus.noActionRequired)
        .length;

    // Calculate total count from constants to ensure parity with 7-category model
    final totalCount = (OnboardingConstants.getDefaultTasks().length +
        OnboardingConstants.getDefaultTrainings().length +
        OnboardingConstants.getDefaultClearances().length) - skippedCount;

    return TasksCompilationScore(
      totalTasks: totalCount,
      completedTasks: completedCount,
    );
  }
}
