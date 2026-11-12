import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_training/presentation/screens/widgets/create_training_dialog.dart';
import 'package:bhmh/features/admin/admin_training/presentation/training_assign_card_data.dart';
import 'package:bhmh/features/admin/admin_training/presentation/screens/widgets/training_assign_card.dart';
import 'package:flutter/material.dart';
import 'package:bhmh/features/admin/admin_training/presentation/training_counter_card_data.dart';

import '../../../../../../core/utils/theme.dart' show ThemeExtension;

class AdminTrainingMobile extends StatelessWidget {
  const AdminTrainingMobile({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text(
          "Employee Training",
          style: context.textTheme.headlineSmall?.copyWith(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: context.primaryColor,
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.white,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          builder: (context) => const CreateTrainingDialog(isMobile: true),
        ),

        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text(
          "New Template",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.symmetric(
          horizontal: context.screenWidth * 0.030,
          vertical: context.screenHeight * 0.01,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TrainingCounterCardData(),
            SizedBox(height: 16),
            TrainingAssignCard(),
            SizedBox(height: 32),
            Text(
              "Active Training Modules",
              style: context.textTheme.titleLarge?.copyWith(),
            ),
            SizedBox(height: 16),
            TrainingAssignCardData(),
          ],
        ),
      ),
    );
  }
}
