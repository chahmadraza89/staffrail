import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/admin_clearance_action_header_data.dart';
import 'package:flutter/material.dart';

class AdminClearanceWeb extends StatelessWidget {
  const AdminClearanceWeb({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text(
          "Admin Clearance",
          style: context.titleLarge.copyWith(fontSize: 18),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            vertical: context.screenHeight * 0.02,
            horizontal: context.screenWidth * 0.01,
          ),
          child: Column(children: const [AdminClearanceData()]),
        ),
      ),
    );
  }
}
