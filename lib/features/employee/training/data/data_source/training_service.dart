import 'dart:developer';

import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as firebase_constant;
import 'package:bhmh/core/config/onboarding_constants.dart';
import 'package:bhmh/core/error/app_failures.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/domain/training_dto.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

// =============================================================================
// TRAINING FIRESTORE SERVICE
// =============================================================================
// Handles all Firestore CRUD operations for training items.
// Follows the same architecture as OnboardingService and UserService.
//
// Features:
// - Real-time stream of training items
// - Certificate URL persistence
// - Status management
// - Batch operations for seeding
// =============================================================================

import 'package:bhmh/core/services/notification_service.dart';
import 'package:bhmh/core/models/app_notification.dart';

class TrainingService {
  final FirebaseFirestore _firestore;
  final NotificationService _notificationService;

  TrainingService({
    FirebaseFirestore? firestore,
    NotificationService? notificationService,
  }) : _firestore = firestore ?? FirebaseFirestore.instance,
       _notificationService = notificationService ?? NotificationService();

  // ── Collection Reference Helper ───────────────────────────────────────────

  /// Returns the sub-collection reference for a user's training items.
  CollectionReference<Map<String, dynamic>> _trainingsCollection(String uid) {
    return _firestore
        .collection(firebase_constant.users)
        .doc(uid)
        .collection(firebase_constant.trainings);
  }

  // ── Stream Trainings (Real-Time) ──────────────────────────────────────────

