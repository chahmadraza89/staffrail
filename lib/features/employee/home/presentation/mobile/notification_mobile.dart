import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/employee/home/presentation/notification_card_data.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class NotificationMobile extends StatelessWidget {
  const NotificationMobile({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        showBackButton: true,
        onLeadingTap: () {
          if (context.canPop()) {
            context.pop();
          } else {
            // Dynamically route back based on the current location
            final location = GoRouterState.of(context).uri.toString();
            if (location.startsWith('/admin')) {
              context.go(AdminRoutes.dashboard);
            } else {
              context.go(UserRoutes.dashboard);
            }
          }
        },
        title: Text(
          "Notifications",
          style: context.textTheme.headlineSmall?.copyWith(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: context.primaryColor,
          ),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: context.screenWidth * 0.030,
            vertical: context.screenHeight * 0.015,
          ),
          child: const SingleChildScrollView(
            child: NotificationCard(),
          ),
        ),
      ),
    );
  }
}
