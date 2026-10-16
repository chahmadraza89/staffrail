import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/admin/admin_home/presentation/mobile/admin_home_mobile.dart';
import 'package:bhmh/features/admin/admin_home/presentation/web/admin_home_web.dart';
import 'package:flutter/material.dart';

class AdminHomePage extends StatelessWidget {
  const AdminHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (context) => AdminHomeMobile(),
      web: (context) => AdminHomeWeb(),
    );
  }
}
