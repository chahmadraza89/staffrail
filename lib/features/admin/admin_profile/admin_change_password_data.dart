import 'package:bhmh/features/admin/admin_profile/admin_passoword_tile_view.dart';
import 'package:bhmh/features/admin/admin_profile/models/admin_profile_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ============================================================================
// --- SMART DATA WRAPPER (RIVERPOD CONSUMER) ---
// ============================================================================

class AdminChangePasswordData extends ConsumerWidget {
  final String? fallbackRoute;
  const AdminChangePasswordData({super.key, this.fallbackRoute});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Using the refactored ChangePasswordView
        ChangePasswordView(
          fallbackRoute: fallbackRoute,
          requirements: const PasswordRequirements(
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireSpecialChar: true,
            requireNumber: true,
          ),
        ),
      ],
    );
  }
}
