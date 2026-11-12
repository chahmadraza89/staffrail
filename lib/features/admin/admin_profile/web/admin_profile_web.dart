import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/features/admin/admin_profile/admin_profile_data.dart';
import 'package:flutter/material.dart';

class AdminProfileWeb extends StatelessWidget {
  const AdminProfileWeb({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            vertical: context.screenHeight * 0.05,
            horizontal: context.screenWidth * 0.01,
          ),
          child: Column(children: [AdminProfileData()]),
        ),
      ),
    );
  }
}