  /// Streams all training items for a user, ordered by due date.
  Stream<List<TrainingEntity>> streamTrainings(String uid) {
    return _trainingsCollection(
      uid,
    ).orderBy('dueDate', descending: false).snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => TrainingDTO.fromFirestore(doc))
          .toList();
    });
    // Errors propagate to StreamProvider which handles loading/error states.
    // Using handleError here would permanently close the stream on transient errors.
  }

  // ── Get Single Training ───────────────────────────────────────────────────

  /// Fetches a single training item by its ID.
  Future<TrainingEntity?> getTraining({
    required String uid,
    required String trainingId,
  }) async {
    try {
      final doc = await _trainingsCollection(uid).doc(trainingId).get();

      if (!doc.exists || doc.data() == null) return null;

      return TrainingDTO.fromFirestore(doc);
    } on FirebaseException catch (e, stack) {
      log('❌ [TRAINING-SERVICE] Get error: ${e.code}', stackTrace: stack);
      throw FirestoreFailure(
        message: 'Failed to load training details.',
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log('❌ [TRAINING-SERVICE] Unexpected get error: $e', stackTrace: stack);
      throw UnexpectedFailure(
        message: 'Something went wrong loading the training.',
        stackTrace: stack,
      );
    }
  }

  // ── Submit Certificate ────────────────────────────────────────────────────

  /// Updates a training with the certificate URL and marks it as completed.
  Future<void> submitCertificate({
    required String uid,
    required String trainingId,
    required String certificateUrl,
    DateTime? completionDate,
    DateTime? expirationDate,
    bool? noExpiration,
  }) async {
    try {
      final docRef = _trainingsCollection(uid).doc(trainingId);
      final doc = await docRef.get();

      if (doc.exists) {
        // 1. Existing Document: Standard Update
        final updateData = TrainingDTO.updateCertificateToFirestore(
          certificateUrl: certificateUrl,
          status: TrainingStatus.underReview,
          completionDate: completionDate,
          expirationDate: expirationDate,
          noExpiration: noExpiration,
        );
        await docRef.update(updateData);
        log('✅ [TRAINING-SERVICE] Certificate updated for $trainingId');
      } else {
        // 2. New Document (Smart Upsert): Create from Template
        log(
          '💡 [TRAINING-SERVICE] Training record missing for $trainingId. Creating from template...',
        );

        final defaults = OnboardingConstants.getDefaultTrainings(
          employeeId: uid,
        );
        final template = defaults.where((e) => e.id == trainingId).firstOrNull;

        if (template == null) {
          throw const FirestoreFailure(message: 'Unknown training item ID.');
        }

        final newEntity = template.copyWith(
          status: TrainingStatus.underReview,
          certificateUrl: certificateUrl,
          completionDate: completionDate ?? DateTime.now(),
          expirationDate: expirationDate,
          noExpiration: noExpiration ?? false,
          assignedAt: DateTime.now(),
        );

        await docRef.set(TrainingDTO.toFirestore(newEntity));
        log(
          '✅ [TRAINING-SERVICE] Training record created and certificate submitted for $trainingId',
        );
      }

      // Trigger Notification
      await _notificationService.triggerNotification(
        userId: uid,
        title: 'Certificate Processed',
        body:
            'Your training certificate has been successfully uploaded and processed.',
        type: NotificationType.success,
        metadata: {'trainingId': trainingId, 'type': 'training_complete'},
      );
    } on FirebaseException catch (e, stack) {
      log(
        '❌ [TRAINING-SERVICE] Certificate submit error: ${e.code}',
        stackTrace: stack,
      );
      throw FirestoreFailure(
        message: 'Failed to submit certificate. Please try again.',
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log(
        '❌ [TRAINING-SERVICE] Unexpected certificate error: $e',
        stackTrace: stack,
      );
      throw UnexpectedFailure(
        message: 'Something went wrong submitting the certificate.',
        stackTrace: stack,
      );
    }
  }

  // ── Update Status ─────────────────────────────────────────────────────────

  /// Updates just the status of a training item.
  Future<void> updateTrainingStatus({
    required String uid,
    required String trainingId,
    required TrainingStatus status,
    String? rejectionReason,
  }) async {
    try {
      final updateData = TrainingDTO.updateStatusToFirestore(
        status: status,
        rejectionReason: rejectionReason,
      );
      await _trainingsCollection(uid).doc(trainingId).update(updateData);
      log('✅ [TRAINING-SERVICE] Training $trainingId status → ${status.name}');
      // Notify employee
      if (status == TrainingStatus.verified) {
        await _notificationService.triggerNotification(
          userId: uid,
          title: 'Training Verified',
          body: 'Your training has been verified.',
          type: NotificationType.success,
          metadata: {'trainingId': trainingId, 'type': 'training_verified'},
        );
      } else if (status == TrainingStatus.actionRequired ||
          rejectionReason != null) {
        await _notificationService.triggerNotification(
          userId: uid,
          title: 'Training Action Required',
          body:
              'Your training requires correction.${rejectionReason != null ? ' Reason: $rejectionReason' : ''}',
          type: NotificationType.warning,
          metadata: {'trainingId': trainingId, 'type': 'training_rejected'},
        );
      }
    } on FirebaseException catch (e, stack) {
      log(
        '❌ [TRAINING-SERVICE] Status update error: ${e.code}',
        stackTrace: stack,
      );
      throw FirestoreFailure(
        message: 'Failed to update training status.',
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log(
        '❌ [TRAINING-SERVICE] Unexpected status error: $e',
        stackTrace: stack,
      );
      throw UnexpectedFailure(
        message: 'Something went wrong updating the training.',
        stackTrace: stack,
      );
    }
  }

  // ── Seed Trainings (Admin Use) ────────────────────────────────────────────

  /// Seeds training items for a new employee in a single batch write.
  Future<void> seedTrainings({
    required String uid,
    required List<TrainingEntity> trainings,
  }) async {
    try {
      final batch = _firestore.batch();

      for (final training in trainings) {
        final docRef = _trainingsCollection(uid).doc(training.id);
        batch.set(docRef, TrainingDTO.toFirestore(training));
      }

      await batch.commit();
      log('✅ [TRAINING-SERVICE] Seeded ${trainings.length} trainings for $uid');

      // Trigger Notification for new assignments
      if (trainings.isNotEmpty) {
        await _notificationService.triggerNotification(
          userId: uid,
          title: 'New Trainings Assigned',
          body:
              'You have ${trainings.length} new training modules to complete.',
          type: NotificationType.info,
          metadata: {'type': 'trainings_assigned'},
        );
      }
    } on FirebaseException catch (e, stack) {
      log('❌ [TRAINING-SERVICE] Seed error: ${e.code}', stackTrace: stack);
      throw FirestoreFailure(
        message: 'Failed to initialize training items.',
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log('❌ [TRAINING-SERVICE] Unexpected seed error: $e', stackTrace: stack);
      throw UnexpectedFailure(
        message: 'Something went wrong setting up trainings.',
        stackTrace: stack,
      );
    }
  }
}
