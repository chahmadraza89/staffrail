import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/admin/admin_profile/admin_delete_account_data.dart';
import 'package:bhmh/features/employee/profile/presentation/mobile/profile_delete_mobile.dart';
import 'package:bhmh/features/employee/profile/presentation/web/profile_delete_web.dart';
import 'package:flutter/material.dart';

class AdminDeleteAccountPage extends StatelessWidget {
  const AdminDeleteAccountPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => const ProfileDeleteMobile(
        fallbackRoute: AdminRoutes.profile,
        content: AdminDeleteAccountData(),
      ),
      web: (_) => const ProfileDeleteWeb(
        fallbackRoute: AdminRoutes.profile,
        content: AdminDeleteAccountData(),
      ),
    );
  }
}
