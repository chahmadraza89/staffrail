import 'dart:developer';
import 'package:bhmh/core/config/onboarding_constants.dart';
import 'package:bhmh/core/services/notification_service.dart';
import 'package:bhmh/core/models/app_notification.dart';
import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as firebase_constant;
import 'package:bhmh/core/error/app_failures.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/clearance/domain/clearance_dto.dart';
import 'package:bhmh/core/data/local_data_store.dart';

class ClearanceService {
  final LocalDataStore _firestore;
  final NotificationService _notificationService;

  ClearanceService({
    LocalDataStore? firestore,
    NotificationService? notificationService,
  }) : _firestore = firestore ?? LocalDataStore.instance,
       _notificationService = notificationService ?? NotificationService();

  LocalCollectionReference<Map<String, dynamic>> _collection(String uid) {
    return _firestore
        .collection(firebase_constant.users)
        .doc(uid)
        .collection(firebase_constant.clearanceItems);
  }

  Stream<List<ClearanceEntity>> streamClearanceItems(String uid) {
    return _collection(uid)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs
              .map((doc) => ClearanceDTO.fromFirestore(doc))
              .toList();
        })
        .handleError((error) {
          log(
            '❌ [CLEARANCE-SERVICE] Error streaming clearance items for $uid: $error',
          );
          throw error;
        });
  }

  Future<ClearanceEntity?> getItem({
    required String uid,
    required String itemId,
  }) async {
    try {
      final doc = await _collection(uid).doc(itemId).get();
      if (!doc.exists || doc.data() == null) return null;
      return ClearanceDTO.fromFirestore(doc);
    } on LocalDataException catch (e, stack) {
      log('❌ [CLEARANCE] Get error: ${e.code}', stackTrace: stack);
      throw FirestoreFailure(
        message: 'Failed to load clearance details.',
        code: e.code,
        stackTrace: stack,
      );
    }
  }

  Future<void> submitDocument({
    required String uid,
    required String itemId,
    required String fileUrl,
  }) async {
    try {
      final docRef = _collection(uid).doc(itemId);
      final doc = await docRef.get();

      if (doc.exists) {
        // 1. Existing Document: Standard Update
        final updateData = ClearanceDTO.updateStatusToFirestore(
          status: ClearanceStatus.underReview,
          fileUrl: fileUrl,
        );
        await docRef.update(updateData);
        log('✅ [CLEARANCE] Document updated for $itemId');

        // Trigger Notification
        final entity = ClearanceDTO.fromFirestore(doc);
        if (entity.adminId != null) {
          await _notifyAdmin(uid, entity, itemId);
        }
      } else {
        // 2. New Document (Smart Upsert): Create from Template
        log(
          '💡 [CLEARANCE] Document missing for $itemId. Creating from template...',
        );

        final defaults = OnboardingConstants.getDefaultClearances(
          employeeId: uid,
        );
        final template = defaults.where((e) => e.id == itemId).firstOrNull;

        if (template == null) {
          throw const FirestoreFailure(message: 'Unknown clearance item ID.');
        }

        final newEntity = template.copyWith(
          status: ClearanceStatus.underReview,
          fileUrl: fileUrl,
          submittedAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        await docRef.set(ClearanceDTO.toFirestore(newEntity));
        log('✅ [CLEARANCE] Document created and submitted for $itemId');

        // Trigger Notification
        if (newEntity.adminId != null) {
          await _notifyAdmin(uid, newEntity, itemId);
        }
      }
    } on LocalDataException catch (e, stack) {
      throw FirestoreFailure(
        message: 'Failed to submit document.',
        code: e.code,
        stackTrace: stack,
      );
    }
  }

  Future<void> _notifyAdmin(
    String uid,
    ClearanceEntity entity,
    String itemId,
  ) async {
    await _notificationService.triggerNotification(
      userId: entity.adminId!,
      title: 'New Document for Review',
      body:
          '${entity.employeeName ?? 'An employee'} has submitted ${entity.title} for verification.',
      type: NotificationType.info,
      metadata: {
        'type': 'clearance_submission',
        'employeeId': uid,
        'clearanceId': itemId,
      },
    );
  }

  Future<void> updateClearanceStatus({
    required String uid,
    required String itemId,
    required ClearanceStatus status,
    String? rejectionReason,
  }) async {
    try {
      final docRef = _collection(uid).doc(itemId);
      await docRef.update({
        'status': status.name,
        'rejectionReason': ?rejectionReason,
        if (status == ClearanceStatus.verified)
          'verifiedAt': LocalFieldValue.serverTimestamp(),
        'updatedAt': LocalFieldValue.serverTimestamp(),
      });
      log('✅ [CLEARANCE] Status updated to ${status.name} for $itemId');

      // Notify employee
      if (status == ClearanceStatus.verified) {
        await _notificationService.triggerNotification(
          userId: uid,
          title: 'Clearance Verified',
          body: 'Your clearance document has been verified.',
          type: NotificationType.success,
          metadata: {'clearanceId': itemId, 'type': 'clearance_verified'},
        );
      } else if (status == ClearanceStatus.actionRequired ||
          rejectionReason != null) {
        await _notificationService.triggerNotification(
          userId: uid,
          title: 'Clearance Action Required',
          body:
              'Your clearance document requires correction.${rejectionReason != null ? ' Reason: $rejectionReason' : ''}',
          type: NotificationType.warning,
          metadata: {'clearanceId': itemId, 'type': 'clearance_rejected'},
        );
      }
    } on LocalDataException catch (e, stack) {
      throw FirestoreFailure(
        message: 'Failed to update clearance status.',
        code: e.code,
        stackTrace: stack,
      );
    }
  }

  Future<void> seedClearanceItems({
    required String uid,
    required List<ClearanceEntity> items,
  }) async {
    try {
      final batch = _firestore.batch();
      for (final item in items) {
        final docRef = _collection(uid).doc(item.id);
        batch.set(docRef, ClearanceDTO.toFirestore(item));
      }
      await batch.commit();
      log('✅ [CLEARANCE] Seeded ${items.length} items for $uid');

      // 🔔 Notify Employee
      await _notificationService.triggerNotification(
        userId: uid,
        title: 'Verification Needed',
        body:
            'Please upload your background clearance documents for verification.',
        type: NotificationType.warning,
        metadata: {'type': 'clearance_seed'},
      );
    } on LocalDataException catch (e, stack) {
      throw FirestoreFailure(
        message: 'Failed to initialize clearance items.',
        code: e.code,
        stackTrace: stack,
      );
    }
  }
}
