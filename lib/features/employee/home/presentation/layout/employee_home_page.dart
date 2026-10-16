import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/employee/home/presentation/mobile/employee_dash_mob.dart';
import 'package:bhmh/features/employee/home/presentation/web/employee_dash_web.dart';
import 'package:flutter/material.dart';

class EmployeeHomePage extends StatelessWidget {
  const EmployeeHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => const EmployeeDashMob(),
      web: (_) => const EmployeeDashWeb(),
    );
  }
}
