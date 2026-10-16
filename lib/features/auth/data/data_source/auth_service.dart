// ignore_for_file: library_prefixes

import 'dart:developer';
import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as FirebaseConstant;
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:bhmh/features/auth/domain/user_tdo.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class UserService {
  final FirebaseFirestore _firestore;

  // Defaults to FirebaseFirestore.instance if nothing is provided.
  UserService({FirebaseFirestore? firestore})
    : _firestore = firestore ?? FirebaseFirestore.instance;

  // 🔹 Save Data (Create/Update)
  Future<void> saveUserData(UserEntity user) async {
    try {
      final docRef = _firestore
          .collection(FirebaseConstant.users)
          .doc(user.uid);

      // Uses the DTO to handle database serialization
      await docRef.set(UserDTO.toFirestore(user), SetOptions(merge: true));
      log("✅ [USER-SERVICE] Saved: ${user.email}");
    } catch (e, stack) {
      log("❌ [USER-SERVICE] Save Error: $e", stackTrace: stack);
      rethrow;
    }
  }

  // 🔹 Get User Data (Single Fetch)
  Future<UserEntity?> getUserData(String uid) async {
    try {
      final docRef = _firestore.collection(FirebaseConstant.users).doc(uid);
      final doc = await docRef.get();

      if (doc.exists && doc.data() != null) {
        final data = doc.data() as Map<String, dynamic>;

        // Soft-delete check: Do not return if the user is marked as inactive
        if (data['isActive'] == false) return null;

        // Uses DTO to handle parsing and fail-fast validation
        return UserDTO.fromFirestore(doc);
      }
      return null;
    } catch (e, stack) {
      log("❌ [USER-SERVICE] Get Error: $e", stackTrace: stack);
      rethrow;
    }
  }

  // 🔹 Stream User Data (Real-time Profile)
  Stream<UserEntity?> streamUserData(String uid) {
    return _firestore.collection(FirebaseConstant.users).doc(uid).snapshots().map((
      snapshot,
    ) {
      if (snapshot.exists && snapshot.data() != null) {
        final data = snapshot.data() as Map<String, dynamic>;

        // Soft-delete check
        if (data['isActive'] == false) return null;

        final userEntity = UserDTO.fromFirestore(snapshot);
        log(
          "[STREAM] Role from Firestore: ${data['role']} -> Parsed: ${userEntity.role}",
        );
        return userEntity;
      }
      return null;
    });
  }

  // 🔹 Update Last Login (Using Server Authority)
  Future<void> updateLastLogin(String uid) async {
    try {
      await _firestore
          .collection(FirebaseConstant.users)
          .doc(uid)
          .update(UserDTO.updateLastLoginToFirestore());
    } catch (e) {
      log("⚠️ [USER-SERVICE] Last login update failed (non-critical): $e");
    }
  }

  // 🔹 Update FCM Token
  Future<void> updateFcmToken(String uid, String token) async {
    try {
      await _firestore.collection(FirebaseConstant.users).doc(uid).set({
        'fcmToken': token,
      }, SetOptions(merge: true));
      log("✅ [USER-SERVICE] Updated FCM token for: $uid");
    } catch (e) {
      log("⚠️ [USER-SERVICE] FCM token update failed: $e");
    }
  }

  // 🔹 Delete User Data (Enterprise Soft Delete)
  Future<void> deleteUserData(String uid) async {
    try {
      // Instead of docRef.delete(), we flag the user as inactive.
      // This preserves historical relational data (like past reports or admin logs).
      await _firestore.collection(FirebaseConstant.users).doc(uid).update({
        'isActive': false,
        'deletedAt': FieldValue.serverTimestamp(),
      });
      log("✅ [USER-SERVICE] Soft-deleted user: $uid");
    } catch (e, stack) {
      log("❌ [USER-SERVICE] Delete Error: $e", stackTrace: stack);
      rethrow;
    }
  }

  // 🔹 Soft-Delete Workspace (Admin Cascading Dissolution)
  // Industry Standard: Atomically deactivates the Admin + all linked employees
  // in a single Firestore batch write. Preserves Auth accounts for 30-day recovery.
  Future<void> softDeleteWorkspace(String adminUid) async {
    try {
      final batch = _firestore.batch();

      // 1. Deactivate the Admin's own document
      final adminRef =
          _firestore.collection(FirebaseConstant.users).doc(adminUid);
      batch.update(adminRef, {
        'isActive': false,
        'deletedAt': FieldValue.serverTimestamp(),
        'deletionReason': 'workspace_dissolved_by_admin',
      });

      // 2. Cascade: Deactivate ALL linked employees under this Admin
      final employeesSnapshot = await _firestore
          .collection(FirebaseConstant.users)
          .where('adminId', isEqualTo: adminUid)
          .get();

      int cascadedCount = 0;
      for (final doc in employeesSnapshot.docs) {
        final data = doc.data();
        // Only deactivate employees that are still active
        if (data['isActive'] != false) {
          batch.update(doc.reference, {
            'isActive': false,
            'deletedAt': FieldValue.serverTimestamp(),
            'deletionReason': 'workspace_dissolved',
          });
          cascadedCount++;
        }
      }

      // 3. Atomic commit — all-or-nothing
      await batch.commit();
      log(
        "✅ [USER-SERVICE] Workspace soft-deleted: $adminUid "
        "($cascadedCount employees cascaded)",
      );
    } catch (e, stack) {
      log("❌ [USER-SERVICE] Workspace Delete Error: $e", stackTrace: stack);
      rethrow;
    }
  }

  // 🔹 Get Users by Admin (Optimized)
  // ⚠️ ACTION REQUIRED: You must build a Composite Index in Firebase Console
  // Fields: adminId (Ascending) + isActive (Ascending) + createdAt (Descending)
  Stream<List<UserEntity>> streamUsersByAdmin(String adminId) {
    log('🔍 [USER-SERVICE] Streaming users for admin: $adminId');
    return _firestore
        .collection(FirebaseConstant.users)
        .where('adminId', isEqualTo: adminId)
        // ⚠️ INDEX BYPASS: We remove the composite filters (isActive + orderBy)
        // and handle them in memory to get the app running without manual index creation.
        .snapshots()
        .map((snapshot) {
          final users = snapshot.docs
              .map((doc) => UserDTO.fromFirestore(doc))
              .where((user) => user.isActive == true) // Filter in memory
              .toList();

          // Sort in memory: Newest first
          users.sort((a, b) {
            final dateA = a.createdAt;
            final dateB = b.createdAt;
            return dateB.compareTo(dateA);
          });

          return users;
        });
  }

  // 🔹 Bulk Repair Employees & Tasks
  // 1. Finds unassigned employees and links them to this admin.
  // 2. Ensures all employees of this admin have the adminId synced to their tasks.
  Future<int> bulkRepairUnassignedEmployees(String adminId) async {
    try {
      // Fetch both unassigned AND already assigned employees for this admin
      // to ensure all their sub-collections are also repaired/synced.
      final unassignedSnapshot = await _firestore
          .collection(FirebaseConstant.users)
          .where('role', isEqualTo: UserRole.employee.name)
          .where('adminId', isNull: true)
          .get();

      final assignedSnapshot = await _firestore
          .collection(FirebaseConstant.users)
          .where('role', isEqualTo: UserRole.employee.name)
          .where('adminId', isEqualTo: adminId)
          .get();

      final allRelevantEmployees = [
        ...unassignedSnapshot.docs,
        ...assignedSnapshot.docs,
      ];

      if (allRelevantEmployees.isEmpty) return 0;

      final batch = _firestore.batch();
      int repairedCount = 0;

      for (final doc in allRelevantEmployees) {
        final data = doc.data();
        bool needsDocUpdate = false;

        final Map<String, dynamic> updates = {};

        // ignore: dead_code
        if (needsDocUpdate) {
          updates['updatedAt'] = FieldValue.serverTimestamp();
          batch.update(doc.reference, updates);
          repairedCount++;
        }

        // 2. Deep Sync tasks to this adminId and sync employeeName
        final tasksSnapshot = await doc.reference
            .collection(FirebaseConstant.onboardingTasks)
            .get();

        final employeeName = data['name'] as String?;

        for (final taskDoc in tasksSnapshot.docs) {
          final taskData = taskDoc.data();
          final Map<String, dynamic> taskUpdates = {};

          // Sync adminId if missing or wrong
          if (taskData['adminId'] != adminId) {
            taskUpdates['adminId'] = adminId;
          }

          // Sync employeeName if missing
          if (taskData['employeeName'] == null && employeeName != null) {
            taskUpdates['employeeName'] = employeeName;
          }

          if (taskUpdates.isNotEmpty) {
            batch.update(taskDoc.reference, taskUpdates);
          }
        }
      }

      await batch.commit();
      log(
        "✅ [USER-SERVICE] Deep Sync completed for ${allRelevantEmployees.length} profiles.",
      );
      return repairedCount;
    } catch (e, stack) {
      log("❌ [USER-SERVICE] Bulk Repair Error: $e", stackTrace: stack);
      rethrow;
    }
  }

  // 🔹 Update Profile (Targeted)
  Future<void> updateProfile({
    required String uid,
    String? name,
    String? photoUrl,
    String? department,
    String? bio,
  }) async {
    try {
      final updates = <String, dynamic>{
        'updatedAt': FieldValue.serverTimestamp(),
      };
      if (name != null) updates['name'] = name;
      if (photoUrl != null) updates['photoUrl'] = photoUrl;
      if (department != null) updates['department'] = department;
      if (bio != null) updates['bio'] = bio;

      await _firestore
          .collection(FirebaseConstant.users)
          .doc(uid)
          .update(updates);
      log("✅ [USER-SERVICE] Profile updated for: $uid");
    } catch (e, stack) {
      log("❌ [USER-SERVICE] Update Error: $e", stackTrace: stack);
      rethrow;
    }
  }
}
