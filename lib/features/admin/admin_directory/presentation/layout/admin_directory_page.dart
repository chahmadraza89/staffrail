import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/mobile/admin_directory_home_mobile.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/web/admin_directory_home_web.dart';
import 'package:flutter/material.dart';

class AdminDirectoryPage extends StatelessWidget {
  const AdminDirectoryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => AdminDirectoryHomeMobile(),
      web: (_) => AdminDirectoryHomeWeb(),
    );
  }
}
