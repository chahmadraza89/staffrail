import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/admin_clearance_view_data.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AdminClearanceDetailScreen extends StatelessWidget {
  final String employeeId;
  final String clearanceId;
  const AdminClearanceDetailScreen({
    super.key,
    required this.employeeId,
    required this.clearanceId,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        showBackButton: true,
        onLeadingTap: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(AdminRoutes.clearance);
          }
        },
        title: Text(
          "Admin Clearance Detail",
          style: context.titleLarge.copyWith(fontSize: 16),
        ),
      ),
      body: AdminClearanceViewData(
        employeeId: employeeId,
        clearanceId: clearanceId,
      ),
    );
  }
}
