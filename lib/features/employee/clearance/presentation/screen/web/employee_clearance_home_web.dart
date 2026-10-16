import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/employee/clearance/presentation/employee_clearance_score.dart';
import 'package:bhmh/features/employee/clearance/presentation/employee_clearance_tile_data.dart';
import 'package:flutter/material.dart';

class EmployeeClearanceHomeWeb extends StatelessWidget {
  const EmployeeClearanceHomeWeb({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text("Background Clearance", style: context.titleMedium),
      ),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            vertical: context.screenHeight * 0.02,
            horizontal: context.screenWidth * 0.01,
          ),
          child: Column(
            children: const [
              EmployeeClearanceScore(),
              SizedBox(height: 10),
              Expanded(child: EmployeeClearanceTileData()),
            ],
          ),
        ),
      ),
    );
  }
}
