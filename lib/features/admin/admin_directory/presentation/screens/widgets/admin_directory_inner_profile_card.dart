// ignore_for_file: deprecated_member_use

import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/widgets/admin_directory_helpers.dart';
import 'package:bhmh/features/admin/admin_home/data/model/admin_dashboard_models.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher_string.dart';

class ProgressOverview extends StatelessWidget {
  final AdminEmployeeProgress employee;
  const ProgressOverview({super.key, required this.employee});

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 600;

    return Column(
      children: [
        AnimatedProgressBar(
          label: 'Overall Progress',
          value: employee.overallProgress,
          color: const Color(0xFF109B85),
        ),
        const SizedBox(height: 16),
        // Responsive row/column for sub-progress
        if (isMobile) ...[
          AnimatedProgressBar(
            label: 'Onboarding',
            value: employee.onboardingProgress,
            color: const Color(0xFF3B82F6),
            isSmall: true,
          ),
          const SizedBox(height: 16),
          AnimatedProgressBar(
            label: 'Training',
            value: employee.trainingProgress,
            color: const Color(0xFFF59E0B),
            isSmall: true,
          ),
        ] else ...[
          Row(
            children: [
              Expanded(
                child: AnimatedProgressBar(
                  label: 'Onboarding',
                  value: employee.onboardingProgress,
                  color: const Color(0xFF3B82F6),
                  isSmall: true,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: AnimatedProgressBar(
                  label: 'Training',
                  value: employee.trainingProgress,
                  color: const Color(0xFFF59E0B),
                  isSmall: true,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class AnimatedProgressBar extends StatelessWidget {
  final String label;
  final double value;
  final Color color;
  final bool isSmall;

  const AnimatedProgressBar({
    super.key,
    required this.label,
    required this.value,
    required this.color,
    this.isSmall = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(isSmall ? 16 : 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200, width: 1.5),
      ),
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(begin: 0.0, end: value),
        duration: const Duration(milliseconds: 1200),
        curve: Curves.easeOutExpo,
        builder: (context, animatedValue, _) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF1E293B),
                      fontSize: isSmall ? 13 : 15,
                    ),
                  ),
                  Text(
                    '${(animatedValue * 100).toInt()}%',
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: isSmall ? 13 : 16,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                height: isSmall ? 6 : 8,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: FractionallySizedBox(
                  alignment: Alignment.centerLeft,
                  widthFactor: animatedValue,
                  child: Container(
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class AnimatedDocTile extends StatelessWidget {
  final CompilationSubTask task;
  const AnimatedDocTile({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final bool isDone =
        task.status == TaskStatus.verified ||
        task.status == TaskStatus.completed;
    final Color tintColor = AdminDirectoryHelpers.getStatusColor(task.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100, width: 1.5),
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
              task.fileUrl != null
                  ? Icons.description_rounded
                  : Icons.upload_file_rounded,
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
                  task.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                    fontSize: 14,
                  ),
                ),
                Text(
                  isDone ? 'Verified' : 'Pending Review',
                  style: TextStyle(
                    color: tintColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          if (task.fileUrl != null)
            IconButton(
              onPressed: () => launchUrlString(task.fileUrl!),
              icon: const Icon(
                Icons.open_in_new_rounded,
                size: 20,
                color: Color(0xFF64748B),
              ),
            ),
        ],
      ),
    );
  }
}
