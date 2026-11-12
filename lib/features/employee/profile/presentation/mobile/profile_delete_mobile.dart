import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ProfileDeleteMobile extends StatelessWidget {
  final String fallbackRoute;
  final Widget content;

  const ProfileDeleteMobile({
    super.key,
    required this.fallbackRoute,
    required this.content,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        showBackButton: true,
        onLeadingTap: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(fallbackRoute);
          }
        },
        title: Text(
          "Delete Account",
          style: context.titleLarge.copyWith(
            fontSize: 16,
            color: AppColors.primaryColor,
          ),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: context.screenWidth * 0.04,
            vertical: context.screenHeight * 0.02,
          ),
          child: Column(children: [content]),
        ),
      ),
    );
  }
}
