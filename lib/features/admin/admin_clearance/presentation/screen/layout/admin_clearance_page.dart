import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/screen/mobile/admin_clearance_mobile.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/screen/web/admin_clearance_web.dart';
import 'package:flutter/material.dart';

class AdminClearancePage extends StatelessWidget {
  const AdminClearancePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => AdminClearanceMobile(),
      web: (_) => AdminClearanceWeb(),
    );
  }
}
