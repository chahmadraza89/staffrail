import 'package:bhmh/core/shared/tasks_compilation_score.dart';
import 'package:bhmh/features/employee/clearance/presentation/provider/clearance_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EmployeeClearanceScore extends ConsumerWidget {
  const EmployeeClearanceScore({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final completion = ref.watch(clearanceCompletionProvider);
    
    return TasksCompilationScore(
      totalTasks: completion.total,
      completedTasks: completion.completed,
    );
  }
}
