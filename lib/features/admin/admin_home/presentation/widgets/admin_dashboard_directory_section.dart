import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/widgets/admin_directory_profile_card.dart';
import 'package:bhmh/features/admin/admin_home/data/model/admin_dashboard_models.dart';
import 'package:bhmh/features/admin/admin_home/presentation/provider/dashboard_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gap/gap.dart';
import 'package:go_router/go_router.dart';

class AdminDashboardDirectorySection extends ConsumerWidget {
  const AdminDashboardDirectorySection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final employeesAsync = ref.watch(adminEmployeesProgressProvider);
    final theme = Theme.of(context);

    void onTapDetail(String uid) {
      context.pushNamed(
        AdminRouteNames.employeeProfile,
        pathParameters: {'employeeId': uid},
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Latest Activity",
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
              ),
              if (employeesAsync.hasValue && employeesAsync.value!.isNotEmpty)
                GestureDetector(
                  onTap: () {
                    context.pushNamed(AdminRouteNames.directory);
                  },
                  child: Text(
                    "View All",
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AppColors.primaryColor, // Modern Indigo
                      fontWeight: FontWeight.bold,
                    ),
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

            // 🚀 Logic: Get Top 3 Latest Active
            final latestEmployees = List<AdminEmployeeProgress>.from(employees)
              ..sort((a, b) => b.lastLogin.compareTo(a.lastLogin));

            final top3 = latestEmployees.take(3).toList();

            return Column(
              children: top3.map((employee) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: AdminDirectoryProfileCard(
                    name: employee.name,
                    email: employee.email ?? 'N/A',
                    statusText: _formatLastActivity(employee.lastLogin),
                    statusColor: employee.isActive
                        ? const Color(0xFF10B981)
                        : Colors.grey,
                    progress: employee.overallProgress,
                    onboardingProgress: employee.onboardingProgress,
                    trainingProgress: employee.trainingProgress,
                    phaseText: _getPhaseText(employee.overallProgress),
                    phaseColor: _getPhaseColor(employee.overallProgress),
                    avatarInitials: _getInitials(employee.name),
                    onTap: () => onTapDetail(employee.uid),
                  ),
                );
              }).toList(),
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

  String _formatLastActivity(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inMinutes < 1) return 'Active just now';
    if (difference.inMinutes < 60) return 'Active ${difference.inMinutes}m ago';
    if (difference.inHours < 24) return 'Active ${difference.inHours}h ago';
    if (difference.inDays < 7) return 'Active ${difference.inDays}d ago';
    return 'Active on ${time.day}/${time.month}';
  }

  String _getPhaseText(double progress) {
    if (progress < 0.33) return 'Onboarding Phase';
    if (progress < 0.66) return 'Training Phase';
    if (progress < 1.0) return 'Final Review';
    return 'Compliant';
  }

  Color _getPhaseColor(double progress) {
    if (progress < 0.33) return Colors.orange;
    if (progress < 0.66) return Colors.blue;
    if (progress < 1.0) return Colors.purple;
    return const Color(0xFF10B981); // Emerald
  }

  String _getInitials(String name) {
    if (name.isEmpty) return "??";
    final parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
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
            Icons.history,
            size: 48,
            color: theme.hintColor.withValues(alpha: 0.3),
          ),
          const Gap(16),
          Text(
            "No recent activity",
            style: theme.textTheme.titleSmall?.copyWith(color: theme.hintColor),
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
