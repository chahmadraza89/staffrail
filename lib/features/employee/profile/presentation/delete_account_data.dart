import 'package:bhmh/core/models/delete_account_context.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/profile/presentation/widget/user_delete_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ============================================================================
// --- EMPLOYEE DELETE ACCOUNT DATA WRAPPER (PRODUCTION) ---
// Wires the premium UserDeleteTile to the real AuthViewModel.deleteAccount()
// Uses soft-delete: Employee profile → isActive: false (30-day recovery)
// ============================================================================

class UserDeleteAccountData extends ConsumerWidget {
  const UserDeleteAccountData({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 🔹 Fetch real user details from the reactive user stream
    final user = ref.watch(currentUserProvider).value;
    final accountName = user?.name ?? 'Your Account';
    final adminEmail = user?.email ?? '';

    // Dynamic Context populated with live data
    final deleteContext = DeleteAccountContext(
      accountName: accountName,
      adminEmail: adminEmail,
      confirmationWord: 'DELETE',
      consequences: [
        'Your profile and personal data will be permanently deactivated.',
        'Access to all StaffRail modules and assignments will be revoked.',
        'Your account can be recovered within 30 days by contacting your admin.',
      ],
    );

    return UserDeleteTile(
      deleteContext: deleteContext,
      title: 'Personal Account',
      subtitle: 'Delete My Account',
      onDeleteConfirmed: (String password) async {
        // 🔹 Execute the employee account soft-delete
        final success = await ref
            .read(authViewModelProvider.notifier)
            .deleteAccount(password: password);

        if (context.mounted) {
          if (success) {
            // Router will auto-redirect to login because isActive == false
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Account scheduled for deletion.'),
                backgroundColor: Color(0xFF16A34A),
              ),
            );
          } else {
            // Extract human-readable error message
            final authState = ref.read(authViewModelProvider);
            String errorMsg = 'Deletion failed. Please check your password.';
            if (authState.hasError) {
              final error = authState.error;
              if (error.toString().contains('wrong-password')) {
                errorMsg = 'Incorrect password. Please try again.';
              } else if (error.toString().contains('too-many-requests')) {
                errorMsg = 'Too many attempts. Please try again later.';
              } else if (error.toString().contains('network-request-failed')) {
                errorMsg = 'Network error. Please check your connection.';
              }
            }
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(errorMsg),
                backgroundColor: const Color(0xFFEF4444),
              ),
            );
          }
        }
      },
    );
  }
}
