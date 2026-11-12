import 'dart:developer';
import 'package:bhmh/core/config/firebase_storage_collecation_constant.dart';
import 'package:bhmh/core/config/onboarding_constants.dart';
import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/clearance/presentation/provider/clearance_provider.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/employee/training/presentation/provider/training_provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AdminDirectoryActions extends Notifier<void> {
  @override
  void build() {}

  Future<String?> registerStaff({
    required String name,
    required String email,
    UserRole role = UserRole.employee,
  }) async {
    try {
      log('🔄 [ADMIN-ACTIONS] Registering staff locally: $email');

      final functions = ref.read(localFunctionsProvider);

      final LocalHttpsCallable callable = functions.httpsCallable(
        'registerStaff',
        options: const LocalHttpsCallableOptions(timeout: Duration(seconds: 45)),
      );

      final LocalHttpsCallableResult result = await callable.call(<String, dynamic>{
        'email': email,
        'name': name,
        'role': role.name,
      });

      // Handle the dynamic return type safely for both Mobile and Web
      final Map<String, dynamic> data = Map<String, dynamic>.from(
        result.data as Map,
      );
      final resetLink = data['resetLink'] as String?;
      final newUid = data['uid'] as String;

      log('? [ADMIN-ACTIONS] Staff registered. Reset Link generated.');

      // Seed remaining detailed data client-side for immediate UI consistency
      await _seedRemainingData(newUid, name);

      return resetLink;
    } catch (e, stack) {
      log(
        '? [ADMIN-ACTIONS] Cloud Function registration failed: $e',
        stackTrace: stack,
      );
      rethrow;
    }
  }

  /// Private helper to seed the full set of tasks defined in OnboardingConstants.
  Future<void> _seedRemainingData(String uid, String name) async {
    try {
      final onboardingService = ref.read(onboardingServiceProvider);
      final trainingService = ref.read(trainingServiceProvider);
      final clearanceService = ref.read(clearanceServiceProvider);
      final adminUser = ref.read(currentUserProvider).value;

      if (adminUser == null) return;

      // Seed onboarding tasks (using .set so it merges with Cloud Function defaults)
      final tasks = OnboardingConstants.getDefaultTasks(
        employeeId: uid,
        employeeName: name,
        adminId: adminUser.uid,
      );
      await onboardingService.seedOnboardingTasks(uid: uid, tasks: tasks);

      // Seed Trainings
      final trainings = OnboardingConstants.getDefaultTrainings();
      await trainingService.seedTrainings(uid: uid, trainings: trainings);

      // Seed Clearances
      final clearances = OnboardingConstants.getDefaultClearances(employeeId: uid, employeeName: name, adminId: adminUser.uid);
      await clearanceService.seedClearanceItems(uid: uid, items: clearances);
    } catch (e) {
      log('?? [ADMIN-ACTIONS] Client-side seeding warning: $e');
    }
  }

  /// Updates an existing employee's basic profile.
  Future<void> updateEmployee({
    required String uid,
    required String name,
    required String email,
  }) async {
    try {
      log('?? [ADMIN-ACTIONS] Updating employee: $uid');

      final userService = ref.read(userServiceProvider);
      final currentData = await userService.getUserData(uid);

      if (currentData == null) throw Exception('Employee not found');

      final updatedUser = currentData.copyWith(name: name, email: email);

      await userService.saveUserData(updatedUser);
      log('? [ADMIN-ACTIONS] Employee profile updated.');
    } catch (e, stack) {
      log('? [ADMIN-ACTIONS] Failed to update employee: $e', stackTrace: stack);
      rethrow;
    }
  }

  /// Deactivates an employee account (Soft Delete).
  Future<void> deactivateEmployee(String uid) async {
    try {
      log('?? [ADMIN-ACTIONS] Deactivating employee: $uid');

      final userService = ref.read(userServiceProvider);
      await userService.deleteUserData(uid);

      log('? [ADMIN-ACTIONS] Employee deactivated.');
    } catch (e, stack) {
      log(
        '? [ADMIN-ACTIONS] Failed to deactivate employee: $e',
        stackTrace: stack,
      );
      rethrow;
    }
  }

  /// Accepts and verifies a task submitted by an employee.
  Future<void> acceptTask({
    required String employeeId,
    required String taskId,
    required TaskSource taskSource,
    String? employeeName,
    String? taskTitle,
  }) async {
    try {
      log(
        '?? [ADMIN-ACTIONS] Accepting task: $taskId for employee: $employeeId',
      );

      switch (taskSource) {
        case TaskSource.onboarding:
          final service = ref.read(onboardingServiceProvider);
          await service.updateTaskStatus(
            uid: employeeId,
            taskId: taskId,
            status: TaskStatus.verified,
            isCompleted: true,
            employeeName: employeeName,
            taskTitle: taskTitle,
          );
          break;
        case TaskSource.training:
          final service = ref.read(trainingServiceProvider);
          await service.updateTrainingStatus(
            uid: employeeId,
            trainingId: taskId,
            status: TrainingStatus.verified,
          );
          break;
        case TaskSource.clearance:
          final service = ref.read(clearanceServiceProvider);
          await service.updateClearanceStatus(
            uid: employeeId,
            itemId: taskId,
            status: ClearanceStatus.verified,
          );
          break;
      }

      log('✅ [ADMIN-ACTIONS] Task $taskId marked as verified via $taskSource.');
    } catch (e, stack) {
      log('? [ADMIN-ACTIONS] Failed to accept task: $e', stackTrace: stack);
      rethrow;
    }
  }

  /// Rejects a task with a reason.
  Future<void> rejectTask({
    required String employeeId,
    required String taskId,
    required TaskSource taskSource,
    required String reason,
    String? employeeName,
    String? taskTitle,
  }) async {
    try {
      log('?? [ADMIN-ACTIONS] Rejecting task: $taskId. Reason: $reason');

      switch (taskSource) {
        case TaskSource.onboarding:
          final service = ref.read(onboardingServiceProvider);
          await service.updateTaskStatus(
            uid: employeeId,
            taskId: taskId,
            status: TaskStatus.rejected,
            rejectionReason: reason,
            isCompleted: false,
            employeeName: employeeName,
            taskTitle: taskTitle,
          );
          break;
        case TaskSource.training:
          final service = ref.read(trainingServiceProvider);
          await service.updateTrainingStatus(
            uid: employeeId,
            trainingId: taskId,
            status: TrainingStatus.actionRequired,
            rejectionReason: reason,
          );
          break;
        case TaskSource.clearance:
          final service = ref.read(clearanceServiceProvider);
          await service.updateClearanceStatus(
            uid: employeeId,
            itemId: taskId,
            status: ClearanceStatus.actionRequired,
            rejectionReason: reason,
          );
          break;
      }

      log('✅ [ADMIN-ACTIONS] Task $taskId marked as rejected via $taskSource.');
    } catch (e, stack) {
      log('? [ADMIN-ACTIONS] Failed to reject task: $e', stackTrace: stack);
      rethrow;
    }
  }

  /// Admin uploads a file directly for an employee's task.
  Future<void> adminUploadFile({
    required String employeeId,
    required String taskId,
    required PlatformFile file,
    String? employeeName,
    String? taskTitle,
  }) async {
    try {
      log('?? [ADMIN-ACTIONS] Admin uploading file for task: $taskId');

      final storageService = ref.read(storageServiceProvider);
      final onboardingService = ref.read(onboardingServiceProvider);
      final adminUser = ref.read(currentUserProvider).value;

      if (adminUser == null) throw Exception('Admin not authenticated');

      final bytes = file.bytes;
      if (bytes == null || bytes.isEmpty) throw Exception('File data is empty');

      final fileName =
          '${DateTime.now().millisecondsSinceEpoch}_${file.name.replaceAll(' ', '_')}';
      final storagePath = StoragePaths.onboardingDocument(
        uid: employeeId,
        taskId: taskId,
        fileName: fileName,
      );

      final downloadUrl = await storageService.uploadFile(
        fileBytes: bytes,
        fileName: file.name,
        storagePath: storagePath,
        customMetadata: {
          'taskId': taskId,
          'uploadedBy': adminUser.uid,
          'isAdminUpload': 'true',
        },
      );

      await onboardingService.updateTaskStatus(
        uid: employeeId,
        taskId: taskId,
        status: TaskStatus.verified,
        isCompleted: true,
        fileUrl: downloadUrl,
        adminId: adminUser.uid,
        employeeName: employeeName,
        taskTitle: taskTitle,
      );

      log('? [ADMIN-ACTIONS] Admin upload complete and task verified.');
    } catch (e, stack) {
      log('? [ADMIN-ACTIONS] Admin upload failed: $e', stackTrace: stack);
      rethrow;
    }
  }

  /// Skips or unskips a task for an employee.
  Future<void> skipTask({
    required String employeeId,
    required String taskId,
    required bool skip,
    String? employeeName,
    String? taskTitle,
  }) async {
    try {
      log('⚙️ [ADMIN-ACTIONS] ${skip ? 'Skipping' : 'Unskipping'} task: $taskId for employee: $employeeId');

      final service = ref.read(onboardingServiceProvider);
      await service.updateTaskStatus(
        uid: employeeId,
        taskId: taskId,
        status: skip ? TaskStatus.noActionRequired : TaskStatus.notStarted,
        isCompleted: false,
        employeeName: employeeName,
        taskTitle: taskTitle,
      );

      log('✅ [ADMIN-ACTIONS] Task $taskId skip state updated successfully.');
    } catch (e, stack) {
      log('❌ [ADMIN-ACTIONS] Failed to skip task: $e', stackTrace: stack);
      rethrow;
    }
  }

  /// Updates the blank form download/Adobe link for a specific onboarding task.
  Future<void> updateBlankFormLink({
    required String employeeId,
    required String taskId,
    required String newLink,
    required TaskStatus currentStatus,
  }) async {
    try {
      log('⚙️ [ADMIN-ACTIONS] Updating blankFormLink for task: $taskId for employee: $employeeId to: $newLink');
      final service = ref.read(onboardingServiceProvider);
      await service.updateTaskStatus(
        uid: employeeId,
        taskId: taskId,
        status: currentStatus,
        blankFormLink: newLink,
      );
      log('✅ [ADMIN-ACTIONS] Blank form link updated successfully.');
    } catch (e, stack) {
      log('❌ [ADMIN-ACTIONS] Failed to update blank form link: $e', stackTrace: stack);
      rethrow;
    }
  }
}

/// Provider for admin-specific task actions.
final adminDirectoryActionsProvider =
    NotifierProvider<AdminDirectoryActions, void>(() {
      return AdminDirectoryActions();
    });

