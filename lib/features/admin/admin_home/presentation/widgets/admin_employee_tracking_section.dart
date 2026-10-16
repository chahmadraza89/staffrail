import 'package:bhmh/features/admin/admin_home/presentation/provider/dashboard_provider.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_employee_progress_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';

class AdminEmployeeTrackingSection extends ConsumerWidget {
  const AdminEmployeeTrackingSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final employeesAsync = ref.watch(adminEmployeesProgressProvider);
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Team Progress Tracking",
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
              ),
              if (employeesAsync.hasValue && employeesAsync.value!.isNotEmpty)
                Text(
                  "${employeesAsync.value!.length} Employees",
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.primaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
            ],
          ),
        ),
        const Gap(16),
        employeesAsync.when(
          data: (employees) {
            if (employees.isEmpty) {
              return _EmptyState();
            }
            return ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: employees.length,
              itemBuilder: (context, index) {
                final employee = employees[index];
                return AdminEmployeeProgressTile(
                  progress: employee,
                  onTap: () {
                    // TODO: Navigate to employee detail
                  },
                );
              },
            );
          },
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.all(32.0),
              child: CircularProgressIndicator.adaptive(),
            ),
          ),
          error: (err, stack) => _ErrorState(message: err.toString()),
        ),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: theme.cardColor.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.05)),
      ),
      child: Column(
        children: [
          Icon(
            Icons.people_outline,
            size: 48,
            color: theme.hintColor.withValues(alpha: 0.3),
          ),
          const Gap(16),
          Text(
            "No employees found",
            style: theme.textTheme.titleSmall?.copyWith(color: theme.hintColor),
          ),
          const Gap(4),
          Text(
            "New employees will appear here once registered.",
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.hintColor),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  const _ErrorState({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        children: [
          const Icon(Icons.error_outline, color: Colors.red),
          const Gap(8),
          Text(
            "Failed to load tracking data",
            style: TextStyle(color: Colors.red[700]),
          ),
        ],
      ),
    );
  }
}
