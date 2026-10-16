import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/features/employee/home/presentation/provider/dashboard_provider.dart';
import 'package:bhmh/features/employee/home/presentation/widget/home_quick_action_cards.dart';
import 'package:bhmh/features/employee/home/presentation/widget/action_card_data.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Quick Action Cards grid — powered by real-time Firestore completion stats.
/// Replaces the previous hardcoded "5/8 Tasks", "1/4 Assigned" etc.
class HomeQuickActionCards extends ConsumerWidget {
  const HomeQuickActionCards({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(dashboardQuickActionStatsProvider);
    final bool isMobile = MediaQuery.of(context).size.width < 600;

    return statsAsync.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      ),
      error: (_, _) => const SizedBox.shrink(),
      data: (stats) {
        final cards = [
          ActionCardData(
            title: 'Onboarding',
            subtitle: stats.onboardingSubtitle,
            icon: Icons.assignment_outlined,
            baseColor: const Color(0xFF109B85),
            progress: stats.onboardingProgress,
            onTap: () => context.go(UserRoutes.guide),
          ),
          ActionCardData(
            title: 'Trainings',
            subtitle: stats.trainingSubtitle,
            icon: Icons.school_outlined,
            baseColor: const Color(0xFF3B82F6),
            progress: stats.trainingProgress,
            onTap: () => context.go(UserRoutes.trainings),
          ),
          ActionCardData(
            title: 'Clearance',
            subtitle: stats.clearanceSubtitle,
            icon: Icons.verified_user_outlined,
            baseColor: const Color(0xFF109B85),
            progress: stats.clearanceTotal > 0 ? stats.clearanceProgress : 0.0,
            onTap: () => context.go(UserRoutes.clearance),
          ),
          ActionCardData(
            title: 'Profile',
            subtitle: 'View details',
            icon: Icons.info_outline_rounded,
            baseColor: const Color(0xFF94A3B8),
            onTap: () => context.go(UserRoutes.profile),
          ),
        ];

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: isMobile ? 2 : 4,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            mainAxisExtent: isMobile ? 200 : 140,
          ),
          itemCount: cards.length,
          itemBuilder: (context, index) {
            return ModernActionCard(data: cards[index], isMobile: isMobile);
          },
        );
      },
    );
  }
}
