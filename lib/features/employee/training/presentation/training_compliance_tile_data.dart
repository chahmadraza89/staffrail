import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/presentation/provider/training_provider.dart';
import 'package:bhmh/features/employee/training/presentation/screens/widgets/training_complication_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Training list widget — powered by real-time Firestore stream.
/// Replaces the previous hardcoded dummy data with live Firebase data.
class TrainingComplianceTileData extends ConsumerWidget {
  const TrainingComplianceTileData({super.key});

  void _onTap(BuildContext context, TrainingEntity entity) {
    context.goNamed(
      UserRouteNames.trainingDetail,
      extra: {
        'trainingId': entity.id,
        'trainingTitle': entity.title,
        'description': entity.description,
        'durationText': entity.durationText,
        'status': entity.status,
        'assignedAt': entity.assignedAt,
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trainingsAsync = ref.watch(trainingsStreamProvider);

    return trainingsAsync.when(
      // ── Loading state ──
      loading: () => const Center(child: CircularProgressIndicator()),

      // ── Error state ──
      error: (error, stack) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: Colors.red.shade300),
              const SizedBox(height: 16),
              Text(
                'Failed to load trainings',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.red.shade700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(trainingsStreamProvider),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),

      // ── Data state ──
      data: (trainings) {
        if (trainings.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.school_outlined, size: 64, color: Color(0xFFCBD5E1)),
                SizedBox(height: 16),
                Text(
                  'No trainings assigned yet',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Contact your administrator to get started',
                  style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          );
        }

        // Sort: overdue first, then pending, then inProgress, then completed
        final sortedTrainings = List<TrainingEntity>.from(trainings)
          ..sort((a, b) {
            const priority = {
              TrainingStatus.overdue: 0,
              TrainingStatus.pending: 1,
              TrainingStatus.inProgress: 2,
              TrainingStatus.notStarted: 3,
              TrainingStatus.completed: 4,
            };
            return (priority[a.status] ?? 5).compareTo(priority[b.status] ?? 5);
          });

        return ListView.builder(
          itemCount: sortedTrainings.length,
          itemBuilder: (context, index) {
            final entity = sortedTrainings[index];
            return TrainingCompilationTile(
              title: entity.title,
              dateText: entity.dueDateText,
              durationText: entity.durationText,
              status: entity.status,
              assignedAt: entity.assignedAt,
              onTap: () => _onTap(context, entity),
            );
          },
        );
      },
    );
  }
}
