import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/employee/training/presentation/screens/mobile/training_home_mob.dart';
import 'package:bhmh/features/employee/training/presentation/screens/web/training_home_web.dart';
import 'package:flutter/material.dart';

class TrainingPages extends StatelessWidget {
  const TrainingPages({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => TrainingHomeMobile(),
      web: (_) => TrainingHomeWeb(),
    );
  }
}
