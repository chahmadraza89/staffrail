import 'package:bhmh/core/utils/task_lock_helper.dart' as task_lock_helper;
import 'package:bhmh/features/admin/admin_directory/presentation/screens/widgets/admin_directory_helpers.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';

class OnboardingTaskTile extends StatefulWidget {
  final CompilationSubTask task;
  final bool isMobile;
  final bool isSelected;
  final VoidCallback onTap;

  const OnboardingTaskTile({
    super.key,
    required this.task,
    required this.isMobile,
    this.isSelected = false,
    required this.onTap,
  });

  @override
  State<OnboardingTaskTile> createState() => _OnboardingTaskTileState();
}

class _OnboardingTaskTileState extends State<OnboardingTaskTile> {
  bool _isHovering = false;

  String _getStatusText(CompilationSubTask task) {
    if (task.status == TaskStatus.noActionRequired) {
      return 'No Action Required';
    }
    if (task.status == TaskStatus.verified ||
        task.status == TaskStatus.completed) {
      return 'Verified';
    }
    if (task.status == TaskStatus.submitted ||
        task.status == TaskStatus.signed ||
        task.status == TaskStatus.waitingForApprover) {
      return 'Pending Review';
    }
    if (task.status == TaskStatus.notStarted) {
      return 'Awaiting Submission';
    }
    if (task.status == TaskStatus.rejected) {
      return 'Action Required';
    }
    return task.status.name.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final tintColor = AdminDirectoryHelpers.getStatusColor(widget.task.status);
    final bool isDone = task_lock_helper.isTaskCompleted(widget.task.status);

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: widget.isSelected
                ? tintColor.withValues(alpha: 0.08)
                : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: widget.isSelected
                  ? tintColor
                  : _isHovering
                  ? Colors.grey.shade300
                  : Colors.grey.shade100,
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: tintColor.withValues(alpha: _isHovering ? 0.05 : 0.0),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: tintColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  widget.task.status == TaskStatus.noActionRequired
                      ? Icons.block_flipped
                      : (widget.task.subtitleIcon ?? Icons.description_rounded),
                  color: tintColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.task.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                        fontSize: 15,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _getStatusText(widget.task),
                      style: TextStyle(
                        color: tintColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              if (widget.task.status == TaskStatus.noActionRequired)
                const Icon(
                  Icons.block_flipped,
                  color: Color(0xFF64748B),
                  size: 22,
                )
              else if (isDone)
                const Icon(
                  Icons.check_circle_rounded,
                  color: Color(0xFF10B981),
                  size: 22,
                )
              else
                const Icon(
                  Icons.pending_actions_rounded,
                  color: Color(0xFFF59E0B),
                  size: 22,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
