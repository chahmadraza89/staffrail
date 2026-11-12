import 'dart:developer';
import 'dart:typed_data';
import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/core/services/notification_service.dart';
import 'package:bhmh/core/services/storage_service.dart';
import 'package:bhmh/features/admin/admin_clearance/data/data_source/admin_clearance_service.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/provider/admin_clearance_provider.dart';
import 'package:bhmh/features/auth/data/data_source/auth_service.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/on_boarding/data/data_source/onboarding_service.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AuthViewModel extends Notifier<AsyncValue<void>> {
  late final LocalAuth _auth;
  late final LocalFunctions _functions;
  late final UserService _userService;
  late final OnboardingService _onboardingService;
  late final AdminClearanceService _adminClearanceService;
  late final StorageService _storageService;
  late final LocalDataStore _firestore;

  @override
  AsyncValue<void> build() {
    _auth = ref.read(localAuthProvider);
    _functions = ref.read(localFunctionsProvider);
    _userService = ref.read(userServiceProvider);
    _onboardingService = ref.read(onboardingServiceProvider);
    _adminClearanceService = ref.read(adminClearanceServiceProvider);
    _storageService = ref.read(storageServiceProvider);
    _firestore = ref.read(localDataStoreProvider);

    return const AsyncValue.data(null);
  }

  // 🔹 Update Profile (Name, Photo, etc.)
  Future<bool> updateProfile({
    String? name,
    List<int>? photoBytes,
    String? photoName,
  }) async {
    final user = _auth.currentUser;
    if (user == null) return false;

    state = const AsyncValue.loading();
    try {
      String? photoUrl;

      // 1. Upload photo if provided
      if (photoBytes != null && photoName != null) {
        final path = 'profiles/${user.uid}/$photoName';
        photoUrl = await _storageService.uploadFile(
          fileBytes: Uint8List.fromList(photoBytes),
          fileName: photoName,
          storagePath: path,
        );
      }

      // 2. Update Firestore
      await _userService.updateProfile(
        uid: user.uid,
        name: name,
        photoUrl: photoUrl,
      );

      log("✅ [AUTH-VIEWMODEL] Profile updated successfully.");
      state = const AsyncValue.data(null);
      return true;
    } catch (e, stack) {
      log("❌ [AUTH-VIEWMODEL] Update Profile Error: $e");
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // 🔹 Email/Password Sign Up
  Future<bool> signUp({
    required String email,
    required String password,
    required String name,
    UserRole role = UserRole.employee,
  }) async {
    state = const AsyncValue.loading();
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user != null) {
        log("📧 Sending verification email to $email");
        await credential.user!.sendEmailVerification();

        final newUser = UserEntity(
          uid: credential.user!.uid,
          email: email,
          name: name,
          createdAt: DateTime.now(),
          lastLogin: DateTime.now(),
          role: role,
          fcmToken: await NotificationService().getToken(),
        );

        // 1. Save to Firestore via Service directly (Safer than ProviderRef here)
        await _userService.saveUserData(newUser);

        // 2. Do NOT sign out. Let AuthGate handle redirection to VerifyEmailPage
        // await _auth.signOut();

        log("✅ Sign up successful. User needs verification.");
        state = const AsyncValue.data(null);
        return true;
      }
    } on LocalDataException catch (e, stack) {
      log("SignUp Error: ${e.code}");
      state = AsyncValue.error(e, stack);
    } catch (e, stack) {
      log("SignUp Error: $e");
      state = AsyncValue.error(e, stack);
    }
    return false;
  }

  // 🔹 Admin Tool: Create User (Advanced)
  // Staff Auth accounts and their `users/{uid}` documents are created by the
  // trusted `registerStaff` callable. This client path no longer writes a
  // membership document directly (and can therefore never bypass the
  // workspace dissolution/registration transaction).
  Future<bool> createUser({
    required String email,
    required String password,
    required String name,
    required String managedByAdminId, // Force Admin ID logic
    UserRole role = UserRole.employee, // ✅ Feature: Allow creating other roles
  }) async {
    state = const AsyncValue.loading();

    try {
      final currentAdminUid = _auth.currentUser?.uid;
      if (currentAdminUid == null || currentAdminUid != managedByAdminId) {
        throw LocalDataException(
          code: 'admin-session-mismatch',
          message: 'The signed-in admin no longer matches this request.',
        );
      }

      final callable = _functions.httpsCallable(
        'registerStaff',
        options: LocalHttpsCallableOptions(timeout: const Duration(seconds: 45)),
      );
      await callable.call(<String, dynamic>{
        'email': email,
        'name': name,
        'role': role.name,
      });

      log("✅ Admin created user through the trusted callable: $email ($role)");
      state = const AsyncValue.data(null);
      return true;
    } catch (e, stack) {
      log("Admin CreateUser Error: $e");
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // 🔹 Email/Password Login
  Future<bool> login({required String email, required String password}) async {
    state = const AsyncValue.loading();
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user != null) {
        // 🔹 Check Verification
        // Note: We allow login even if unverified.
        // AuthWrapper will catch !emailVerified and show VerifyEmailPage.
        if (!credential.user!.emailVerified) {
          log(
            "⚠️ User email not verified - Routing to Verification Page via AuthGate",
          );
        }

        // ✅ DATA REPAIR & VALIDATION:
        // Ensure the user document actually exists (e.g. wasn't soft-deleted or orphaned).
        final userDoc = await _firestore.collection('users').doc(credential.user!.uid).get();
        if (!userDoc.exists || userDoc.data() == null) {
          log("❌ [AUTH-VIEWMODEL] Orphaned user attempted login.");
          await _auth.signOut();
          state = AsyncValue.error(
            LocalDataException(
              code: 'user-not-found-in-db',
              message: 'Account not found. Please contact support.',
            ),
            StackTrace.current,
          );
          return false;
        }

        final data = userDoc.data()!;
        final isActive = data['isActive'] as bool? ?? true;
        if (!isActive) {
          log("❌ [AUTH-VIEWMODEL] Deactivated user attempted login.");
          await _auth.signOut();
          state = AsyncValue.error(
            LocalDataException(
              code: 'access-denied',
              message: 'Access denied. Contact Administrator',
            ),
            StackTrace.current,
          );
          return false;
        }

        final currentUser = await _userService.getUserData(credential.user!.uid);
        if (currentUser != null) {
          // If the profile exists but misses data (like 'isActive'), we re-save to trigger a repair.
          // Capture FCM token on login
          final fcmToken = await NotificationService().getToken();
          if (fcmToken != null) {
            await _userService.updateFcmToken(credential.user!.uid, fcmToken);
          }
          await _userService.saveUserData(
            currentUser.copyWith(fcmToken: fcmToken),
          );
          log(
            "✅ [AUTH-VIEWMODEL] User profile validated/repaired on login. Token saved: ${fcmToken != null}",
          );
        }

        state = const AsyncValue.data(null);
        return true;
      }
    } on LocalDataException catch (e, stack) {
      log("Login Error: ${e.code}");
      state = AsyncValue.error(e, stack);
    } catch (e, stack) {
      log("Login Error: $e");
      state = AsyncValue.error(e, stack);
    }
    return false;
  }

  // 🔹 Resend Verification Email (Professional Implementation)
  Future<bool> resendVerificationEmail() async {
    state = const AsyncValue.loading();
    try {
      final user = _auth.currentUser;
      if (user == null) {
        state = AsyncValue.error(
          LocalDataException(
            code: 'no-user-logged-in',
            message: 'No user is currently signed in.',
          ),
          StackTrace.current,
        );
        return false;
      }

      await user.sendEmailVerification();
      log("✅ [AUTH-VIEWMODEL] Verification email resent to: ${user.email}");

      state = const AsyncValue.data(null);
      return true;
    } on LocalDataException catch (e, stack) {
      log("❌ [AUTH-VIEWMODEL] Resend Error: ${e.code}");
      state = AsyncValue.error(e, stack);
      return false;
    } catch (e, stack) {
      log("❌ [AUTH-VIEWMODEL] Resend Error: $e");
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // 🔹 Legacy/Alternative Resend Verification Email (Kept for compatibility if needed elsewhere)
  Future<bool> resendVerificationEmailWithCredentials({
    required String email,
    required String password,
  }) async {
    state = const AsyncValue.loading();
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user != null) {
        if (credential.user!.emailVerified) {
          await _auth.signOut();
          state = AsyncValue.error(
            LocalDataException(
              code: 'email-already-verified',
              message: 'Email already verified',
            ),
            StackTrace.current,
          );
          return false;
        }

        await credential.user!.sendEmailVerification();
        await _auth.signOut();

        state = const AsyncValue.data(null);
        return true;
      }
    } on LocalDataException catch (e, stack) {
      state = AsyncValue.error(e, stack);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
    return false;
  }

  // 🔹 Password Reset (Forgot Password)
  Future<bool> resetPassword({required String email}) async {
    state = const AsyncValue.loading();
    try {
      await _auth.sendPasswordResetEmail(email: email);
      state = const AsyncValue.data(null);
      return true;
    } on LocalDataException catch (e, stack) {
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // 🔹 Delete Account (Soft Delete — 30-Day Recovery Window)
  // Industry Standard: Re-authenticates, flags Firestore as inactive,
  // signs out. Auth account preserved for potential recovery.
  Future<bool> deleteAccount({required String password}) async {
    state = const AsyncValue.loading();
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw LocalDataException(
          code: 'no-user-logged-in',
          message: 'No user logged in',
        );
      }

      // 1. Re-authenticate (Security Requirement — even if session is active)
      final credential = LocalEmailAuthProvider.credential(
        email: user.email!,
        password: password,
      );
      await user.reauthenticateWithCredential(credential);

      // 2. Soft-delete Firestore Data (sets isActive: false, deletedAt)
      await _userService.deleteUserData(user.uid);

      // 3. Sign out (Auth account stays alive for 30-day recovery)
      await _auth.signOut();

      state = const AsyncValue.data(null);
      return true;
    } on LocalDataException catch (e, stack) {
      log("❌ [AUTH-VIEWMODEL] Delete Account Error: ${e.code}");
      state = AsyncValue.error(e, stack);
      return false;
    } catch (e, stack) {
      log("❌ [AUTH-VIEWMODEL] Delete Account Error: $e");
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // 🔹 Delete Workspace (Admin Cascading Soft Delete)
  // Reauthenticates the Admin, then delegates the atomic cascade to the trusted
  // `deleteAdminWorkspace` callable. The callable derives the caller from the
  // verified Auth token, revalidates everything inside its transaction and
  // enforces the 499-profile limit. All Auth accounts are preserved.
  Future<bool> deleteWorkspace({required String password}) async {
    state = const AsyncValue.loading();
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw LocalDataException(
          code: 'no-user-logged-in',
          message: 'No user logged in',
        );
      }

      // 1. Re-authenticate (mandatory security friction). The token issued by
      // this reauthentication carries the fresh `auth_time` the callable
      // verifies; a forced refresh would mint from the older sign-in instead.
      final credential = LocalEmailAuthProvider.credential(
        email: user.email!,
        password: password,
      );
      await user.reauthenticateWithCredential(credential);
      await user.getIdToken();

      // 2. Atomic cascade soft-delete happens server-side.
      final callable = _functions.httpsCallable(
        'deleteAdminWorkspace',
        options: LocalHttpsCallableOptions(timeout: const Duration(seconds: 60)),
      );
      await callable.call(<String, dynamic>{});

      // 3. Sign out (Auth account stays alive for 30-day recovery)
      await _auth.signOut();

      log("✅ [AUTH-VIEWMODEL] Workspace dissolved successfully.");
      state = const AsyncValue.data(null);
      return true;
    } on LocalDataException catch (e, stack) {
      log("❌ [AUTH-VIEWMODEL] Delete Workspace Error: ${e.code} ${e.message}");
      state = AsyncValue.error(e, stack);
      return false;
    } catch (e, stack) {
      log("❌ [AUTH-VIEWMODEL] Delete Workspace Error: $e");
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // 🔹 Change Password
  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    state = const AsyncValue.loading();
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw LocalDataException(
          code: 'no-user-logged-in',
          message: 'No user logged in',
        );
      }

      // 1. Re-authenticate
      final credential = LocalEmailAuthProvider.credential(
        email: user.email!,
        password: currentPassword,
      );
      await user.reauthenticateWithCredential(credential);

      // 2. Update Password
      await user.updatePassword(newPassword);

      state = const AsyncValue.data(null);
      return true;
    } on LocalDataException catch (e, stack) {
      state = AsyncValue.error(e, stack);
      return false;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  // 🔹 Sign Out
  Future<void> signOut() async {
    state = const AsyncValue.loading();
    try {
      await _auth.signOut();
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  // 🔹 Sync & Repair Data
  // Triggered by Admin to link unassigned employees.
  Future<int> syncAndRepairData() async {
    final user = _auth.currentUser;
    if (user == null) return 0;

    try {
      // 1. Repair user linkages
      final userCount = await _userService.bulkRepairUnassignedEmployees(
        user.uid,
      );

      // 2. Repair task metadata (fix "Unknown Employee")
      final taskCount = await _onboardingService.repairMissingTaskMetadata(
        user.uid,
      );

      // 3. Repair clearance metadata
      final clearanceCount = await _adminClearanceService.repairClearanceData(user.uid);

      log(
        "✅ [AUTH-VIEWMODEL] Sync'd $userCount users and repaired $taskCount tasks and $clearanceCount clearances.",
      );
      return userCount + taskCount + clearanceCount;
    } catch (e) {
      log("❌ [AUTH-VIEWMODEL] Sync error: $e");
      return -1; // Indicate failure
    }
  }
}
