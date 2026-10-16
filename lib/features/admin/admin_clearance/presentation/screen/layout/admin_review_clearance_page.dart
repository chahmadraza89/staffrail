import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/screen/mobile/admin_clearance_detail_screen.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/screen/web/admin_clearance_detail_web.dart';
import 'package:flutter/material.dart';

class AdminReviewClearancePage extends StatelessWidget {
  final String employeeId;
  final String clearanceId;

  const AdminReviewClearancePage({
    super.key,
    required this.employeeId,
    required this.clearanceId,
  });

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => AdminClearanceDetailScreen(
        employeeId: employeeId,
        clearanceId: clearanceId,
      ),
      web: (_) => AdminClearanceDetailWeb(
        employeeId: employeeId,
        clearanceId: clearanceId,
      ),
    );
  }
}
