import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/employee/training/presentation/training_compilation_indicator_data.dart';
import 'package:bhmh/features/employee/training/presentation/training_compliance_tile_data.dart';
import 'package:flutter/material.dart';

class TrainingHomeMobile extends StatelessWidget {
  const TrainingHomeMobile({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(title: Text("Trainings", style: context.titleMedium)),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: context.screenWidth * 0.030,
            vertical: context.screenHeight * 0.01,
          ),
          child: Column(
            children: const [
              TrainingCompilationIndicatorData(),
              SizedBox(height: 10),
              Expanded(child: TrainingComplianceTileData()),
            ],
          ),
        ),
      ),
    );
  }
}
