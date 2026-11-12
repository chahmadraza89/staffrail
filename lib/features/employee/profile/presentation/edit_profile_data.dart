import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/profile/presentation/edit_profile_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ============================================================================
// --- SMART DATA WRAPPER (RIVERPOD CONSUMER) ---
// ============================================================================

class EditProfileData extends ConsumerWidget {
  const EditProfileData({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(currentUserProvider);

    return userAsync.when(
      data: (user) {
        if (user == null) {
          return const Center(child: Text('User not found'));
        }

        final profile = UserProfile(
          name: user.name,
          email: user.email,
          avatarUrl: user.photoUrl,
        );

        return EditProfileView(profile: profile);
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, stack) => Center(child: Text('Error loading profile: $err')),
    );
  }
}
