import 'package:bhmh/features/admin/admin_home/data/model/admin_dashboard_models.dart';
import 'package:bhmh/features/admin/admin_home/presentation/provider/dashboard_provider.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/clearance/presentation/provider/clearance_provider.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/presentation/provider/training_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Provides detailed high-level progress for a specific employee.
/// Filters the list from adminEmployeesProgressProvider.
final employeeDetailProvider = StreamProvider.autoDispose
    .family<AdminEmployeeProgress?, String>((ref, employeeId) {
      final allProgressAsync = ref.watch(adminEmployeesProgressProvider);

      return allProgressAsync.when(
        data: (list) =>
            Stream.value(list.where((e) => e.uid == employeeId).firstOrNull),
        loading: () => const Stream.empty(),
        error: (e, stack) => Stream.error(e, stack),
      );
    });

/// Provides the full list of onboarding tasks for a specific employee.
/// Used by the Admin to review individual progress.
final employeeTasksProvider = StreamProvider.autoDispose
    .family<List<CompilationSubTask>, String>((ref, employeeId) {
      final service = ref.watch(onboardingServiceProvider);
      return service.streamOnboardingTasks(employeeId);
    });

/// Provides the full list of trainings for a specific employee.
final employeeTrainingsProvider = StreamProvider.autoDispose
    .family<List<TrainingEntity>, String>((ref, employeeId) {
      final service = ref.watch(trainingServiceProvider);
      return service.streamTrainings(employeeId);
    });

/// Provides the full list of clearance items for a specific employee.
final employeeClearanceProvider = StreamProvider.autoDispose
    .family<List<ClearanceEntity>, String>((ref, employeeId) {
      final service = ref.watch(clearanceServiceProvider);
      return service.streamClearanceItems(employeeId);
    });
