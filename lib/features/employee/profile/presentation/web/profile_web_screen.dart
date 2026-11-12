import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/features/employee/profile/presentation/profile_card_view.dart';
import 'package:bhmh/features/employee/profile/presentation/profile_header_card.dart';
import 'package:bhmh/features/employee/profile/presentation/widget/notification_settings_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfileWebScreen extends ConsumerWidget {
  const ProfileWebScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.symmetric(
            vertical: context.screenHeight * 0.045,
            horizontal: context.screenWidth * 0.02,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const ProfileHeaderCard(),
              const SizedBox(height: 32),

              Padding(
                padding: const EdgeInsets.only(left: 4.0, bottom: 12.0),
                child: Text(
                  "Personal Information",
                  style: context.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF64748B),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const ProfileCardView(),
                const SizedBox(height: 24),
                const NotificationSettingsCard(),

              const SizedBox(height: 40),

              // Modern Danger Button for Logout
              // Center(
              //   child: SizedBox(
              //     width: 340, // Reasonable maximum width for web logout button
              //     child: TextButton.icon(
              //       onPressed: () {
              //         showDialog(
              //           context: context,
              //           builder: (context) {
              //             return ModernLogoutDialog(
              //               onConfirmLogout: () {
              //                 ref.read(authViewModelProvider.notifier).signOut();
              //               },
              //             );
              //           },
              //         );
              //       },
              //       icon: const Icon(Icons.logout_rounded, size: 20),
              //       label: const Text(
              //         "Log Out",
              //         style: TextStyle(
              //           fontSize: 16,
              //           fontWeight: FontWeight.w700,
              //         ),
              //       ),
              //       style: TextButton.styleFrom(
              //         foregroundColor: Colors.red.shade700,
              //         backgroundColor: Colors.red.shade50,
              //         padding: const EdgeInsets.symmetric(vertical: 16),
              //         shape: RoundedRectangleBorder(
              //           borderRadius: BorderRadius.circular(16),
              //         ),
              //       ),
              //     ),
              //   ),
              // ),
              //const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

