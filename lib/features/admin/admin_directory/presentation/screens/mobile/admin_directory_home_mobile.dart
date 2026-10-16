import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/admin_directory_profile_card_data.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/admin_employee_form.dart';
import 'package:flutter/material.dart';

class AdminDirectoryHomeMobile extends StatelessWidget {
  const AdminDirectoryHomeMobile({super.key});

  void _showAddEmployeeForm(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => const AdminEmployeeForm(isMobile: true),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text(
          "Employee Directory",
          style: context.textTheme.headlineSmall?.copyWith(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: context.primaryColor,
          ),
        ),
      ),
      body: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: context.screenWidth * 0.030,
          vertical: context.screenHeight * 0.01,
        ),
        child: SingleChildScrollView(
          child: Column(children: const [AdminDirectoryListData()]),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddEmployeeForm(context),
        child: const Icon(Icons.person_add_rounded),
      ),
    );
  }
}
