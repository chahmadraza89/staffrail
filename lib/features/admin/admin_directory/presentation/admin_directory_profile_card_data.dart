import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/widgets/admin_directory_profile_card.dart';
import 'package:bhmh/features/admin/admin_home/presentation/provider/dashboard_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:gap/gap.dart';
import 'package:go_router/go_router.dart';

enum DirectoryFilter { all, active, deactivated }

final directoryFilterProvider = StateProvider<DirectoryFilter>(
  (ref) => DirectoryFilter.active,
);

class AdminDirectoryListData extends ConsumerWidget {
  const AdminDirectoryListData({super.key});

  Widget _buildFilterChips(WidgetRef ref) {
    final filter = ref.watch(directoryFilterProvider);
    final theme = Theme.of(ref.context);

    Widget buildChip(String label, DirectoryFilter value) {
      final isSelected = filter == value;
      return ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          if (selected) {
            ref.read(directoryFilterProvider.notifier).state = value;
          }
        },
        selectedColor: theme.colorScheme.primary.withValues(alpha: 0.15),
        checkmarkColor: theme.colorScheme.primary,
        labelStyle: TextStyle(
          fontSize: 13,
          color: isSelected
              ? theme.colorScheme.primary
              : theme.colorScheme.onSurface.withValues(alpha: 0.7),
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(
            color: isSelected
                ? theme.colorScheme.primary.withValues(alpha: 0.3)
                : Colors.grey.shade300,
          ),
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          buildChip('Active', DirectoryFilter.active),
          const Gap(8),
          buildChip('Deactivated', DirectoryFilter.deactivated),
          const Gap(8),
          buildChip('All', DirectoryFilter.all),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(directoryFilterProvider);
    final employeesAsync = ref.watch(adminEmployeesProgressProvider);

    void onTapDetail(String uid) {
      context.pushNamed(
        AdminRouteNames.employeeProfile,
        pathParameters: {'employeeId': uid},
      );
    }

    return employeesAsync.when(
      data: (employees) {
        final filteredEmployees = employees.where((e) {
          if (filter == DirectoryFilter.active) return e.isActive;
          if (filter == DirectoryFilter.deactivated) return !e.isActive;
          return true;
        }).toList();

        if (filteredEmployees.isEmpty) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildFilterChips(ref),
              const Gap(16),
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: Text("No employees found"),
                ),
              ),
            ],
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildFilterChips(ref),
            const Gap(16),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filteredEmployees.length,
              separatorBuilder: (context, index) => const Gap(16),
              itemBuilder: (context, index) {
                final employee = filteredEmployees[index];
                return AdminDirectoryProfileCard(
                  name: employee.name,
                  email: employee.email ?? 'N/A',
                  statusText: employee.isActive
                      ? _formatLastActivity(employee.lastLogin)
                      : 'Deactivated',
                  statusColor: employee.isActive
                      ? AppColors.primaryColor
                      : Colors.grey,
                  progress: employee.overallProgress,
                  onboardingProgress: employee.onboardingProgress,
                  trainingProgress: employee.trainingProgress,
                  phaseText: _getPhaseText(employee.overallProgress),
                  phaseColor: _getPhaseColor(employee.overallProgress),
                  avatarInitials: _getInitials(employee.name),
                  onTap: () => onTapDetail(employee.uid),
                  isActive: employee.isActive,
                );
              },
            ),
          ],
        );
      },
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: CircularProgressIndicator.adaptive(),
        ),
      ),
      error: (err, stack) => Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text("Error: $err", style: const TextStyle(color: Colors.red)),
        ),
      ),
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
