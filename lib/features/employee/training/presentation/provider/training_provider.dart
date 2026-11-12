import 'dart:developer';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/training/data/data_source/training_service.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/presentation/provider/training_view_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// =============================================================================
// TRAINING PROVIDERS (Dependency Injection)
// =============================================================================
// Follows the same DI pattern as task_provider.dart and auth_provider.dart.
// =============================================================================

// 🔹 1. Training Service Injection (IoC)
final trainingServiceProvider = Provider<TrainingService>((ref) {
  final store = ref.watch(localDataStoreProvider);
  return TrainingService(firestore: store);
});

// 🔹 2. Real-Time Trainings Stream
/// Streams training items for the currently authenticated user.
/// Automatically re-fetches when auth state changes.
final trainingsStreamProvider =
    StreamProvider.autoDispose<List<TrainingEntity>>((ref) {
      final authState = ref.watch(authStateProvider);

      return authState.when(
        data: (firebaseUser) {
          if (firebaseUser == null) {
            return Stream.value([]);
          }
          log(
            '🔄 [PROVIDER] Switching training stream for: ${firebaseUser.uid}',
          );
          final service = ref.watch(trainingServiceProvider);
          return service.streamTrainings(firebaseUser.uid);
        },
        loading: () => const Stream.empty(),
        error: (e, stack) => Stream.error(e, stack),
      );
    });

// 🔹 3. Completion Statistics
/// Computed provider for training completion metrics.
final trainingCompletionProvider =
    Provider.autoDispose<({int total, int completed})>((ref) {
      final trainingsAsync = ref.watch(trainingsStreamProvider);

      return trainingsAsync.when(
        data: (trainings) {
          final completed = trainings
              .where((t) => t.status == TrainingStatus.completed)
              .length;
          return (total: trainings.length, completed: completed);
        },
        loading: () => (total: 0, completed: 0),
        error: (_, _) => (total: 0, completed: 0),
      );
    });

// 🔹 4. ViewModel Provider
final trainingViewModelProvider =
    NotifierProvider<TrainingViewModel, AsyncValue<void>>(
      TrainingViewModel.new,
    );
