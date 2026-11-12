import 'package:bhmh/core/shared/tasks_compilation_score.dart';
import 'package:bhmh/features/employee/training/presentation/provider/training_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Training progress indicator — powered by real-time Firestore stream.
class TrainingCompilationIndicatorData extends ConsumerWidget {
  const TrainingCompilationIndicatorData({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final completion = ref.watch(trainingCompletionProvider);

    return TasksCompilationScore(
      totalTasks: completion.total,
      completedTasks: completion.completed,
    );
  }
}
