import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/employee/home/presentation/widget/messaging_section.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MessagesPage extends StatelessWidget {
  const MessagesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        showBackButton: true,
        onLeadingTap: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(UserRoutes.dashboard);
          }
        },
        title: Text(
          "Messages",
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MessagingSection(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
