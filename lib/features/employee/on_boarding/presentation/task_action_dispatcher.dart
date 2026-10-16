import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/annual_training_form_view.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/initial_training_form_view.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/task_detail_widget.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/tasks_description_card.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/split_field_form_view.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/task_detail_data.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class TaskActionDispatcher extends ConsumerWidget {
  final String taskId;
  final String taskTitle;

  const TaskActionDispatcher({
    super.key,
    required this.taskId,
    required this.taskTitle,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taskStatus = ref.watch(taskStatusMapProvider)[taskId];

    // Get the full task object to access actionType
    final tasksAsync = ref.watch(onboardingTasksStreamProvider);
    final task = tasksAsync.when(
      data: (tasks) => tasks.firstWhere(
        (t) => t.id == taskId,
        orElse: () => CompilationSubTask(
          id: taskId,
          title: taskTitle,
          subtitle: '',
          actionType: CompilationSubTask.inferActionType(taskTitle, ''),
        ),
      ),
      loading: () => null,
      error: (_, _) => null,
    );

    // ── Determine Action Type ──
    final inferredAction = CompilationSubTask.inferActionType(
      taskTitle,
      task?.subtitle ?? '',
    );
    final actionType =
        (task?.actionType == TaskActionType.none ||
            task?.actionType == TaskActionType.acknowledge)
        ? inferredAction
        : task?.actionType ?? inferredAction;

    final Widget currentView;

    // ── Routing Logic ──
    final taskIdLower = taskId.toLowerCase();
    final isSplitFieldId =
        taskIdLower.contains('driver') &&
        !taskIdLower.contains('license');

    if (actionType == TaskActionType.splitField || isSplitFieldId) {
      if (taskIdLower.contains('annualtraining') ||
          taskTitle.toLowerCase().contains('annual training')) {
        currentView = AnnualTrainingFormView(
          taskId: taskId,
          employeeId: task?.employeeId,
          title: taskTitle,
        );
      } else if (taskIdLower.contains('initialtraining') ||
          taskTitle.toLowerCase().contains('initial training')) {
        currentView = InitialTrainingFormView(
          taskId: taskId,
          employeeId: task?.employeeId,
          title: taskTitle,
        );
      } else {
        currentView = SplitFieldFormView(
          key: ValueKey('split_$taskId'),
          taskId: taskId,
          title: taskTitle,
        );
      }
    } else if (taskStatus == TaskStatus.completed ||
        taskStatus == TaskStatus.verified ||
        taskStatus == TaskStatus.signed ||
        taskStatus == TaskStatus.cleared ||
        taskStatus == TaskStatus.acknowledged ||
        taskStatus == TaskStatus.submitted) {
      currentView = CompletedTaskReadOnlyView(
        key: ValueKey('completed_$taskId'),
        task: task ?? createEmptyTask(),
      );
    } else {
      // ── Actionable task view ──
      currentView = Column(
        key: ValueKey('action_$taskId'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Required Action',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 12),
          ActionWidgetResolver(
            taskStatus: taskStatus,
            task: task,
            title: taskTitle,
            taskId: taskId,
          ),
        ],
      );
    }

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 500),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (Widget child, Animation<double> animation) {
        final offsetAnimation = Tween<Offset>(
          begin: const Offset(0, 0.05),
          end: Offset.zero,
        ).animate(animation);

        return FadeTransition(
          opacity: animation,
          child: SlideTransition(position: offsetAnimation, child: child),
        );
      },
      child: currentView,
    );
  }
}
