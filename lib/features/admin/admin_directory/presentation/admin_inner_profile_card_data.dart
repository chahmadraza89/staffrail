// ============================================================================
// --- PROFILE HEADER & PROGRESS OVERVIEW (AS PROVIDED) ---
// ============================================================================

import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/provider/admin_directory_actions.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/widgets/admin_directory_helpers.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/admin_employee_form.dart';
import 'package:bhmh/features/admin/admin_home/data/model/admin_dashboard_models.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfileHeader extends ConsumerWidget {
  final AdminEmployeeProgress employee;
  const ProfileHeader({super.key, required this.employee});

  void _showEditForm(BuildContext context) {
    // Map AdminEmployeeProgress to a partial UserEntity for the form
    final partialUser = UserEntity(
      uid: employee.uid,
      name: employee.name,
      email: employee.email ?? '',
      createdAt: DateTime.now(),
      lastLogin: employee.lastLogin,
    );

    final isMobile = context.screenWidth < 600;
    if (isMobile) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        builder: (context) =>
            AdminEmployeeForm(employee: partialUser, isMobile: true),
      );
    } else {
      showDialog(
        context: context,
        builder: (context) => Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          child: SizedBox(
            width: 500,
            child: AdminEmployeeForm(employee: partialUser, isMobile: false),
          ),
        ),
      );
    }
  }

  Future<void> _handleDeactivate(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Deactivate Account?'),
        content: Text(
          'Are you sure you want to deactivate ${employee.name}? They will no longer be able to log in.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Deactivate'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await ref
            .read(adminDirectoryActionsProvider.notifier)
            .deactivateEmployee(employee.uid);
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Employee deactivated')));
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool isActive = employee.isActive;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200, width: 1.5),
      ),
      child: Row(
        children: [
          // Squircle Avatar
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFF109B85).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Center(
              child: Text(
                AdminDirectoryHelpers.getInitials(employee.name),
                style: const TextStyle(
                  color: Color(0xFF109B85),
                  fontWeight: FontWeight.bold,
                  fontSize: 24,
                ),
              ),
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        employee.name,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.5,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    PopupMenuButton<String>(
                      icon: const Icon(
                        Icons.more_vert_rounded,
                        color: Color(0xFF64748B),
                      ),
                      onSelected: (val) {
                        if (val == 'edit') _showEditForm(context);
                        if (val == 'deactivate') {
                          _handleDeactivate(context, ref);
                        }
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit_outlined, size: 18),
                              SizedBox(width: 12),
                              Text('Edit Profile'),
                            ],
                          ),
                        ),
                        if (isActive)
                          const PopupMenuItem(
                            value: 'deactivate',
                            child: Row(
                              children: [
                                Icon(
                                  Icons.person_off_outlined,
                                  size: 18,
                                  color: Colors.red,
                                ),
                                SizedBox(width: 12),
                                Text(
                                  'Deactivate',
                                  style: TextStyle(color: Colors.red),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  employee.email ?? 'No email provided',
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 8),
                // Modern Status Pill
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: isActive
                        ? const Color(0xFF10B981).withValues(alpha: 0.1)
                        : const Color(0xFFEF4444).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isActive ? 'Active' : 'Inactive',
                    style: TextStyle(
                      color: isActive
                          ? const Color(0xFF10B981)
                          : const Color(0xFFEF4444),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
