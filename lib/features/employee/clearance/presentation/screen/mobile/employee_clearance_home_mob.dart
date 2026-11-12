import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/employee/clearance/presentation/employee_clearance_score.dart';
import 'package:bhmh/features/employee/clearance/presentation/employee_clearance_tile_data.dart';
import 'package:flutter/material.dart';

class EmployeeClearanceHomeMobile extends StatelessWidget {
  const EmployeeClearanceHomeMobile({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text("Background Clearance", style: context.titleMedium),
      ),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: context.screenWidth * 0.030,
            vertical: context.screenHeight * 0.01,
          ),

          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const EmployeeClearanceScore(),
              // const SizedBox(height: 10),
              // Text("Clearance Checklist", style: context.titleMedium),
              const SizedBox(height: 10),
              Expanded(child: EmployeeClearanceTileData()),
            ],
          ),
        ),
      ),
    );
  }
}
