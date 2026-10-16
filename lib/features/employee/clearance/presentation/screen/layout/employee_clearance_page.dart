import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/employee/clearance/presentation/screen/mobile/employee_clearance_home_mob.dart';
import 'package:bhmh/features/employee/clearance/presentation/screen/web/employee_clearance_home_web.dart';
import 'package:flutter/material.dart';

class EmployeeClearancePage extends StatelessWidget {
  const EmployeeClearancePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => const EmployeeClearanceHomeMobile(),
      web: (_) => const EmployeeClearanceHomeWeb(),
    );
  }
}
