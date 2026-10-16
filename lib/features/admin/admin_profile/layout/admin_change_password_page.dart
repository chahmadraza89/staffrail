import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/admin/admin_profile/mobile/change_password_mobile.dart';
import 'package:bhmh/features/admin/admin_profile/web/change_password_web.dart';
import 'package:flutter/material.dart';

class AdminChangePasswordPage extends StatelessWidget {
  const AdminChangePasswordPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => const ChangePasswordMobile(),
      web: (_) => const ChangePasswordWeb(),
    );
  }
}
