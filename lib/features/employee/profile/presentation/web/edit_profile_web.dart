import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/features/employee/profile/presentation/edit_profile_data.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class EditProfileWeb extends StatelessWidget {
  final String? fallbackRoute;
  const EditProfileWeb({super.key, this.fallbackRoute});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text(
          'Edit Profile',
          style: context.titleLarge.copyWith(
            fontWeight: FontWeight.w800,
            color: AppColors.primaryColor,
          ),
        ),
        showBackButton: true,
        onLeadingTap: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(fallbackRoute ?? UserRoutes.profile);
          }
        },
      ),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            vertical: context.screenHeight * 0.045,
            horizontal: context.screenWidth * 0.02,
          ),

          child: SingleChildScrollView(
            child: Column(children: const [EditProfileData()]),
          ),
        ),
      ),
    );
  }
}
