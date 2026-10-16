import 'package:bhmh/features/admin/admin_profile/admin_profile_view.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/profile/presentation/widget/profile_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AdminProfileData extends ConsumerWidget {
  const AdminProfileData({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(currentUserProvider);

    return userAsync.when(
      data: (user) {
        if (user == null) {
          return const Center(child: Text("No user data found"));
        }
        return AdminProfileView(
          user: user,
          onLogout: () {
            showDialog(
              context: context,
              builder: (context) {
                return ModernLogoutDialog(
                  onConfirmLogout: () {
                    ref.read(authViewModelProvider.notifier).signOut();
                  },
                );
              },
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, stack) => Center(child: Text("Error: $e")),
    );
  }
}
