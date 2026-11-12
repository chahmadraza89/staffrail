import 'package:bhmh/core/utils/task_lock_helper.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// =============================================================================
// BASE FORM WRAPPER
// =============================================================================
// Reusable container for all onboarding action widgets.
// Provides:
//   - Lock status banner (shown when task is in terminal state)
//   - Consistent card styling (white card with border + shadow)
//   - Loading overlay management
//
// Usage: Wrap any action widget's content with BaseFormWrapper to get
// uniform lock behavior and styling without code duplication.
// =============================================================================

class BaseFormWrapper extends ConsumerWidget {
  final String taskId;
  final Widget child;
  final String lockMessage;

  const BaseFormWrapper({
    super.key,
    required this.taskId,
    required this.child,
    this.lockMessage = 'Task Completed & Locked',
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taskStatus = ref.watch(taskStatusMapProvider)[taskId];
    final isLocked = isTaskLocked(taskStatus);
    final isSkipped = taskStatus == TaskStatus.noActionRequired;
    final displayMessage = isSkipped
        ? 'No Action Required (Skipped by Admin)'
        : lockMessage;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Container(
        padding: const EdgeInsets.all(24),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (taskStatus == TaskStatus.rejected)
              TaskRejectionBanner(taskId: taskId),
            if (isLocked)
              TaskLockBanner(
                message: displayMessage,
                isSkipped: isSkipped,
              ),
            child,
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// --- STANDALONE UI COMPONENTS ---
// =============================================================================

/// Displays the rejection reason if a task was sent back for rework.
class TaskRejectionBanner extends ConsumerWidget {
  final String taskId;

  const TaskRejectionBanner({super.key, required this.taskId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(onboardingTasksStreamProvider);
    final task = tasksAsync.when(
      data: (tasks) => tasks.cast<CompilationSubTask?>().firstWhere(
        (t) => t?.id == taskId,
        orElse: () => null,
      ),
      loading: () => null,
      error: (_, _) => null,
    );

    final reason = task?.rejectionReason;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA), width: 1.5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.warning_amber_rounded,
            color: Colors.red.shade700,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Task Rejected — Needs Rework',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.red.shade700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  reason != null && reason.isNotEmpty
                      ? 'Reason: $reason'
                      : 'Please review the requirements and resubmit this task.',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.red.shade600,
                    height: 1.4,
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

/// Displays a status indicator when a task is completed and locked.
class TaskLockBanner extends StatelessWidget {
  final String message;
  final bool isSkipped;

  const TaskLockBanner({
    super.key,
    required this.message,
    this.isSkipped = false,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = isSkipped ? const Color(0xFFF1F5F9) : const Color(0xFFE0F2F1);
    final borderColor = isSkipped
        ? const Color(0xFFCBD5E1)
        : const Color(0xFF109B85).withValues(alpha: 0.2);
    final iconColor = isSkipped ? const Color(0xFF64748B) : const Color(0xFF109B85);
    final iconData = isSkipped ? Icons.block_flipped : Icons.verified_user_rounded;

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Icon(
            iconData,
            size: 18,
            color: iconColor,
          ),
          const SizedBox(width: 10),
          Text(
            message,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: iconColor,
            ),
          ),
        ],
      ),
    );
  }
}
