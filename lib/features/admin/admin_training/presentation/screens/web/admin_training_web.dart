import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_training/presentation/screens/widgets/create_training_dialog.dart';
import 'package:bhmh/features/admin/admin_training/presentation/training_assign_card_data.dart';
import 'package:bhmh/features/admin/admin_training/presentation/screens/widgets/training_assign_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/admin/admin_training/presentation/training_counter_card_data.dart';
import 'package:bhmh/features/admin/admin_training/presentation/provider/admin_training_provider.dart';

class AdminTrainingWeb extends StatelessWidget {
  const AdminTrainingWeb({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text(
          "Employee Training",
          style: context.textTheme.headlineSmall?.copyWith(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: context.primaryColor,
          ),
        ),
        trailing: ElevatedButton.icon(
          onPressed: () => showDialog(
            context: context,
            builder: (context) => const CreateTrainingDialog(),
          ),
          icon: const Icon(Icons.add_rounded, size: 20),
          label: const Text("Create New Template"),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryColor,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 0,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.symmetric(
          vertical: context.screenHeight * 0.02,
          horizontal: context.screenWidth * 0.01,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Text(
                    //   "Training Management",
                    //   style: context.textTheme.titleLarge?.copyWith(
                    //     fontSize: 18,
                    //     fontWeight: FontWeight.w800,
                    //     color: AppColors.primaryColor,
                    //     letterSpacing: -0.8,
                    //   ),
                    // ),
                    // const SizedBox(height: 4),
                    // const Text(
                    //   "Monitor compliance and manage training templates for the clinic.",
                    //   style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
                    // ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 40),

            // Statistics Grid (Uses Row internally in TrainingCounterCardData)
            const TrainingCounterCardData(),
            const SizedBox(height: 24),
            const TrainingAssignCard(),
            const SizedBox(height: 48),

            // Main Content Area
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Active Training Modules",
                        style: context.textTheme.titleLarge?.copyWith(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primaryColor,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 20),
                      const TrainingAssignCardData(),
                    ],
                  ),
                ),
                const SizedBox(width: 40),
                const Expanded(flex: 1, child: _AdminTrainingQuickActions()),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AdminTrainingQuickActions extends ConsumerWidget {
  const _AdminTrainingQuickActions();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trainingStatsAsync = ref.watch(adminTrainingStatsProvider);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Quick Info",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.primaryColor,
            ),
          ),
          const SizedBox(height: 16),
          trainingStatsAsync.when(
            data: (stats) => Column(
              children: [
                _InfoTile(
                  icon: Icons.info_outline_rounded,
                  title: "Global Compliance",
                  value: "${stats.complianceRate}%",
                ),
                const SizedBox(height: 12),
                _InfoTile(
                  icon: Icons.warning_amber_rounded,
                  title: "Overdue Trainings",
                  value: "${stats.overdueCount}",
                ),
              ],
            ),
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
            error: (e, _) => const Text(
              'Failed to load stats',
              style: TextStyle(color: Colors.red, fontSize: 12),
            ),
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 24),
          const Text(
            "Help & Guidelines",
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          const Text(
            "Templates define specific training requirements (e.g., certificates) that staff must complete and upload for verification.",
            style: TextStyle(fontSize: 13, height: 1.5),
          ),
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;

  const _InfoTile({
    required this.icon,
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.primaryColor),
        const SizedBox(width: 12),
        Expanded(child: Text(title, style: const TextStyle(fontSize: 14))),
        Text(
          value,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}
