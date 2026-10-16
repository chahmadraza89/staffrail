import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/employee_complication_card_data.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/employee_tasks_compliance_score.dart';
import 'package:flutter/material.dart';

class EmployeeHomeScreenMob extends StatelessWidget {
  const EmployeeHomeScreenMob({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        showBackButton: true,
        title: Text(
          'Onboarding',
          style: context.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: context.primaryColor,
          ),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: context.screenWidth * 0.030,
            vertical: context.screenHeight * 0.01,
          ),

          child: Column(
            children: const [
              EmployeeTasksComplianceScore(),
              SizedBox(height: 10),
              Expanded(child: EmployeeComplicationCardData()),
            ],
          ),
        ),
      ),
    );
  }
}
