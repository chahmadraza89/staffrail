import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/features/admin/admin_profile/admin_profile_data.dart';
import 'package:flutter/material.dart';

class AdminProfileMobile extends StatelessWidget {
  const AdminProfileMobile({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // appBar: CustomBar(
      //   title: Text(
      //     "Admin Profile",
      //     style: context.textTheme.headlineSmall?.copyWith(
      //       fontSize: 16,
      //       fontWeight: FontWeight.bold,
      //       color: context.primaryColor,
      //     ),
      //   ),
      // ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: context.screenWidth * 0.030,
              vertical: context.screenHeight * 0.03,
            ),
            child: Column(children: [AdminProfileData()]),
          ),
        ),
      ),
    );
  }
}
