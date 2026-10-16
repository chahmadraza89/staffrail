import 'dart:developer';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:bhmh/core/config/firebase_collection_constant.dart' as firebase_const;
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/core/services/notification_service.dart';
import 'package:bhmh/core/models/app_notification.dart';

/// Service responsible for monitoring data compliance, due dates, and auto-expiry.
class ComplianceService {
  final FirebaseFirestore _firestore;
  final NotificationService _notificationService;

  ComplianceService({
    required FirebaseFirestore firestore,
    required NotificationService notificationService,
  })  : _firestore = firestore,
        _notificationService = notificationService {
    log('🛡️ [COMPLIANCE-SERVICE] Initialized with injected dependencies.');
  }

  /// Performs a system-wide scan for items managed by this admin that are past due or expiring soon.
  Future<void> runComplianceCheck(String adminId) async {
    log('🛡️ [COMPLIANCE-SERVICE] Running compliance check for admin: $adminId');
    try {
      await Future.wait([
        _checkClearances(adminId),
        _checkOnboardingTasks(adminId),
        _checkTrainings(adminId), // v0.1: Training expiration monitoring
      ]);
      log('🛡️ [COMPLIANCE-SERVICE] Compliance check completed successfully.');
    } catch (e, stack) {
      log('❌ [COMPLIANCE-SERVICE] Check failed: $e', stackTrace: stack);
    }
  }

  Future<void> _checkClearances(String adminId) async {
    final now = DateTime.now();
    final soonWindow = now.add(const Duration(days: 3));

    final snapshot = await _firestore
        .collectionGroup(firebase_const.clearanceItems)
        .where('adminId', isEqualTo: adminId)
        .get();

    final batch = _firestore.batch();
    int expiredCount = 0;

    for (final doc in snapshot.docs) {
      final data = doc.data();
      final dueDateRaw = data['dueDate'];
      final statusStr = data['status'] as String?;
      final title = data['title'] as String? ?? 'Clearance Item';
      final empName = data['employeeName'] as String? ?? 'An employee';
      
      if (dueDateRaw is Timestamp) {
        final dueDate = dueDateRaw.toDate();

        // 1. Auto-Expire check: If now > dueDate and status isn't already final
        if (dueDate.isBefore(now) && 
            statusStr != ClearanceStatus.verified.name && 
            statusStr != ClearanceStatus.expired.name) {
          batch.update(doc.reference, {
            'status': ClearanceStatus.expired.name,
            'updatedAt': FieldValue.serverTimestamp(),
          });
          expiredCount++;
        } 
        // 2. Due Soon check: If within 3 days and still pending
        else if (dueDate.isBefore(soonWindow) && statusStr == ClearanceStatus.pending.name) {
          await _notificationService.triggerNotification(
            userId: adminId,
            title: 'Expiring Soon',
            body: '$empName''s $title is due in less than 3 days.',
            type: NotificationType.warning,
            metadata: {'type': 'compliance_warning', 'clearanceId': doc.id},
          );
        }
      }
    }

    if (expiredCount > 0) {
      await batch.commit();
      log('🛡️ [COMPLIANCE-SERVICE] Auto-expired $expiredCount clearance items.');
    }
  }

