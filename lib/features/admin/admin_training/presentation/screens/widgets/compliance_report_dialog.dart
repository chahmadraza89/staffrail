import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/features/admin/admin_training/presentation/provider/admin_training_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ignore_for_file: unused_local_variable
class ComplianceReportDialog extends ConsumerWidget {
  const ComplianceReportDialog({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final templatesAsync = ref.watch(adminClinicTrainingsProvider);
    final complianceMap = ref.watch(adminTrainingComplianceProvider);
    final isMobile = context.screenWidth < 600;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        width: 800,
        height: 600,
        padding: const EdgeInsets.all(32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Compliance Report',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryColor,
                      ),
                    ),
                    Text(
                      'Drill-down breakdown of all active training modules.',
                      style: TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 32),
            Expanded(
              child: templatesAsync.when(
                data: (templates) {
                  if (templates.isEmpty) {
                    return const Center(
                      child: Text('No active training modules found.'),
                    );
                  }

                  return ListView.separated(
                    itemCount: templates.length,
                    separatorBuilder: (_, _) => const Divider(height: 32),
                    itemBuilder: (context, index) {
                      final template = templates[index];
                      final compliance =
                          complianceMap[template.id] ??
                          (completed: 0, total: 0);
                      final double percentage = compliance.total == 0
                          ? 0
                          : (compliance.completed / compliance.total) * 100;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.assignment_turned_in_rounded,
                                  size: 18,
                                  color: AppColors.primaryColor,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  template.title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                              Text(
                                '${(percentage.isNaN || percentage.isInfinite ? 0.0 : percentage).toStringAsFixed(1)}%',
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  color: percentage > 80
                                      ? Colors.green
                                      : (percentage > 50
                                            ? Colors.orange
                                            : Colors.red),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          LinearProgressIndicator(
                            value: percentage / 100,
                            backgroundColor: Colors.grey.shade100,
                            color: percentage > 80
                                ? Colors.green
                                : (percentage > 50
                                      ? Colors.orange
                                      : Colors.red),
                            minHeight: 8,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${compliance.completed} of ${compliance.total} staff members completed.',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                              Text(
                                template.requirementType.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey.shade400,
                                ),
                              ),
                            ],
                          ),
                        ],
                      );
                    },
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text('Error: $e')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
