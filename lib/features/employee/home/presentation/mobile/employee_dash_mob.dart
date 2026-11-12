import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/home/presentation/action_item_view.dart';
import 'package:bhmh/features/employee/home/presentation/widget/messaging_section.dart';
import 'package:bhmh/features/employee/home/presentation/widget/reminders_section.dart'; // Restore import
import 'package:bhmh/features/employee/home/presentation/quick_action_card_view.dart';
import 'package:bhmh/features/employee/home/presentation/widget/employee_home_progress_tracker.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class EmployeeDashMob extends ConsumerWidget {
  const EmployeeDashMob({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(currentUserProvider);

    return userAsync.when(
      data: (user) {
        final userName = user?.name ?? 'Employee';
        return Scaffold(
          appBar: CustomBar(
            title: Text(
              "Home Dashboard",
              style: context.textTheme.headlineSmall?.copyWith(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: context.primaryColor,
              ),
            ),
            subtitle: Text(
              "Welcome back, ${userName.toUpperCase()} ",
              style: context.textTheme.bodyMedium?.copyWith(
                color: context.textSecondary,
              ),
            ),
            trailing: InkWell(
              onTap: () => context.go(UserRoutes.notifications),
              child: CircleAvatar(
                backgroundColor: AppColors.primaryColor.withValues(alpha: 0.85),
                child: const Icon(Icons.notifications),
              ),
            ),
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Real-time onboarding progress from Firestore
                    _buildProgressTracker(ref),
                    const SizedBox(height: 10),

                    // 📱 STACKED SECTIONS (Premium Mobile UX)
                    const RemindersSection(),
                    const SizedBox(height: 16),
                    const MessagingSection(),
                    const SizedBox(height: 16),
                    const ActionItemView(),

                    const SizedBox(height: 24),
                    Text(
                      "Quick Action",
                      style: context.titleMedium.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),

                    const SizedBox(height: 10),
                    HomeQuickActionCards(),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
        );
      },
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, st) => Scaffold(body: Center(child: Text('Error: $e'))),
    );
  }

  Widget _buildProgressTracker(WidgetRef ref) {
    final completion = ref.watch(onboardingCompletionProvider);

    return EmployeeHomeProgressTracker(
      totalSteps: completion.total,
      completedSteps: completion.completed,
      title: 'Onboarding Progress',
    );
  }
}

