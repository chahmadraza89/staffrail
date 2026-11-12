import 'dart:developer';

import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as firebase_constant;
import 'package:bhmh/core/error/app_failures.dart';
import 'package:bhmh/features/admin/admin_training/data/model/admin_training_model.dart';
import 'package:bhmh/features/admin/admin_training/domain/admin_training_dto.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/domain/training_dto.dart';
import 'package:bhmh/core/data/local_data_store.dart';

// =============================================================================
// ADMIN TRAINING SERVICE
// =============================================================================
// Manages global training templates (creation, editing, listing) and 
// clinic-wide training statistics.
// =============================================================================

class AdminTrainingService {
  final LocalDataStore _firestore;

  AdminTrainingService({LocalDataStore? firestore})  
      : _firestore = firestore ?? LocalDataStore.instance;

  // ─── Collection References ───────────────────────────────────────────────────

  LocalCollectionReference<Map<String, dynamic>> get _trainingTemplatesCollection {
    return _firestore.collection(firebase_constant.trainingTemplates);
  }

  LocalCollectionReference<Map<String, dynamic>> _userTrainingsCollection(String uid) {
    return _firestore
        .collection(firebase_constant.users)
        .doc(uid)
        .collection(firebase_constant.trainings);
  }

  // ─── Stream Global Training Templates ────────────────────────────────────────

  /// Streams all active training templates created by the Admin.  
  Stream<List<AdminTrainingModel>> streamTrainingTemplates() {
    return _trainingTemplatesCollection
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => AdminTrainingDTO.fromFirestore(doc))
          .toList();
    });
  }

  // ─── Stream Clinic-Wide All Assignments ─────────────────────────────────────

  /// Fetches every training record across all employees for this admin.
  /// Scoped by adminId to comply with Firestore security rules.
  Stream<List<TrainingEntity>> streamAllAssignments(String adminId) {
    log('🔍 [ADMIN-TRAINING-SERVICE] Streaming assignments for admin: $adminId');
    return _firestore
        .collectionGroup(firebase_constant.trainings)
        .where('adminId', isEqualTo: adminId)
        .snapshots()
        .map((snapshot) {
      log('✅ [ADMIN-TRAINING-SERVICE] Received ${snapshot.docs.length} assignment docs.');
      return snapshot.docs
          .map((doc) {
            try {
              return TrainingDTO.fromFirestore(doc);
            } catch (e) {
              log('⚠️ [ADMIN-TRAINING-SERVICE] Failed to parse doc ${doc.id}: $e');
              return null;
            }
          })
          .whereType<TrainingEntity>()
          .toList();
    }).handleError((error, stack) {
      log('❌ [ADMIN-TRAINING-SERVICE] streamAllAssignments error: $error');
      throw error;
    });
  }

  /// Streams the top-level stats. 
  /// Note: This is now a wrapper around templates. Compliance is handled in the provider 
  /// by combining templates with the assignment stream for better performance.
  Stream<AdminTrainingStatsModel> streamTrainingTemplatesStats() {
    return _trainingTemplatesCollection.snapshots().map((snapshot) {
      return AdminTrainingStatsModel(
        totalActive: snapshot.docs.length,
        complianceRate: 0.0, // Calculated in the provider via CombineLatest
        overdueCount: 0,     // Calculated in the provider via CombineLatest
      );
    });
  }

  // ─── Create New Training Template ────────────────────────────────────────────

  /// Saves a new training template and optionally assigns it to users.
  Future<void> createTrainingTemplate(AdminTrainingModel training) async {
    try {
      final docRef = _trainingTemplatesCollection.doc();
      final data = AdminTrainingDTO.toFirestore(training);

      await docRef.set(data);
      log('✅ [ADMIN-TRAINING-SERVICE] Created training template: ');

      // Note: A real implementation would trigger a Cloud Function here to fan out 
      // the new training to all relevant users in their 	rainings subcollections.
    } on LocalDataException catch (e, stack) {
      log('❌ [ADMIN-TRAINING-SERVICE] Firebase error: ', stackTrace: stack);
      throw FirestoreFailure(
        message: 'Failed to create training.',
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log('❌ [ADMIN-TRAINING-SERVICE] Unexpected error: ', stackTrace: stack);
      throw UnexpectedFailure(
        message: 'Something went wrong creating the training.',
        stackTrace: stack,
      );
    }
  }

  // ─── Assign Training to Employees ───────────────────────────────────────────

  /// Fetches a template by ID.
  Future<AdminTrainingModel> getTemplate(String templateId) async {
    final doc = await _trainingTemplatesCollection.doc(templateId).get();
    if (!doc.exists) throw Exception('Training template not found.');
    return AdminTrainingDTO.fromFirestore(doc);
  }

  /// Assigns a training template to a list of employees.
  /// This creates a individualized record in each employee's profile.
  Future<void> assignTraining({
    required String templateId,
    required List<String> userIds,
    required DateTime? deadline,
    required String instructions,
    required String adminId,
  }) async {
    try {
      // 1. Fetch the master template
      final template = await getTemplate(templateId);

      // 2. Prepare a Firestore batch for atomic writes
      final batch = _firestore.batch();

      for (final uid in userIds) {
        final docRef = _userTrainingsCollection(uid).doc(templateId);

        // Merge Admin instructions with template description as per pattern
        final fullDescription = instructions.trim().isNotEmpty
            ? '${instructions.trim()}\n\n${template.description}'
            : template.description;

        // map to employee-side entity
        final userTraining = TrainingEntity(
          id: templateId,
          title: template.title,
          description: fullDescription,
          durationText: template.durationText,
          status: TrainingStatus.notStarted,
          dueDate: deadline,
        );

        // Convert and set — include adminId for collectionGroup query scoping
        final data = TrainingDTO.toFirestore(userTraining);
        data['adminId'] = adminId; // Critical for collectionGroup filtering
        batch.set(docRef, data);
      }

      if (userIds.isEmpty) return;

      await batch.commit();
      log('✅ [ADMIN-TRAINING-SERVICE] Assigned training $templateId to ${userIds.length} users.');
    } on LocalDataException catch (e, stack) {
      log('❌ [ADMIN-TRAINING-SERVICE] Firebase assigning error: ',
          stackTrace: stack);
      throw FirestoreFailure(
        message: 'Failed to assign training.',
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log('❌ [ADMIN-TRAINING-SERVICE] Unexpected assigning error: ',
          stackTrace: stack);
      throw UnexpectedFailure(
        message: 'Something went wrong during assignment.',
        stackTrace: stack,
      );
    }
  }
}
