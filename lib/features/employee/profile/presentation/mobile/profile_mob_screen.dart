import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/features/employee/profile/presentation/profile_card_view.dart';
import 'package:bhmh/features/employee/profile/presentation/profile_header_card.dart';
import 'package:bhmh/features/employee/profile/presentation/widget/notification_settings_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfileMobScreen extends ConsumerWidget {
  const ProfileMobScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: context.screenWidth * 0.04,
              vertical: context.screenHeight * 0.02,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 10),
                const ProfileHeaderCard(),
                const SizedBox(height: 16),

                // Verified Account Badge
                // Row(
                //   children: [
                //     // Container(
                //     //   padding: const EdgeInsets.all(4),
                //     //   decoration: const BoxDecoration(
                //     //     color: Color(0xFF22C55E),
                //     //     shape: BoxShape.circle,
                //     //   ),
                //     //   child: const Icon(
                //     //     Icons.check,
                //     //     size: 12,
                //     //     color: Colors.white,
                //     //   ),
                //     // ),
                //     // const SizedBox(width: 12),
                //     // const Text(
                //     //   "Verified Account",
                //     //   style: TextStyle(
                //     //     color: Color(0xFF15803D),
                //     //     fontWeight: FontWeight.w600,
                //     //     fontSize: 14,
                //     //   ),
                //     // ),
                //   ],
                // ),

                //const SizedBox(height: 24),

                // Info Section
                // const _InfoRow(
                //   label: "Phone number",
                //   value: "+234 800 000 0000",
                // ),
                // const SizedBox(height: 12),
                // Consumer(
                //   builder: (context, ref, _) {
                //     final user = ref.watch(currentUserProvider).value;
                //     return _InfoRow(
                //       label: "Email",
                //       value: user?.email ?? "---",
                //     );
                //   },
                // ),
                const SizedBox(height: 32),

                const ProfileCardView(),
                const SizedBox(height: 24),
                const NotificationSettingsCard(),

                const SizedBox(height: 24),

                // Delete Account Button
                // SizedBox(
                //   width: double.infinity,
                //   child: TextButton(
                //     onPressed: () {},
                //     style: TextButton.styleFrom(
                //       foregroundColor: const Color(0xFFEF4444),
                //       backgroundColor: const Color(0xFFFEF2F2),
                //       padding: const EdgeInsets.symmetric(vertical: 16),
                //       shape: RoundedRectangleBorder(
                //         borderRadius: BorderRadius.circular(12),
                //       ),
                //     ),
                //     child: const Text(
                //       "Delete Account",
                //       style: TextStyle(
                //         fontSize: 16,
                //         fontWeight: FontWeight.w700,
                //       ),
                //     ),
                //   ),
                // ),
                // const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// class _InfoRow extends StatelessWidget {
//   const _InfoRow({required this.label, required this.value});
//   final String label;
//   final String value;

//   @override
//   Widget build(BuildContext context) {
//     return Row(
//       mainAxisAlignment: MainAxisAlignment.spaceBetween,
//       children: [
//         Text(
//           label,
//           style: const TextStyle(
//             color: Color(0xFF64748B),
//             fontSize: 14,
//             fontWeight: FontWeight.w500,
//           ),
//         ),
//         Text(
//           value,
//           style: const TextStyle(
//             color: Color(0xFF0F172A),
//             fontSize: 14,
//             fontWeight: FontWeight.w700,
//           ),
//         ),
//       ],
//     );
//   }
// }

