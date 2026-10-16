import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/admin/admin_profile/mobile/admin_profile_mobile.dart';
import 'package:bhmh/features/admin/admin_profile/web/admin_profile_web.dart';
import 'package:flutter/material.dart';

class AdminProfilePage extends StatelessWidget {
  const AdminProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (context) => const AdminProfileMobile(),
      web: (context) => const AdminProfileWeb(),
    );
  }
}
