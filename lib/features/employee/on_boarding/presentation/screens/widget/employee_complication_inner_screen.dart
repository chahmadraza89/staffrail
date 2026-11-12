import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';

class CompilationSubTaskTile extends StatelessWidget {
  final CompilationSubTask subTask;
  final bool isMobile;
  final VoidCallback? onTap;

  const CompilationSubTaskTile({
    super.key,
    required this.subTask,
    required this.isMobile,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const Color tealColor = Color(0xFF109B85);
    const Color greyBorder = Color(0xFFF1F5F9);
    const Color textDark = Color(0xFF0F172A);
    const Color textMuted = Color(0xFF64748B);

    // Get badge color and label based on status
    final badgeData = _getBadgeData(subTask.status, subTask.isCompleted);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      hoverColor: Colors.grey.shade50,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8.0),
        padding: EdgeInsets.all(isMobile ? 12.0 : 16.0),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: greyBorder, width: 1.5),
        ),
        child: Row(
          children: [
            Icon(
              subTask.status == TaskStatus.noActionRequired
                  ? Icons.check_circle_rounded
                  : (subTask.isCompleted
                      ? Icons.check_circle_outline_rounded
                      : Icons.radio_button_unchecked_rounded),
              color: subTask.status == TaskStatus.noActionRequired
                  ? Colors.grey.shade400
                  : (subTask.isCompleted ? tealColor : Colors.grey.shade400),
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    subTask.title,
                    style: TextStyle(
                      fontSize: isMobile ? 14 : 15,
                      fontWeight: FontWeight.w500,
                      decoration: (subTask.isCompleted ||
                              subTask.status == TaskStatus.noActionRequired)
                          ? TextDecoration.lineThrough
                          : null,
                      color: (subTask.isCompleted ||
                              subTask.status == TaskStatus.noActionRequired)
                          ? textMuted
                          : textDark,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (subTask.subtitleIcon != null) ...[
                        Icon(subTask.subtitleIcon, size: 16, color: textMuted),
                        const SizedBox(width: 4),
                      ],
                      Expanded(
                        child: Text(
                          subTask.subtitle,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: isMobile ? 12 : 13,
                            color: textMuted,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Status Badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: badgeData.backgroundColor,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (badgeData.icon != null) ...[
                              Icon(
                                badgeData.icon,
                                size: 12,
                                color: badgeData.textColor,
                              ),
                              const SizedBox(width: 4),
                            ],
                            Text(
                              badgeData.label,
                              style: TextStyle(
                                fontSize: isMobile ? 10 : 11,
                                fontWeight: FontWeight.w600,
                                color: badgeData.textColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  _BadgeData _getBadgeData(TaskStatus? status, bool isCompleted) {
    const Color tealColor = Color(0xFF109B85);
    const Color orangeColor = Color(0xFFF59E0B);
    const Color blueColor = Color(0xFF3B82F6);
    const Color purpleColor = Color(0xFF8B5CF6);
    const Color greenColor = Color(0xFF10B981);
    const Color redColor = Color(0xFFEF4444);
    const Color greyColor = Color(0xFF6B7280);

    if (status == TaskStatus.noActionRequired) {
      return _BadgeData(
        label: 'No Action Required',
        backgroundColor: const Color(0xFFF1F5F9),
        textColor: const Color(0xFF64748B),
        icon: Icons.check_rounded,
      );
    }

    if (isCompleted) {
      return _BadgeData(
        label: 'Completed',
        backgroundColor: tealColor.withValues(alpha: 0.1),
        textColor: tealColor,
        icon: Icons.check_rounded,
      );
    }

    switch (status) {
      case TaskStatus.notStarted:
        return _BadgeData(
          label: 'Not Started',
          backgroundColor: greyColor.withValues(alpha: 0.1),
          textColor: greyColor,
          icon: Icons.circle_outlined,
        );
      case TaskStatus.pending:
        return _BadgeData(
          label: 'Pending',
          backgroundColor: orangeColor.withValues(alpha: 0.1),
          textColor: orangeColor,
          icon: Icons.access_time,
        );
      case TaskStatus.submitted:
        return _BadgeData(
          label: 'Submitted',
          backgroundColor: blueColor.withValues(alpha: 0.1),
          textColor: blueColor,
          icon: Icons.upload_file_rounded,
        );
      case TaskStatus.waitingForApprover:
        return _BadgeData(
          label: 'Waiting for Approver',
          backgroundColor: purpleColor.withValues(alpha: 0.1),
          textColor: purpleColor,
          icon: Icons.hourglass_empty_rounded,
        );
      case TaskStatus.rejected:
        return _BadgeData(
          label: 'Needs Rework',
          backgroundColor: redColor.withValues(alpha: 0.1),
          textColor: redColor,
          icon: Icons.warning_amber_rounded,
        );
      case TaskStatus.acknowledged:
        return _BadgeData(
          label: 'Acknowledged',
          backgroundColor: tealColor.withValues(alpha: 0.1),
          textColor: tealColor,
          icon: Icons.check_circle_outline_rounded,
        );
      case TaskStatus.completed:
        return _BadgeData(
          label: 'Completed',
          backgroundColor: tealColor.withValues(alpha: 0.1),
          textColor: tealColor,
          icon: Icons.check_circle_rounded,
        );
      case TaskStatus.verified:
        return _BadgeData(
          label: 'Verified',
          backgroundColor: greenColor.withValues(alpha: 0.1),
          textColor: greenColor,
          icon: Icons.verified_rounded,
        );
      case TaskStatus.signed:
        return _BadgeData(
          label: 'Signed',
          backgroundColor: tealColor.withValues(alpha: 0.1),
          textColor: tealColor,
          icon: Icons.edit_rounded,
        );
      case TaskStatus.confirmed:
        return _BadgeData(
          label: 'Confirmed',
          backgroundColor: tealColor.withValues(alpha: 0.1),
          textColor: tealColor,
          icon: Icons.thumb_up_rounded,
        );
      case TaskStatus.cleared:
        return _BadgeData(
          label: 'Cleared',
          backgroundColor: greenColor.withValues(alpha: 0.1),
          textColor: greenColor,
          icon: Icons.security_rounded,
        );
      case TaskStatus.required:
        return _BadgeData(
          label: 'Required',
          backgroundColor: redColor.withValues(alpha: 0.1),
          textColor: redColor,
          icon: Icons.error_outline_rounded,
        );
      default:
        return _BadgeData(
          label: 'Pending',
          backgroundColor: greyColor.withValues(alpha: 0.1),
          textColor: greyColor,
          icon: null,
        );
    }
  }
}

class _BadgeData {
  final String label;
  final Color backgroundColor;
  final Color textColor;
  final IconData? icon;

  _BadgeData({
    required this.label,
    required this.backgroundColor,
    required this.textColor,
    this.icon,
  });
}
