import 'package:bhmh/core/services/compliance_service.dart';
import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as firebase_const;
import 'package:bhmh/core/services/audit_service.dart';
import 'package:bhmh/core/services/notification_service.dart';
import 'package:bhmh/core/models/app_notification.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/clearance/domain/clearance_dto.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

// ignore_for_file: use_null_aware_elements
class AdminClearanceService {
  final FirebaseFirestore _firestore;
  final AuditService _auditService;
  final NotificationService _notificationService;
  final ComplianceService _complianceService;

  AdminClearanceService({
    required FirebaseFirestore firestore,
    required AuditService auditService,
    required NotificationService notificationService,
    required ComplianceService complianceService,
  }) : _firestore = firestore,
       _auditService = auditService,
       _notificationService = notificationService,
       _complianceService = complianceService;

  Stream<List<ClearanceEntity>> streamAdminClearanceTasks(String adminId) {
    debugPrint(
      '🚀 [ADMIN-SERVICE] Subscribing to clearance tasks for admin: $adminId',
    );
    return _firestore
        .collectionGroup(firebase_const.clearanceItems)
        .where('adminId', isEqualTo: adminId)
        .snapshots()
        .map((snapshot) {
          final tasks = snapshot.docs
              .map((doc) => ClearanceDTO.fromFirestore(doc))
              .toList();
          tasks.sort((a, b) {
            final dateA = a.updatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
            final dateB = b.updatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
            return dateB.compareTo(dateA);
          });
          return tasks;
        })
        .handleError((error) {
          debugPrint('❌ [ADMIN-SERVICE] Firestore Stream Error: $error');
          throw error;
        });
  }

  Future<void> verifyClearance({
    required String employeeId,
    required String clearanceId,
    required String adminId,
    required String adminName,
    String? signatureData,
  }) async {
    final ref = _firestore
        .collection(firebase_const.users)
        .doc(employeeId)
        .collection(firebase_const.clearanceItems)
        .doc(clearanceId);

    await ref.update({
      'status': ClearanceStatus.verified.name,
      'verifiedAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
      if (signatureData != null) 'adminSignature': signatureData,
      'verifiedBy': adminId,
    });

    await _auditService.logAction(
      actorId: adminId,
      actorName: adminName,
      actionType: 'CLEARANCE_VERIFIED',
      targetId: clearanceId,
      description: 'Admin verified clearance for employee $employeeId',
      metadata: {'employeeId': employeeId},
    );

    // Trigger Notification for Employee
    await _notificationService.triggerNotification(
      userId: employeeId,
      title: 'Clearance Verified',
      body: 'Your background clearance document has been approved by $adminName.',
      type: NotificationType.success,
      metadata: {'clearanceId': clearanceId, 'type': 'clearance_verified'},
    );
  }

  Future<void> rejectClearance({
    required String employeeId,
    required String clearanceId,
    required String adminId,
    required String adminName,
    required String reason,
  }) async {
    final ref = _firestore
        .collection(firebase_const.users)
        .doc(employeeId)
        .collection(firebase_const.clearanceItems)
        .doc(clearanceId);

    await ref.update({
      'status': ClearanceStatus.actionRequired.name,
      'rejectionReason': reason,
      'updatedAt': FieldValue.serverTimestamp(),
    });

    await _auditService.logAction(
      actorId: adminId,
      actorName: adminName,
      actionType: 'CLEARANCE_REJECTED',
      targetId: clearanceId,
      description:
          'Admin rejected clearance for employee $employeeId. Reason: $reason',
      metadata: {'employeeId': employeeId, 'reason': reason},
    );

    // Trigger Notification for Employee
    await _notificationService.triggerNotification(
      userId: employeeId,
      title: 'Action Required: Clearance Rejected',
      body: 'Your clearance was rejected by $adminName. Reason: $reason',
      type: NotificationType.warning,
      metadata: {'clearanceId': clearanceId, 'type': 'clearance_rejected', 'reason': reason},
    );
  }

  // =============================================================================
  // DATA RESILIENCE LOGIC
  // =============================================================================

  /// Scans for clearance tasks with missing 'adminId' or 'employeeName' and patches them.
  /// Typically called in the background upon Admin login.
    Future<int> repairClearanceData(String adminId) async {
    debugPrint('🔧 [ADMIN-CLEARANCE-SERVICE] Starting data repair for admin: $adminId');

    try {
      // 0. Run Compliance Check (Auto-expiry)
      await _complianceService.runComplianceCheck(adminId);
      // Find employees managed by this admin
      final employeesSnapshot = await _firestore
          .collection(firebase_const.users)
          .where('adminId', isEqualTo: adminId)
          .where('role', isEqualTo: 'employee')
          .get();

      int repairedCount = 0;

      for (final empDoc in employeesSnapshot.docs) {
        final empData = empDoc.data();
        final empName = empData['name'] as String? ?? 'Unknown Employee';

        final clearanceSnapshot = await empDoc.reference
            .collection(firebase_const.clearanceItems)
            .get();

        for (final clearanceDoc in clearanceSnapshot.docs) {
          final data = clearanceDoc.data();
          bool needsUpdate = false;
          final Map<String, dynamic> updates = {};

          if (data['adminId'] == null) {
            updates['adminId'] = adminId;
            needsUpdate = true;
          }
          
          if (data['employeeName'] == null || data['employeeName'] == '') {
            updates['employeeName'] = empName;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await clearanceDoc.reference.update(updates);
            repairedCount++;
          }
        }
      }

      debugPrint('✅ [ADMIN-CLEARANCE-SERVICE] Repair complete. Fixed $repairedCount clearance items.');
      return repairedCount;
    } catch (e) {
      debugPrint('❌ [ADMIN-CLEARANCE-SERVICE] Repair failed: $e');
      return 0;
    }
  }
}
