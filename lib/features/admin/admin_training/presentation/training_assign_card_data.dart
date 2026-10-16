import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/admin/admin_training/presentation/screens/widgets/training_assigned_card_preview.dart';
import 'package:bhmh/features/admin/admin_training/presentation/provider/admin_training_provider.dart';

class TrainingAssignCardData extends ConsumerWidget {
  const TrainingAssignCardData({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trainingsAsync = ref.watch(adminClinicTrainingsProvider);
    final complianceMap = ref.watch(adminTrainingComplianceProvider);

    return trainingsAsync.when(
      data: (trainings) {
        if (trainings.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(32.0),
              child: Text("No trainings have been created yet."),
            ),
          );
        }

        // Fetch real count of employees to show meaningful progress (e.g., 0 / 5 STAFF)
        // final employeeCount = ref
        //     .watch(adminEmployeesProgressProvider)
        //     .when(
        //       data: (list) => list.length,
        //       loading: () => 0,
        //       error: (_, _) => 0,
        //     );

        return Wrap(
          spacing: 20,
          runSpacing: 20,
          children: trainings.map((training) {
            return SizedBox(
              width: context.screenWidth > 1200
                  ? 400
                  : (context.screenWidth > 800 ? 350 : double.infinity),
              child: TrainingAssignedCardPreview(
                title: training.title,
                subtitle: training.description,
                badgeText: training.requirementType,
                badgeColor: AppColors.primaryColor,
                icon: Icons.shield_rounded,
                themeColor: AppColors.primaryColor,
                currentProgress: complianceMap[training.id]?.completed ?? 0,
                totalProgress: complianceMap[training.id]?.total ?? 0,
              ),
            );
          }).toList(),
        );
      },
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: CircularProgressIndicator(),
        ),
      ),
      error: (e, st) => Text('Error loading trainings: '),
    );
  }
}
