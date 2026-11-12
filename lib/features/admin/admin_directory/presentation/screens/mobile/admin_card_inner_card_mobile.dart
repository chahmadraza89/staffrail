import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/profile_directory_inner_profile_card_data.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AdminCardInnerCardMobile extends StatelessWidget {
  final String employeeId;
  const AdminCardInnerCardMobile({super.key, required this.employeeId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20),
          color: AppColors.primaryColor,
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Employee Detail',
          style: TextStyle(
            color: AppColors.primaryColor,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: context.screenWidth * 0.030,
          vertical: context.screenHeight * 0.01,
        ),
        child: AdminDirectoryInnerProfileCard(employeeId: employeeId),
      ),
    );
  }
}
