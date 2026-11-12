import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';

class ActivityTimeline extends StatelessWidget {
  final CompilationSubTask task;
  const ActivityTimeline({super.key, required this.task});

  String _formatDate(DateTime? date) {
    if (date == null) return 'Pending';
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[date.month - 1]} ${date.day}';
  }

  @override
  Widget build(BuildContext context) {
    final isSubmitted =
        task.status != TaskStatus.pending &&
        task.status != TaskStatus.notStarted &&
        task.status != TaskStatus.rejected;
    final isVerified =
        task.status == TaskStatus.verified ||
        task.status == TaskStatus.completed;

    return Row(
      children: [
        TimelineStep(
          title: 'Assigned',
          date: _formatDate(task.updatedAt ?? DateTime.now()),
          isActive: true,
          showAvatar: false,
        ),
        Expanded(
          child: Container(
            height: 2,
            color: isSubmitted
                ? const Color(0xFF10B981)
                : const Color(0xFFCBD5E1),
          ),
        ),
        TimelineStep(
          title: 'Submitted',
          date: isSubmitted ? _formatDate(task.updatedAt) : 'Pending',
          isActive: isSubmitted,
          showAvatar: isSubmitted,
        ),
        Expanded(
          child: Container(
            height: 2,
            color: isVerified
                ? const Color(0xFF10B981)
                : const Color(0xFFCBD5E1),
          ),
        ),
        TimelineStep(
          title: 'Verified',
          date: isVerified ? _formatDate(task.completedAt) : 'Pending',
          isActive: isVerified,
          showAvatar: false,
        ),
      ],
    );
  }
}

class TimelineStep extends StatelessWidget {
  final String title;
  final String date;
  final bool isActive;
  final bool showAvatar;

  const TimelineStep({
    super.key,
    required this.title,
    required this.date,
    required this.isActive,
    required this.showAvatar,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFF10B981) : Colors.white,
            shape: BoxShape.circle,
            border: Border.all(
              color: isActive
                  ? const Color(0xFF10B981)
                  : const Color(0xFFCBD5E1),
              width: 2,
            ),
          ),
          child: Center(
            child: showAvatar
                ? const Icon(Icons.person, size: 16, color: Colors.white)
                : Icon(
                    isActive ? Icons.check : Icons.circle,
                    size: 16,
                    color: isActive ? Colors.white : const Color(0xFFCBD5E1),
                  ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isActive ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
          ),
        ),
        Text(
          date,
          style: TextStyle(
            fontSize: 10,
            color: isActive ? const Color(0xFF64748B) : const Color(0xFFCBD5E1),
          ),
        ),
      ],
    );
  }
}

class CompactActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const CompactActionButton({
    super.key,
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