  Future<void> _checkOnboardingTasks(String adminId) async {
    final now = DateTime.now();
    final soonWindow = now.add(const Duration(days: 3));
    
    final snapshot = await _firestore
        .collectionGroup(firebase_const.onboardingTasks)
        .where('adminId', isEqualTo: adminId)
        .get();

    final batch = _firestore.batch();
    int expiredCount = 0;

    for (final doc in snapshot.docs) {
      final data = doc.data();
      final dueDateRaw = data['dueDate'];
      final statusStr = data['status'] as String?;
      final title = data['title'] as String? ?? 'Onboarding Task';
      final empName = data['employeeName'] as String? ?? 'An employee';

      if (dueDateRaw is Timestamp) {
        final dueDate = dueDateRaw.toDate();
        
        // 1. Auto-Expire check: If now > dueDate and status isn't already final
        if (dueDate.isBefore(now) && 
            statusStr != TaskStatus.completed.name && 
            statusStr != TaskStatus.expired.name) {
          batch.update(doc.reference, {
            'status': TaskStatus.expired.name,
            'updatedAt': FieldValue.serverTimestamp(),
          });
          expiredCount++;
        }
        // 2. Due Soon check
        else if (dueDate.isBefore(soonWindow) && 
                 (statusStr == TaskStatus.pending.name || statusStr == TaskStatus.notStarted.name)) {
          await _notificationService.triggerNotification(
            userId: adminId,
            title: 'Expiring Soon',
            body: '$empName''s $title onboarding task is due in less than 3 days.',
            type: NotificationType.warning,
            metadata: {'type': 'compliance_warning', 'taskId': doc.id},
          );
        }
      }
    }

    if (expiredCount > 0) {
      await batch.commit();
      log('🛡️ [COMPLIANCE-SERVICE] Auto-expired $expiredCount onboarding tasks.');
    }
  }

  // ── v0.1: Training Expiration Monitoring ──────────────────────────────────
  // Checks at 30, 15, and 7 day thresholds with escalating alert severity.

  Future<void> _checkTrainings(String adminId) async {
    final now = DateTime.now();

    // Query all trainings managed by this admin
    final snapshot = await _firestore
        .collectionGroup('trainings')
        .where('adminId', isEqualTo: adminId)
        .get();

    final batch = _firestore.batch();
    int expiredCount = 0;

    for (final doc in snapshot.docs) {
      final data = doc.data();
      final expirationRaw = data['expirationDate'];
      final statusStr = data['status'] as String?;
      final noExpiration = data['noExpiration'] as bool? ?? false;
      final title = data['title'] as String? ?? 'Training';
      final empId = data['employeeId'] as String?;

      // Skip if no expiration or already terminal
      if (noExpiration || expirationRaw == null) continue;
      if (statusStr == 'completed' || statusStr == 'overdue') continue;

      if (expirationRaw is Timestamp) {
        final expirationDate = expirationRaw.toDate();
        final daysLeft = expirationDate.difference(now).inDays;

        // 1. Auto-Expire: Past due
        if (expirationDate.isBefore(now)) {
          batch.update(doc.reference, {
            'status': 'overdue',
            'updatedAt': FieldValue.serverTimestamp(),
          });
          expiredCount++;

          // Notify admin about expired training
          await _notificationService.triggerNotification(
            userId: adminId,
            title: '⚠️ Training Expired',
            body: '$title has expired${empId != null ? " for employee $empId" : ""}.',
            type: NotificationType.error,
            metadata: {'type': 'training_expired', 'trainingId': doc.id},
          );
        }
        // 2. 7-Day Warning (Critical)
        else if (daysLeft <= 7) {
          await _notificationService.triggerNotification(
            userId: adminId,
            title: '🔴 Training Expiring in $daysLeft days',
            body: '$title expires in $daysLeft days. Immediate action required.',
            type: NotificationType.error,
            metadata: {'type': 'training_critical', 'trainingId': doc.id},
          );
        }
        // 3. 15-Day Warning (Urgent)
        else if (daysLeft <= 15) {
          await _notificationService.triggerNotification(
            userId: adminId,
            title: '🟡 Training Expiring Soon',
            body: '$title expires in $daysLeft days.',
            type: NotificationType.warning,
            metadata: {'type': 'training_urgent', 'trainingId': doc.id},
          );
        }
        // 4. 30-Day Notice (Advisory)
        else if (daysLeft <= 30) {
          await _notificationService.triggerNotification(
            userId: adminId,
            title: 'Training Renewal Notice',
            body: '$title expires in $daysLeft days. Plan renewal.',
            type: NotificationType.info,
            metadata: {'type': 'training_advisory', 'trainingId': doc.id},
          );
        }
      }
    }

    if (expiredCount > 0) {
      await batch.commit();
      log('🛡️ [COMPLIANCE-SERVICE] Auto-expired $expiredCount training items.');
    }
  }
}
