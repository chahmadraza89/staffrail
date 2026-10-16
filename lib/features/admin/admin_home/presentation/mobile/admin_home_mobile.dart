import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_home/presentation/admin_counter_data.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_action_tile.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_dashboard_directory_section.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/compliance_alert_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:go_router/go_router.dart';
import 'package:gap/gap.dart';

class AdminHomeMobile extends ConsumerWidget {
  const AdminHomeMobile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: CustomBar(
        title: Text(
          "Admin DashBoard",
          style: context.textTheme.headlineSmall?.copyWith(
            fontSize: 16,
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
            const SizedBox(width: 12),
            CircleButton(
              icon: Icons.sync_rounded,
              tooltip: "Sync & Repair Data",
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
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: context.screenWidth * 0.030,
            vertical: context.screenHeight * 0.01,
          ),
          child: SingleChildScrollView(
            child: Column(
              children: const [
                AdminCounterData(),
                Gap(16),
                ComplianceAlertSection(),
                Gap(16),
                AdminDashboardDirectorySection(),
                Gap(24),
                AdminNotificationCard(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
