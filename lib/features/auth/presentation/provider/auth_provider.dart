import 'dart:developer';
import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/core/services/notification_service.dart';
import 'package:bhmh/core/services/storage_service.dart';
import 'package:bhmh/features/auth/data/data_source/auth_service.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_view_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ToggleNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  set updateState(bool value) => state = value;
}

final termsAcceptedProvider = NotifierProvider<ToggleNotifier, bool>(
  ToggleNotifier.new,
);

final termsAcceptedWebProvider = NotifierProvider<ToggleNotifier, bool>(
  ToggleNotifier.new,
);

final localDataStoreProvider = Provider<LocalDataStore>((ref) {
  return LocalDataStore.instance;
});

final localAuthProvider = Provider<LocalAuth>((ref) {
  return LocalAuth.instance;
});

final localFunctionsProvider = Provider<LocalFunctions>((ref) {
  return LocalFunctions.instance;
});

final userServiceProvider = Provider<UserService>((ref) {
  final store = ref.watch(localDataStoreProvider);
  return UserService(firestore: store);
});

final storageServiceProvider = Provider<StorageService>((ref) {
  return StorageService();
});

final authStateProvider = StreamProvider<LocalUser?>((ref) {
  return ref.watch(localAuthProvider).authStateChanges();
});

final userDataProvider = StreamProvider.autoDispose.family<UserEntity?, String>(
  (ref, uid) {
    final userService = ref.watch(userServiceProvider);
    return userService.streamUserData(uid);
  },
);

final currentUserProvider = StreamProvider<UserEntity?>((ref) {
  final uid = ref.watch(
    authStateProvider.select((asyncValue) => asyncValue.value?.uid),
  );

  if (uid == null) {
    NotificationService().stopListeningToUser();
    return Stream.value(null);
  }

  log('🔄 [PROVIDER] Switching stream to user: $uid');
  NotificationService().listenToUserNotifications(uid);

  ref.onDispose(() {
    NotificationService().stopListeningToUser();
  });

  final userService = ref.watch(userServiceProvider);
  return userService.streamUserData(uid);
});

// 🟦 6. ViewModel Provider
final authViewModelProvider = NotifierProvider<AuthViewModel, AsyncValue<void>>(
  AuthViewModel.new,
);

// 🟦 7. Admin-specific: Fetch linked employees
final employeesProvider = StreamProvider<List<UserEntity>>((ref) {
  final user = ref.watch(currentUserProvider).value;
  if (user == null || user.role != UserRole.admin) {
    return Stream.value([]);
  }
  
  final userService = ref.watch(userServiceProvider);
  
  // 🔔 SELF-HEALING: Automatically adopt orphaned employees when Admin views their dashboard
  Future.microtask(() async {
    log('🔧 [EMPLOYEES-PROVIDER] Checking for orphaned users to adopt for Admin: ${user.uid}');
    try {
      final repairedCount = await userService.bulkRepairUnassignedEmployees(user.uid);
      if (repairedCount > 0) {
        log('✅ [EMPLOYEES-PROVIDER] Successfully adopted $repairedCount orphaned users!');
      }
    } catch (e) {
      log('⚠️ [EMPLOYEES-PROVIDER] Auto-adopt failed: $e');
    }
  });

  return userService.streamUsersByAdmin(user.uid).handleError((error) {
    log('❌ [EMPLOYEES-PROVIDER] Firestore Error: $error');
  });
});
