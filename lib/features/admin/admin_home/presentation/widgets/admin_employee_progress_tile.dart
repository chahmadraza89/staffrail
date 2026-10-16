import 'package:bhmh/features/admin/admin_home/data/model/admin_dashboard_models.dart';
import 'package:flutter/material.dart';
import 'package:gap/gap.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class AdminEmployeeProgressTile extends StatelessWidget {
  final AdminEmployeeProgress progress;
  final VoidCallback? onTap;

  const AdminEmployeeProgressTile({
    super.key,
    required this.progress,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.05)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header: Name & Last Activity
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: theme.primaryColor.withValues(
                        alpha: 0.1,
                      ),
                      child: Text(
                        progress.name[0].toUpperCase(),
                        style: TextStyle(
                          color: theme.primaryColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const Gap(12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            progress.name,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            _formatLastActivity(progress.lastLogin),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.hintColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _StatusPill(isActive: progress.isActive),
                  ],
                ),

                const Gap(16),

                // Progress Section
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                "Overall Compliance",
                                style: theme.textTheme.bodySmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                "${(progress.overallProgress * 100).toInt()}%",
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.primaryColor,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const Gap(8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: progress.overallProgress,
                              minHeight: 6,
                              backgroundColor: theme.primaryColor.withValues(
                                alpha: 0.1,
                              ),
                              valueColor: AlwaysStoppedAnimation<Color>(
                                progress.overallProgress >= 1.0
                                    ? Colors.green
                                    : theme.primaryColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const Gap(12),

                // Category Tags
                Row(
                  children: [
                    _MiniProgressTag(
                      label: "Onboarding",
                      progress: progress.onboardingProgress,
                      icon: LucideIcons.fileText,
                    ),
                    const Gap(8),
                    _MiniProgressTag(
                      label: "Trainings",
                      progress: progress.trainingProgress,
                      icon: LucideIcons.graduationCap,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatLastActivity(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inMinutes < 1) return 'Active just now';
    if (difference.inMinutes < 60) return 'Active ${difference.inMinutes}m ago';
    if (difference.inHours < 24) return 'Active ${difference.inHours}h ago';
    return 'Active ${difference.inDays}d ago';
  }
}

class _StatusPill extends StatelessWidget {
  final bool isActive;
  const _StatusPill({required this.isActive});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isActive
            ? Colors.green.withValues(alpha: 0.1)
            : Colors.grey.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        isActive ? "ACTIVE" : "INACTIVE",
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: isActive ? Colors.green : Colors.grey,
        ),
      ),
    );
  }
}

class _MiniProgressTag extends StatelessWidget {
  final String label;
  final double progress;
  final IconData icon;

  const _MiniProgressTag({
    required this.label,
    required this.progress,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDone = progress >= 1.0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.dividerColor.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.05)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isDone ? LucideIcons.checkCircle2 : icon,
            size: 12,
            color: isDone
                ? Colors.green
                : theme.iconTheme.color?.withValues(alpha: 0.5),
          ),
          const Gap(4),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              fontSize: 10,
              color: isDone ? Colors.green : theme.textTheme.labelSmall?.color,
            ),
          ),
        ],
      ),
    );
  }
}
