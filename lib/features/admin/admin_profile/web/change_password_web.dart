import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_profile/admin_change_password_data.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ChangePasswordWeb extends StatelessWidget {
  final String? fallbackRoute;
  const ChangePasswordWeb({super.key, this.fallbackRoute});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        showBackButton: true,
        onLeadingTap: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(fallbackRoute ?? AdminRoutes.profile);
          }
        },
        title: Text(
          'Security Settings',
          style: context.titleLarge.copyWith(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppColors.primaryColor,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.symmetric(
              vertical: context.screenHeight * 0.05,
              horizontal: context.screenWidth * 0.01,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [AdminChangePasswordData(fallbackRoute: fallbackRoute)],
            ),
          ),
        ),
      ),
    );
  }
}
