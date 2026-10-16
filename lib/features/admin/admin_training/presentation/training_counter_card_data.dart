import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/features/admin/admin_training/presentation/screens/widgets/compliance_report_dialog.dart';
import 'package:bhmh/features/admin/admin_training/presentation/screens/widgets/training_counter_card.dart';
import 'package:bhmh/features/admin/admin_training/presentation/provider/admin_training_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class TrainingCounterCardData extends ConsumerWidget {
  const TrainingCounterCardData({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isMobile = context.screenWidth < 600;
    final trainingStatsAsync = ref.watch(adminTrainingStatsProvider);

    return trainingStatsAsync.when(
      data: (stats) {
        final totalActive = stats.totalActive;
        final complianceRate = stats.complianceRate;
        final overdue = stats.overdueCount;

        if (isMobile) {
          return Column(
            children: [
              TrainingCounterCard(
                index: 0,
                title: 'Total Active Trainings',
                targetValue: totalActive.toDouble(),
                icon: Icons.menu_book_rounded,
                themeColor: AppColors.primaryColor,
                onTap: () => showDialog(
                  context: context,
                  builder: (context) => const ComplianceReportDialog(),
                ),
              ),
              const SizedBox(height: 16),
              TrainingCounterCard(
                index: 1,
                title: 'Overall Compliance Rate',
                targetValue: complianceRate,
                valueSuffix: '%',
                icon: Icons.verified_user_rounded,
                themeColor: AppColors.primaryColor,
                hasDecor: true,
                onTap: () => showDialog(
                  context: context,
                  builder: (context) => const ComplianceReportDialog(),
                ),
              ),
              const SizedBox(height: 16),
              TrainingCounterCard(
                index: 2,
                title: 'Overdue Trainings',
                targetValue: overdue.toDouble(),
                icon: Icons.warning_rounded,
                themeColor: const Color(0xFFEF4444),
                valueColor: const Color(0xFFB91C1C),
                onTap: () => showDialog(
                  context: context,
                  builder: (context) => const ComplianceReportDialog(),
                ),
              ),
            ],
          );
        }

        return Row(
          children: [
            Expanded(
              child: TrainingCounterCard(
                index: 0,
                title: 'Total Active Trainings',
                targetValue: totalActive.toDouble(),
                icon: Icons.menu_book_rounded,
                themeColor: AppColors.primaryColor,
                onTap: () => showDialog(
                  context: context,
                  builder: (context) => const ComplianceReportDialog(),
                ),
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: TrainingCounterCard(
                index: 1,
                title: 'Overall Compliance Rate',
                targetValue: complianceRate,
                valueSuffix: '%',
                themeColor: AppColors.primaryColor,
                hasDecor: true,
                onTap: () => showDialog(
                  context: context,
                  builder: (context) => const ComplianceReportDialog(),
                ),
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: TrainingCounterCard(
                index: 2,
                title: 'Overdue Trainings',
                targetValue: overdue.toDouble(),
                icon: Icons.warning_rounded,
                themeColor: const Color(0xFFEF4444),
                valueColor: const Color(0xFFB91C1C),
                onTap: () => showDialog(
                  context: context,
                  builder: (context) => const ComplianceReportDialog(),
                ),
              ),
            ),
          ],
        );
      },
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: CircularProgressIndicator(),
        ),
      ),
      error: (e, st) => SelectionArea(
        child: Text(
          'Error: $e',
          style: const TextStyle(color: Colors.red, fontSize: 10),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }
}
