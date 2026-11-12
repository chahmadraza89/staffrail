import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/mobile/employee_home_screen_mob.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/web/employee_home_screen_web.dart';
import 'package:flutter/material.dart';

class EmployeeOnBoardingPages extends StatelessWidget {
  const EmployeeOnBoardingPages({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => const EmployeeHomeScreenMob(),
      web: (_) => const EmployeeHomeScreenWeb(),
    );
  }
}
