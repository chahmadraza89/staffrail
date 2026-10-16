import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/admin/admin_training/presentation/screens/mobile/admin_training_mobile.dart';
import 'package:bhmh/features/admin/admin_training/presentation/screens/web/admin_training_web.dart';
import 'package:flutter/material.dart';

class AdminTrainingPage extends StatelessWidget {
  const AdminTrainingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => AdminTrainingMobile(),
      web: (_) => AdminTrainingWeb(),
    );
  }
}
