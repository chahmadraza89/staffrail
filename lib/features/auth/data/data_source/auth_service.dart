import 'dart:developer';
import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as store_constants;
import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:bhmh/features/auth/domain/user_tdo.dart';

class UserService {
  final LocalDataStore _firestore;

  UserService({LocalDataStore? firestore})
    : _firestore = firestore ?? LocalDataStore.instance;

  Future<void> saveUserData(UserEntity user) async {
    try {
      final docRef = _firestore
          .collection(store_constants.users)
          .doc(user.uid);

      await _firestore.runTransaction((transaction) async {
        final snapshot = await transaction.get(docRef);
        final data = UserDTO.toFirestore(user);

        if (snapshot.exists) {
          data.remove('role');
          data.remove('adminId');
          data.remove('isActive');
          data.remove('createdAt');
        }

        transaction.set(docRef, data, const LocalSetOptions(merge: true));
      });
      log("✅ [USER-SERVICE] Saved: ${user.email}");
    } catch (e, stack) {
      log("❌ [USER-SERVICE] Save Error: $e", stackTrace: stack);
      rethrow;
    }
  }

  Future<UserEntity?> getUserData(String uid) async {
    try {
      final docRef = _firestore.collection(store_constants.users).doc(uid);
      final doc = await docRef.get();

      if (doc.exists && doc.data() != null) {
        final data = doc.data() as Map<String, dynamic>;
        if (data['isActive'] == false) return null;
        return UserDTO.fromFirestore(doc);
      }
      return null;
    } catch (e, stack) {
      log("❌ [USER-SERVICE] Get Error: $e", stackTrace: stack);
      rethrow;
    }
  }

  Stream<UserEntity?> streamUserData(String uid) {
    return _firestore.collection(store_constants.users).doc(uid).snapshots().map((
      snapshot,
    ) {
      if (snapshot.exists && snapshot.data() != null) {
        final data = snapshot.data() as Map<String, dynamic>;
        if (data['isActive'] == false) return null;
        return UserDTO.fromFirestore(snapshot);
      }
      return null;
    });
  }

  Future<void> updateLastLogin(String uid) async {
    try {
      await _firestore
          .collection(store_constants.users)
          .doc(uid)
          .update(UserDTO.updateLastLoginToFirestore());
    } catch (e) {
      log("⚠️ [USER-SERVICE] Last login update failed (non-critical): $e");
    }
  }

  Future<void> updateFcmToken(String uid, String token) async {
    try {
      await _firestore.collection(store_constants.users).doc(uid).set({
        'fcmToken': token,
      }, const LocalSetOptions(merge: true));
      log("✅ [USER-SERVICE] Updated device token for: $uid");
    } catch (e) {
      log("⚠️ [USER-SERVICE] Token update failed: $e");
    }
  }

  Future<void> deleteUserData(String uid) async {
    try {
      await _firestore.collection(store_constants.users).doc(uid).update({
        'isActive': false,
        'deletedAt': LocalFieldValue.serverTimestamp(),
      });
      log("✅ [USER-SERVICE] Soft-deleted user: $uid");
    } catch (e, stack) {
      log("❌ [USER-SERVICE] Delete Error: $e", stackTrace: stack);
      rethrow;
    }
  }

  Stream<List<UserEntity>> streamUsersByAdmin(String adminId) {
    log('🔍 [USER-SERVICE] Streaming users for admin: $adminId');
    return _firestore
        .collection(store_constants.users)
        .where('adminId', isEqualTo: adminId)
        .snapshots()
        .map((snapshot) {
          final users = snapshot.docs
              .map((doc) => UserDTO.fromFirestore(doc))
              .where((user) => user.isActive == true)
              .toList();

          users.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          return users;
        });
  }

  Future<int> bulkRepairUnassignedEmployees(String adminId) async {
    try {
      final unassignedSnapshot = await _firestore
          .collection(store_constants.users)
          .where('role', isEqualTo: UserRole.employee.name)
          .where('adminId', isNull: true)
          .get();

      final assignedSnapshot = await _firestore
          .collection(store_constants.users)
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
        final tasksSnapshot = await doc.reference
            .collection(store_constants.onboardingTasks)
            .get();

        final employeeName = data['name'] as String?;

        for (final taskDoc in tasksSnapshot.docs) {
          final taskData = taskDoc.data();
          final Map<String, dynamic> taskUpdates = {};

          if (taskData['adminId'] != adminId) {
            taskUpdates['adminId'] = adminId;
          }

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

  Future<void> updateProfile({
    required String uid,
    String? name,
    String? photoUrl,
    String? department,
    String? bio,
  }) async {
    try {
      final updates = <String, dynamic>{
        'updatedAt': LocalFieldValue.serverTimestamp(),
      };
      if (name != null) updates['name'] = name;
      if (photoUrl != null) updates['photoUrl'] = photoUrl;
      if (department != null) updates['department'] = department;
      if (bio != null) updates['bio'] = bio;

      await _firestore
          .collection(store_constants.users)
          .doc(uid)
          .update(updates);
      log("✅ [USER-SERVICE] Profile updated for: $uid");
    } catch (e, stack) {
      log("❌ [USER-SERVICE] Update Error: $e", stackTrace: stack);
      rethrow;
    }
  }
}
