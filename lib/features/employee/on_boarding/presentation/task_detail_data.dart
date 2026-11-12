// ignore_for_file: use_build_context_synchronously, deprecated_member_use
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/task_action_dispatcher.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class TaskDetailScreen extends ConsumerWidget {
  final String taskId;
  final String taskTitle;
  final String taskSubtitle;
  final TaskStatus? currentStatus;
  final IconData? icon;

  const TaskDetailScreen({
    super.key,
    required this.taskId,
    required this.taskTitle,
    required this.taskSubtitle,
    this.currentStatus,
    this.icon,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Get the full task object to access actionType
    final tasksAsync = ref.watch(onboardingTasksStreamProvider);
    final task = tasksAsync.when(
      data: (tasks) {
        final found = tasks.where((t) => t.id == taskId).toList();
        return found.isNotEmpty ? found.first : null;
      },
      loading: () => null,
      error: (_, _) => null,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TaskStatusCard(taskId: taskId),
        const SizedBox(height: 24),
        TaskInstructionsCard(
          taskId: taskId,
          taskTitle: taskTitle,
          actionType: task?.actionType,
        ),
        const SizedBox(height: 24),
        TaskActionDispatcher(taskId: taskId, taskTitle: taskTitle),
      ],
    );
  }
}

class TaskHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData? icon;

  const TaskHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          if (icon != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF109B85).withValues(alpha: 0.15),
                    const Color(0xFF109B85).withValues(alpha: 0.05),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: const Color(0xFF109B85), size: 28),
            ),
            const SizedBox(width: 20),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 15,
                    color: const Color(0xFF64748B).withValues(alpha: 0.8),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class TaskStatusCard extends ConsumerWidget {
  final String taskId;
  const TaskStatusCard({super.key, required this.taskId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taskStatus = ref.watch(taskStatusMapProvider)[taskId];
    final badge = _getBadgeData(taskStatus);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Current Status',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade500,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                  textBaseline: TextBaseline.alphabetic,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Progress Tracking',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: badge.backgroundColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: badge.textColor.withValues(alpha: 0.1)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (badge.icon != null)
                  Icon(badge.icon, size: 18, color: badge.textColor),
                const SizedBox(width: 8),
                Text(
                  badge.label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: badge.textColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  BadgeData _getBadgeData(TaskStatus? status) {
    const Color teal = Color(0xFF109B85);
    const Color orange = Color(0xFFF59E0B);
    const Color blue = Color(0xFF3B82F6);
    const Color purple = Color(0xFF8B5CF6);
    const Color green = Color(0xFF10B981);
    const Color grey = Color(0xFF6B7280);

    switch (status) {
      case TaskStatus.notStarted:
        return BadgeData(
          'Not Started',
          grey.withValues(alpha: 0.1),
          grey,
          Icons.circle_outlined,
        );
      case TaskStatus.pending:
        return BadgeData(
          'Pending',
          orange.withValues(alpha: 0.1),
          orange,
          Icons.access_time,
        );
      case TaskStatus.submitted:
        return BadgeData(
          'Submitted',
          blue.withValues(alpha: 0.1),
          blue,
          Icons.check_circle_outline_rounded,
        );
      case TaskStatus.waitingForApprover:
        return BadgeData(
          'Waiting for Approver',
          purple.withValues(alpha: 0.1),
          purple,
          Icons.hourglass_empty_rounded,
        );
      case TaskStatus.rejected:
        return BadgeData(
          'Needs Rework',
          Colors.red.withValues(alpha: 0.1),
          Colors.red.shade700,
          Icons.warning_amber_rounded,
        );
      case TaskStatus.acknowledged:
      case TaskStatus.completed:
      case TaskStatus.signed:
      case TaskStatus.confirmed:
        return BadgeData(
          'Completed',
          teal.withValues(alpha: 0.1),
          teal,
          Icons.check_circle_rounded,
        );
      case TaskStatus.verified:
      case TaskStatus.cleared:
        return BadgeData(
          'Verified',
          green.withValues(alpha: 0.1),
          green,
          Icons.verified_rounded,
        );
      default:
        return BadgeData('Pending', grey.withValues(alpha: 0.1), grey, null);
    }
  }
}

class BadgeData {
  final String label;
  final Color backgroundColor;
  final Color textColor;
  final IconData? icon;

  BadgeData(this.label, this.backgroundColor, this.textColor, this.icon);
}

class TaskDescriptionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData? icon;

  const TaskDescriptionCard({
    super.key,
    required this.title,
    required this.subtitle,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Icon(
            icon ?? Icons.description_outlined,
            size: 24,
            color: Theme.of(context).primaryColor,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class TaskInstructionsCard extends StatelessWidget {
  final String taskId;
  final String taskTitle;
  final TaskActionType? actionType;

  const TaskInstructionsCard({
    super.key,
    required this.taskId,
    required this.taskTitle,
    this.actionType,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F9FF),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFBAE6FD), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.info_outline_rounded,
                  color: Color(0xFF0EA5E9),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'Instructions',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0369A1),
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            _getInstructions(actionType),
            style: const TextStyle(
              fontSize: 15,
              color: Color(0xFF0C4A6E),
              height: 1.6,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  String _getInstructions(TaskActionType? type) {
    final effectiveType =
        (type == null ||
            type == TaskActionType.none ||
            type == TaskActionType.acknowledge)
        ? CompilationSubTask.inferActionType(taskTitle, '')
        : type;

    switch (effectiveType) {
      case TaskActionType.acknowledge:
        return 'Please read through the entire document carefully. Once completed, check the acknowledgment box and submit.';
      case TaskActionType.upload:
        return 'Upload the required document in PDF, JPG, PNG, DOC, or DOCX format. Ensure the file is clear and all information is visible.';
      case TaskActionType.signature:
        return 'Review the document and provide your digital signature. You can either draw your signature or type your full name.';
      case TaskActionType.form:
        return 'Complete all required fields in the form. Ensure all information is accurate before submitting.';
      default:
        return 'Please complete this task as part of your onboarding process. Contact HR if you need assistance.';
    }
  }
}

/// Creates an empty task for fallback when task data is unavailable.
CompilationSubTask createEmptyTask() {
  return const CompilationSubTask(
    id: '',
    title: 'Onboarding Task',
    subtitle: 'No details available',
    actionType: TaskActionType.none,
  );
}
