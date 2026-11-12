import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/features/employee/home/presentation/widget/action_item_tile.dart';
import 'package:bhmh/features/employee/home/presentation/widget/dashboard_action_item.dart';
import 'package:bhmh/features/employee/home/presentation/provider/dashboard_provider.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Action Items — powered by real-time onboarding + training + clearance streams.
/// Refined with premium "Sparkle Header" and Card container.
class ActionItemView extends ConsumerWidget {
  const ActionItemView({super.key});

  /// Handles navigation to the appropriate detail page based on action item type.
  void _navigateToActionItem(BuildContext context, DashboardActionItem item) {
    switch (item.module) {
      case 'Onboarding':
        final task = item.entityData as CompilationSubTask;
        context.goNamed(
          UserRouteNames.taskDetail,
          pathParameters: {'taskId': item.entityId},
          extra: {
            'taskTitle': task.title,
            'taskSubtitle': task.subtitle,
            'currentStatus': task.status,
            'icon': item.icon,
          },
        );
        break;

      case 'Trainings':
        final training = item.entityData as TrainingEntity;
        context.go(
          UserRoutes.trainingDetail,
          extra: {
            'trainingId': training.id,
            'trainingTitle': training.title,
            'description': training.description,
            'durationText': training.durationText,
            'status': training.status,
          },
        );
        break;

      case 'Clearance':
        context.goNamed(
          UserRouteNames.clearanceDetail,
          pathParameters: {'clearanceId': item.entityId},
        );
        break;

      default:
        // Fallback: navigate to dashboard
        context.go(UserRoutes.dashboard);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(dashboardActionItemsProvider);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200, width: 1.5),
        // boxShadow: [
        //   BoxShadow(
        //     color: Colors.black.withValues(alpha: 0.02),
        //     blurRadius: 16,
        //     offset: const Offset(0, 4),
        //   ),
        // ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Sparkle Header (✨ matched to screenshot)
          Row(
            children: [
              const Icon(
                Icons.auto_awesome,
                color: Color(0xFF109B85),
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Action Required',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // 2. Data Content
          items.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
            error: (error, stack) => _buildErrorState(ref, error),
            data: (actionItems) {
              if (actionItems.isEmpty) {
                return _buildEmptyState();
              }

              return Column(
                children: actionItems
                    .take(5) // Show max 5 action items
                    .map(
                      (item) => ActionItemTile(
                        title: item.title,
                        subtitle: item.module,
                        icon: item.icon,
                        color: item.color,
                        onTap: () => _navigateToActionItem(context, item),
                      ),
                    )
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          children: [
            Icon(
              Icons.check_circle_outline_rounded,
              size: 48,
              color: Colors.green.shade300,
            ),
            const SizedBox(height: 8),
            Text(
              'All caught up!',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.green.shade700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'No pending items require your attention',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(WidgetRef ref, Object error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 32, color: Colors.red.shade300),
            const SizedBox(height: 8),
            Text(
              'Unable to load action items',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.red.shade700,
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () => ref.invalidate(dashboardActionItemsProvider),
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
