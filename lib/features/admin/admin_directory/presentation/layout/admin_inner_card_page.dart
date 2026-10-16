import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/mobile/admin_card_inner_card_mobile.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/web/admin_directory_inner_card_web.dart';
import 'package:flutter/material.dart';

class AdminInnerCardPage extends StatelessWidget {
  final String employeeId;
  const AdminInnerCardPage({super.key, required this.employeeId});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => AdminCardInnerCardMobile(employeeId: employeeId),
      web: (_) => AdminDirectoryInnerCardWeb(employeeId: employeeId),
    );
  }
}
