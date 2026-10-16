import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';

// =============================================================================
// ACCORDION CATEGORY WIDGET (v0.1)
// =============================================================================
// Collapsible ExpansionTile-based widget for onboarding categories.
// Shows category title + "X of Y completed" + progress indicator.
// Replaces flat ListView.builder with navigable accordion sections.
// =============================================================================

class AccordionCategoryWidget extends StatelessWidget {
  final CompilationTask category;
  final ValueChanged<CompilationSubTask> onTaskTap;
  final bool initiallyExpanded;

  const AccordionCategoryWidget({
    super.key,
    required this.category,
    required this.onTaskTap,
    this.initiallyExpanded = false,
  });

  @override
  Widget build(BuildContext context) {
    final completedCount = category.subTasks.where((t) => t.isCompleted).length;
    final totalCount = category.subTasks.length;
    final progress = totalCount > 0 ? completedCount / totalCount : 0.0;
    final isComplete = completedCount == totalCount && totalCount > 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isComplete
              ? const Color(0xFF109B85).withValues(alpha: 0.3)
              : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: initiallyExpanded,
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          childrenPadding: const EdgeInsets.only(
            left: 16,
            right: 16,
            bottom: 12,
          ),
          // ── Header ──────────────────────────────────────────────────
          leading: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isComplete
                    ? [
                        const Color(0xFF109B85).withValues(alpha: 0.15),
                        const Color(0xFF109B85).withValues(alpha: 0.05),
                      ]
                    : [Colors.grey.shade100, Colors.grey.shade50],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: isComplete
                  ? const Icon(
                      Icons.check_circle_rounded,
                      color: Color(0xFF109B85),
                      size: 22,
                    )
                  : Text(
                      '$completedCount/$totalCount',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.grey.shade600,
                      ),
                    ),
            ),
          ),
          title: Text(
            category.title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              // ── Progress Bar ──────────────────────────────────────
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: Colors.grey.shade200,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    isComplete
                        ? const Color(0xFF109B85)
                        : const Color(0xFF3B82F6),
                  ),
                  minHeight: 4,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                isComplete
                    ? 'All tasks completed ✓'
                    : '$completedCount of $totalCount completed',
                style: TextStyle(
                  fontSize: 12,
                  color: isComplete
                      ? const Color(0xFF109B85)
                      : Colors.grey.shade500,
                ),
              ),
            ],
          ),
          // ── Task Items ────────────────────────────────────────────
          children: category.subTasks.map((task) {
            return TaskTileNode(task: task, onTaskTap: onTaskTap);
          }).toList(),
        ),
      ),
    );
  }
}

// =============================================================================
// --- STANDALONE ROW COMPONENTS ---
// =============================================================================

/// Displays an individual task item within the accordion
class TaskTileNode extends StatelessWidget {
  final CompilationSubTask task;
  final ValueChanged<CompilationSubTask> onTaskTap;

  const TaskTileNode({super.key, required this.task, required this.onTaskTap});

  @override
  Widget build(BuildContext context) {
    final isComplete = task.isCompleted;
    final isPending =
        task.status == TaskStatus.pending ||
        task.status == TaskStatus.pendingEmployerSignature;

    return InkWell(
      onTap: () => onTaskTap(task),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        margin: const EdgeInsets.only(bottom: 4),
        decoration: BoxDecoration(
          color: isComplete
              ? const Color(0xFFE0F2F1).withValues(alpha: 0.5)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            // ── Status Icon ───────────────────────────────────────
            Icon(
              isComplete
                  ? Icons.check_circle_rounded
                  : isPending
                  ? Icons.access_time_rounded
                  : Icons.radio_button_unchecked_rounded,
              size: 20,
              color: isComplete
                  ? const Color(0xFF109B85)
                  : isPending
                  ? const Color(0xFFF59E0B)
                  : Colors.grey.shade400,
            ),
            const SizedBox(width: 12),
            // ── Title ─────────────────────────────────────────────
            Expanded(
              child: Text(
                task.title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: isComplete
                      ? const Color(0xFF109B85)
                      : const Color(0xFF334155),
                  decoration: isComplete ? TextDecoration.lineThrough : null,
                ),
              ),
            ),
            // ── Action Type Badge ─────────────────────────────────
            TaskActionBadge(type: task.actionType),
            const SizedBox(width: 4),
            Icon(
              Icons.chevron_right_rounded,
              size: 18,
              color: Colors.grey.shade400,
            ),
          ],
        ),
      ),
    );
  }
}

/// Displays the visual pill indicating the type of action required
class TaskActionBadge extends StatelessWidget {
  final TaskActionType type;

  const TaskActionBadge({super.key, required this.type});

  @override
  Widget build(BuildContext context) {
    final (String label, Color color) = switch (type) {
      TaskActionType.acknowledge => ('ACK', const Color(0xFF6366F1)),
      TaskActionType.acknowledgeSign => ('ACK+SIGN', const Color(0xFF8B5CF6)),
      TaskActionType.upload => ('UPLOAD', const Color(0xFF3B82F6)),
      TaskActionType.signature => ('SIGN', const Color(0xFFF59E0B)),
      TaskActionType.form => ('FORM', const Color(0xFF10B981)),
      TaskActionType.fillAndSign => ('FILL+SIGN', const Color(0xFF0EA5E9)),
      TaskActionType.splitField => ('DUAL', const Color(0xFFEF4444)),
      TaskActionType.none => ('', Colors.transparent),
    };

    if (label.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w700,
          color: color,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
