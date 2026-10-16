import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_home/presentation/admin_counter_data.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_action_tile.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/compliance_alert_section.dart';
import 'package:flutter/material.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:go_router/go_router.dart';

class AdminHomeWeb extends ConsumerWidget {
  const AdminHomeWeb({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: CustomBar(
        title: Text(
          "Admin DashBoard",
          style: context.textTheme.headlineSmall?.copyWith(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: context.primaryColor,
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            InkWell(
              onTap: () => context.push(AdminRoutes.notifications),
              child: CircleAvatar(
                backgroundColor: context.primaryColor.withValues(alpha: 0.85),
                child: const Icon(Icons.notifications),
              ),
            ),
            const SizedBox(width: 8),
            // CircleButton(
            //   icon: Icons.notification_add_rounded,
            //   tooltip: "Send Test Notification",
            //   onTap: () async {
            //     final scaffold = ScaffoldMessenger.of(context);
            //     final success = await ref
            //         .read(adminMessageViewModelProvider.notifier)
            //         .publishMessage(
            //           title: "ðŸ”” Test Notification",
            //           content: "Your notification system is working perfectly!",
            //           isPushEnabled: true,
            //           recipientId:
            //               ref.read(currentUserProvider).value?.uid ??
            //               'broadcast',
            //         );
            //     if (success) {
            //       scaffold.showSnackBar(
            //         const SnackBar(content: Text("Test Notification sent!")),
            //       );
            //     }
            //   },
            // ),
            // const SizedBox(width: 8),
            InkWell(
              onTap: () async {
                final count = await ref
                    .read(authViewModelProvider.notifier)
                    .syncAndRepairData();
                if (context.mounted) {
                  if (count >= 0) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("Successfully repaired $count records."),
                        backgroundColor: context.primaryColor,
                      ),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("Failed to repair data. Check logs."),
                        backgroundColor: Colors.redAccent,
                      ),
                    );
                  }
                }
              },
              child: CircleAvatar(
                backgroundColor: context.primaryColor.withValues(alpha: 0.85),
                child: const Icon(Icons.sync_rounded),
              ),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            vertical: context.screenHeight * 0.02,
            horizontal: context.screenWidth * 0.01,
          ),
          child: SingleChildScrollView(
            child: Column(
              children: const [
                AdminCounterData(),
                SizedBox(height: 12),
                ComplianceAlertSection(),
                SizedBox(height: 12),
                AdminDashboardActionsSection(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
