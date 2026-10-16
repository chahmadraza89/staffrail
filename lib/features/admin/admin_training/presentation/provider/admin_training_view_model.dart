import 'package:bhmh/features/admin/admin_training/data/model/admin_training_model.dart';
import 'package:bhmh/features/admin/admin_training/presentation/provider/admin_training_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// =============================================================================
// ADMIN TRAINING VIEW MODEL
// =============================================================================
// Handles the business logic and UI loading states for creating and 
// managing training templates from the admin dashboard.
// =============================================================================

class AdminTrainingViewModel extends AsyncNotifier<void> {
  @override
  Future<void> build() async {
    // Initial state is successful and empty
  }

  /// Creates a new training template and handles the loading/error states.
  Future<void> createTraining(AdminTrainingModel newTraining) async {
    state = const AsyncLoading();

    state = await AsyncValue.guard(() async {
      final service = ref.read(adminTrainingServiceProvider);
      await service.createTrainingTemplate(newTraining);
    });
  }

  /// Assigns a training module to selected employees.
  Future<void> assignTraining({
    required String templateId,
    required List<String> userIds,
    required DateTime? deadline,
    required String instructions,
    required String adminId,
  }) async {
    state = const AsyncLoading();

    state = await AsyncValue.guard(() async {
      final service = ref.read(adminTrainingServiceProvider);
      await service.assignTraining(
        templateId: templateId,
        userIds: userIds,
        deadline: deadline,
        instructions: instructions,
        adminId: adminId,
      );
    });
  }
}

/// Provider for the AdminTrainingViewModel
final adminTrainingViewModelProvider =
    AsyncNotifierProvider<AdminTrainingViewModel, void>(
  AdminTrainingViewModel.new,
);
