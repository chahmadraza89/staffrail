import 'dart:developer';
import 'package:bhmh/features/auth/data/data_source/auth_service.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_view_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/core/services/notification_service.dart';
import 'package:bhmh/core/services/storage_service.dart';

// 🟦 Modern UI State Notifier (Riverpod 3.0 Compatible)
class ToggleNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  // Allows direct state updates in a senior-compliant way
  set updateState(bool value) => state = value;
}

// 🟦 UI State Providers
final termsAcceptedProvider = NotifierProvider<ToggleNotifier, bool>(
  ToggleNotifier.new,
);

final termsAcceptedWebProvider = NotifierProvider<ToggleNotifier, bool>(
  ToggleNotifier.new,
);

// 🟦 1. Dependency Injection Base
final firebaseFirestoreProvider = Provider<FirebaseFirestore>((ref) {
  return FirebaseFirestore.instance;
});

final firebaseAuthProvider = Provider<FirebaseAuth>((ref) {
  return FirebaseAuth.instance;
});

final firebaseFunctionsProvider = Provider<FirebaseFunctions>((ref) {
  return FirebaseFunctions.instance;
});

// 🟦 2. Service Injection (IoC)
final userServiceProvider = Provider<UserService>((ref) {
  final firestore = ref.watch(firebaseFirestoreProvider);
  return UserService(firestore: firestore);
});

final storageServiceProvider = Provider<StorageService>((ref) {
  return StorageService();
});

// 🟦 3. Core Auth State (Firebase Auth Stream)
final authStateProvider = StreamProvider<User?>((ref) {
  return ref.watch(firebaseAuthProvider).authStateChanges();
});

// 🟦 4. Domain-Driven User Data Fetching (Stable Stream)
final userDataProvider = StreamProvider.autoDispose.family<UserEntity?, String>(
  (ref, uid) {
    final userService = ref.watch(userServiceProvider);
    return userService.streamUserData(uid);
  },
);

// 🟦 5. Reactive User Stream (STABILIZED - NO FLICKER)
final currentUserProvider = StreamProvider<UserEntity?>((ref) {
  final uid = ref.watch(
    authStateProvider.select((asyncValue) => asyncValue.value?.uid),
  );

  if (uid == null) {
    NotificationService().stopListeningToUser();
    return Stream.value(null);
  }

  log('🔄 [PROVIDER] Switching stream to user: $uid');

  // 🔔 Start listening for unread notifications directly from Firestore
  NotificationService().listenToFirestoreNotifications(uid);
  
  // Clean up when the stream provider is disposed
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
