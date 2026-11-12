import 'package:bhmh/features/admin/admin_home/presentation/provider/dashboard_provider.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_counter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AdminCounterData extends ConsumerWidget {
  const AdminCounterData({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(adminDashboardStatsProvider);

    return statsAsync.when(
      data: (stats) {
        final (onboarding, completed, active) = stats;
        return AdminCounter(
          employee_OnBoarding: onboarding,
          completedTasks: completed,
          activeEmployee: active,
        );
      },
      loading: () => const AdminCounter(
        employee_OnBoarding: 0,
        completedTasks: 0,
        activeEmployee: 0,
      ),
      error: (e, stack) {
        debugPrint("❌ [DASHBOARD-UI] Stream Error: $e");
        return const AdminCounter(
          employee_OnBoarding: 0,
          completedTasks: 0,
          activeEmployee: 0,
        );
      },
    );
  }
}
