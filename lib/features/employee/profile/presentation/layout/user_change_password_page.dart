import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/features/admin/admin_profile/mobile/change_password_mobile.dart';
import 'package:bhmh/features/admin/admin_profile/web/change_password_web.dart';
import 'package:flutter/material.dart';

class UserChangePasswordPage extends StatelessWidget {
  const UserChangePasswordPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) =>
          const ChangePasswordMobile(fallbackRoute: UserRoutes.profile),
      web: (_) => const ChangePasswordWeb(fallbackRoute: UserRoutes.profile),
    );
  }
}
