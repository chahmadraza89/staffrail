import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/profile_directory_inner_profile_card_data.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AdminDirectoryInnerCardWeb extends StatelessWidget {
  final String employeeId;
  const AdminDirectoryInnerCardWeb({super.key, required this.employeeId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, size: 20),
          color: AppColors.primaryColor,
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Employee Profile Detail',
          style: TextStyle(
            color: AppColors.primaryColor,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: Container(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 40),
        child: AdminDirectoryInnerProfileCard(employeeId: employeeId),
      ),
    );
  }
}
