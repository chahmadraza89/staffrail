import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/employee_complication_card_data.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/employee_tasks_compliance_score.dart';
import 'package:flutter/material.dart';

class EmployeeHomeScreenWeb extends StatelessWidget {
  const EmployeeHomeScreenWeb({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text(
          'Tasks Details',
          style: context.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
            fontSize: 18,
            color: context.primaryColor,
          ),
        ),
      ),

      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            vertical: context.screenHeight * 0.02,
            horizontal: context.screenWidth * 0.01,
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
