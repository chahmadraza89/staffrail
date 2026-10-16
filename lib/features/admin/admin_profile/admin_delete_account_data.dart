import 'package:bhmh/core/models/delete_account_context.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/profile/presentation/widget/user_delete_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ============================================================================
// --- ADMIN DELETE ACCOUNT DATA WRAPPER (PRODUCTION) ---
// Wires the premium UserDeleteTile to the real AuthViewModel.deleteWorkspace()
// Uses cascading soft-delete: Admin + all linked employees → isActive: false
// ============================================================================

class AdminDeleteAccountData extends ConsumerWidget {
  const AdminDeleteAccountData({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 🔹 Fetch real admin details from the reactive user stream
    final user = ref.watch(currentUserProvider).value;
    final accountName = user?.name ?? 'Your Workspace';
    final adminEmail = user?.email ?? '';

    // Dynamic Context populated with live data
    final deleteContext = DeleteAccountContext(
      accountName: accountName,
      adminEmail: adminEmail,
      confirmationWord: 'DELETE',
      consequences: [
        'All employee records and clearance histories will be deactivated.',
        'Active onboarding modules and tasks will be immediately suspended.',
        'Your workspace can be recovered within 30 days by contacting support.',
      ],
    );

    return UserDeleteTile(
      deleteContext: deleteContext,
      title: 'Danger Zone',
      subtitle: 'Dissolve Workspace',
      onDeleteConfirmed: (String password) async {
        // 🔹 Execute the cascading workspace soft-delete
        final success = await ref
            .read(authViewModelProvider.notifier)
            .deleteWorkspace(password: password);

        if (context.mounted) {
          if (success) {
            // Router will auto-redirect to login because isActive == false
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Workspace scheduled for deletion.'),
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
