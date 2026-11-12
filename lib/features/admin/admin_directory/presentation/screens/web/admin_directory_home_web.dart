import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/admin_directory_profile_card_data.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/admin_employee_form.dart';
import 'package:flutter/material.dart';

class AdminDirectoryHomeWeb extends StatelessWidget {
  const AdminDirectoryHomeWeb({super.key});

  void _showAddEmployeeForm(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: SizedBox(
          width: 500,
          child: const AdminEmployeeForm(isMobile: false),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text(
          "Employee Directory",
          style: context.textTheme.headlineSmall?.copyWith(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: context.primaryColor,
          ),
        ),
        trailing: Padding(
          padding: const EdgeInsets.only(right: 24.0),
          child: ElevatedButton.icon(
            onPressed: () => _showAddEmployeeForm(context),
            icon: const Icon(Icons.person_add_rounded, size: 18),
            label: const Text('Add New Staff'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
          ),
        ),
      ),
      body: const SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: AdminDirectoryListData(),
        ),
      ),
    );
  }
}
