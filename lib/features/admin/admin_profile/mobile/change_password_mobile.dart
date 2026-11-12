import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_profile/admin_change_password_data.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ChangePasswordMobile extends StatelessWidget {
  final String? fallbackRoute;
  const ChangePasswordMobile({super.key, this.fallbackRoute});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text(
          'Security',
          style: context.titleMedium.copyWith(
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        showBackButton: true,
        onLeadingTap: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(fallbackRoute ?? AdminRoutes.profile);
          }
        },
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: context.screenWidth * 0.030,
            vertical: context.screenHeight * 0.03,
          ),
          child: AdminChangePasswordData(fallbackRoute: fallbackRoute),
        ),
      ),
    );
  }
}
