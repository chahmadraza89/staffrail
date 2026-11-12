import 'dart:async';
import 'dart:developer';

import 'package:bhmh/core/config/onboarding_constants.dart';
import 'package:bhmh/core/extensions/string_extensions.dart';

import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as firebase_const;
import 'package:bhmh/core/error/app_failures.dart';
import 'package:bhmh/features/admin/admin_home/data/model/admin_dashboard_models.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/domain/onboarding_dto.dart';
import 'package:bhmh/core/data/local_data_store.dart';
import 'package:rxdart/rxdart.dart';

// =============================================================================
// ONBOARDING FIRESTORE SERVICE
// =============================================================================
// Handles all Firestore CRUD operations for onboarding tasks.
// Follows the same pattern as UserService in the Auth feature.
//
// Architecture:
// - Injectable LocalDataStore for testability.
// - Uses OnboardingTaskDTO for all serialization.
// - Returns streams for real-time UI updates.
// - Throws typed Failures (never raw exceptions).
// =============================================================================

import 'package:bhmh/core/services/compliance_service.dart';
import 'package:bhmh/core/services/notification_service.dart';
import 'package:bhmh/core/models/app_notification.dart';

class OnboardingService {
  final LocalDataStore _firestore;
  final NotificationService _notificationService;
  final ComplianceService _complianceService;

  OnboardingService({
    required LocalDataStore firestore,
    required NotificationService notificationService,
    required ComplianceService complianceService,
  }) : _firestore = firestore,
       _notificationService = notificationService,
       _complianceService = complianceService;

  // â”€â”€ Collection Reference Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Returns the sub-collection reference for a user's onboarding tasks.
  LocalCollectionReference<Map<String, dynamic>> _tasksCollection(String uid) {
    return _firestore
        .collection(firebase_const.users)
        .doc(uid)
        .collection(firebase_const.onboardingTasks);
  }

  // â”€â”€ Stream Tasks (Real-Time) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Streams all onboarding tasks for a user in real-time.
  /// Returns an ordered list of [CompilationSubTask] sorted by Firestore order.
  Stream<List<CompilationSubTask>> streamOnboardingTasks(String uid) {
    return _tasksCollection(
      uid,
    ).orderBy('updatedAt', descending: false).snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => OnboardingTaskDTO.fromFirestore(doc))
          .toList();
    });
    // Errors propagate to StreamProvider which handles loading/error states.
    // Using handleError here would permanently close the stream on transient errors.
  }

  /// Streams a single task's details in real-time.
  Stream<CompilationSubTask?> streamTaskDetails(String uid, String taskId) {
    return _tasksCollection(uid).doc(taskId).snapshots().map((doc) {
      if (!doc.exists || doc.data() == null) return null;
      return OnboardingTaskDTO.fromFirestore(doc);
    });
  }

  // â”€â”€ Get Single Task â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Fetches a single onboarding task by its ID.
  Future<CompilationSubTask?> getTask({
    required String uid,
    required String taskId,
  }) async {
    try {
      final doc = await _tasksCollection(uid).doc(taskId).get();

      if (!doc.exists || doc.data() == null) return null;

      return OnboardingTaskDTO.fromFirestore(doc);
    } on LocalDataException catch (e, stack) {
      log(
        'âŒ [ONBOARDING-SERVICE] Get task error: ${e.code}',
        stackTrace: stack,
      );
      throw FirestoreFailure(
        message: 'Failed to load task details.',
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log(
        'âŒ [ONBOARDING-SERVICE] Unexpected get error: $e',
        stackTrace: stack,
      );
      throw UnexpectedFailure(
        message: 'Something went wrong loading the task.',
        stackTrace: stack,
      );
    }
  }

  // â”€â”€ Update Task Status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Updates a task's status and optional file/signature URLs or form data.
  /// Also logs the action to the audit track.
  Future<void> updateTaskStatus({
    required String uid,
    required String taskId,
    required TaskStatus status,
    bool isCompleted = false,
    bool isDraft = false,
    String? fileUrl,
    String? signatureUrl,
    Map<String, dynamic>? formData,
    Map<String, dynamic>? adminFormData,
    String? adminSignatureUrl,
    String? rejectionReason,
    String? adminId,
    String? employeeName,
    String? taskTitle, // NEW: Allow passing a pretty title
    bool shouldLock = false,
    DateTime? signedAt, // v0.1: explicit signature timestamp
    String? blankFormLink,
  }) async {
    try {
      final updateData = OnboardingTaskDTO.updateStatusToFirestore(
        status: status,
        isCompleted: isCompleted,
        isDraft: isDraft,
        employeeName: employeeName,
        fileUrl: fileUrl,
        signatureUrl: signatureUrl,
        formData: formData,
        isLocked: shouldLock ? true : null,
        rejectionReason: rejectionReason,
        adminId: adminId,
        signedAt: signedAt,
        adminFormData: adminFormData,
        adminSignatureUrl: adminSignatureUrl,
        title: taskTitle,
        blankFormLink: blankFormLink,
      );

      await _tasksCollection(
        uid,
      ).doc(taskId).set(updateData, LocalSetOptions(merge: true));

      // ── Trigger Notification (Non-Draft only) ─────────────────────────
      if (!isDraft) {
        String? targetAdminId = adminId;

        // Fallback: If adminId is missing, try to resolve from employee profile
        if (targetAdminId == null || targetAdminId.isEmpty) {
          try {
            final userDoc = await _firestore
                .collection(firebase_const.users)
                .doc(uid)
                .get();
            targetAdminId = userDoc.data()?['adminId'] as String?;
            if (targetAdminId != null) {
              log(
                '🔍 [OnboardingService] Fallback: Recovered missing adminId $targetAdminId for employee $uid',
              );
            }
          } catch (e) {
            log('⚠️ [OnboardingService] Failed to recover adminId: $e');
          }
        }

        log(
          '🔔 [OnboardingService] Processing notifications for $taskId (Status: ${status.name}, Admin: $targetAdminId)',
        );

        // BETTER TITLE RESOLUTION: Check for human-readable title in updateData or use fallback
        final String? rawTitle = taskTitle ?? updateData['title'] as String?;
        final formattedTitle = (rawTitle != null && rawTitle.isNotEmpty)
            ? rawTitle
            : taskId.replaceAll('_', ' ').toTitleCase();

        final name = employeeName ?? 'An employee';

        // 1. Notify Employee (Current Logic)
        String? empTitle;
        String? empBody;
        NotificationType empType = NotificationType.info;

        if (status == TaskStatus.rejected || rejectionReason != null) {
          empTitle = 'Task Action Required';
          empBody = 'Your task "$formattedTitle" requires a correction.';
          empType = NotificationType.warning;
        } else if (status == TaskStatus.verified) {
          empTitle = 'Task Verified';
          empBody = 'Your task "$formattedTitle" has been verified.';
          empType = NotificationType.success;
        } else if (status == TaskStatus.signed) {
          empTitle = 'Signature Received';
          empBody = 'Your signature for "$formattedTitle" was processed.';
          empType = NotificationType.success;
        } else if (status == TaskStatus.submitted) {
          empTitle = 'Task Submitted';
          empBody = 'Your task "$formattedTitle" is awaiting review.';
          empType = NotificationType.info;
        } else if (status == TaskStatus.completed) {
          empTitle = 'Task Completed';
          empBody =
              'Your task "$formattedTitle" has been counter-signed and completed.';
          empType = NotificationType.success;
        } else if (status == TaskStatus.pendingEmployerSignature) {
          empTitle = 'Awaiting Admin Signature';
          empBody =
              'Your part of "$formattedTitle" is done. Awaiting admin counter-signature.';
          empType = NotificationType.info;
        }

        if (empTitle != null && empBody != null) {
          await _notificationService.triggerNotification(
            userId: uid,
            title: empTitle,
            body: empBody,
            type: empType,
            metadata: {'taskId': taskId, 'type': 'onboarding_update'},
          );
        }

        // 2. Notify Admin
        if (targetAdminId != null) {
          String? admTitle;
          String? admBody;
          NotificationType admType = NotificationType.info;

          if (status == TaskStatus.submitted ||
              status == TaskStatus.signed ||
              status == TaskStatus.waitingForApprover) {
            admTitle = 'Action Required: Task Submitted';
            admBody = '$name has submitted "$formattedTitle" for review.';
          } else if (status == TaskStatus.pendingEmployerSignature) {
            admTitle = 'Signature Required';
            admBody =
                '$name completed their part of "$formattedTitle". Please counter-sign.';
            admType = NotificationType.warning;
          }

          if (admTitle != null && admBody != null) {
            log(
              '📢 [OnboardingService] Triggering Admin Notification to $targetAdminId: $admTitle',
            );
            await _notificationService.triggerNotification(
              userId: targetAdminId,
              title: admTitle,
              body: admBody,
              type: admType,
              metadata: {
                'taskId': taskId,
                'employeeId': uid,
                'type': 'admin_review_required',
              },
            );
          }
        }
      }

      // ── Audit Logging ──────────────────────────────────────────────────
      if (!isDraft) {
        await _logAuditAction(
          uid: uid,
          taskId: taskId,
          action: 'STATUS_UPDATE',
          details: 'Task $taskId moved to ${status.name}',
        );
      }

      log('âœ… [ONBOARDING-SERVICE] Task $taskId updated to: ${status.name}');
    } on LocalDataException catch (e, stack) {
      log('âŒ [ONBOARDING-SERVICE] Update error: ${e.code}', stackTrace: stack);
      throw FirestoreFailure(
        message: 'Failed to update task status. Please try again.',
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log(
        'âŒ [ONBOARDING-SERVICE] Unexpected update error: $e',
        stackTrace: stack,
      );
      throw UnexpectedFailure(
        message: 'Something went wrong updating the task.',
        stackTrace: stack,
      );
    }
  }

  /// Logs a critical user action for compliance.
  Future<void> _logAuditAction({
    required String uid,
    required String taskId,
    required String action,
    required String details,
  }) async {
    try {
      await _firestore.collection(firebase_const.auditLogs).add({
        'uid': uid,
        'taskId': taskId,
        'action': action,
        'details': details,
        'timestamp': LocalFieldValue.serverTimestamp(),
        'platform': 'Mobile/Tablet',
      });
    } catch (e) {
      log('âš ï¸ [ONBOARDING-SERVICE] Audit logging failed: $e');
      // We don't throw here to avoid blocking the main transaction
    }
  }

  // â”€â”€ Create Task (Admin Use) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Creates a new onboarding task document for a user.
  /// Typically called by admin when assigning tasks.
  Future<void> createTask({
    required String uid,
    required CompilationSubTask task,
  }) async {
    try {
      final data = OnboardingTaskDTO.toFirestore(task);
      await _tasksCollection(uid).doc(task.id).set(data);
      log('âœ… [ONBOARDING-SERVICE] Created task: ${task.id}');
    } on LocalDataException catch (e, stack) {
      log('âŒ [ONBOARDING-SERVICE] Create error: ${e.code}', stackTrace: stack);
      throw FirestoreFailure(
        message: 'Failed to create task.',
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log(
        'âŒ [ONBOARDING-SERVICE] Unexpected create error: $e',
        stackTrace: stack,
      );
      throw UnexpectedFailure(
        message: 'Something went wrong creating the task.',
        stackTrace: stack,
      );
    }
  }

  // â”€â”€ Batch Seed (For Initial Setup) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Seeds onboarding tasks for a new employee in a single batch write.
  /// This is used when an admin onboards a new employee.
  Future<void> seedOnboardingTasks({
    required String uid,
    required List<CompilationSubTask> tasks,
  }) async {
    try {
      final batch = _firestore.batch();

      for (final task in tasks) {
        final docRef = _tasksCollection(uid).doc(task.id);
        batch.set(docRef, OnboardingTaskDTO.toFirestore(task));
      }

      await batch.commit();
      log('✅ [ONBOARDING-SERVICE] Seeded ${tasks.length} tasks for user $uid');

      // 🔔 Notify Employee
      await _notificationService.triggerNotification(
        userId: uid,
        title: 'Onboarding Journey Started',
        body:
            'Welcome! You have ${tasks.length} new onboarding tasks to complete.',
        type: NotificationType.info,
        metadata: {
          'type': 'onboarding_start',
          'count': tasks.length.toString(),
        },
      );
    } on LocalDataException catch (e, stack) {
      log('âŒ [ONBOARDING-SERVICE] Seed error: ${e.code}', stackTrace: stack);
      throw FirestoreFailure(
        message: 'Failed to initialize onboarding tasks.',
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log(
        'âŒ [ONBOARDING-SERVICE] Unexpected seed error: $e',
        stackTrace: stack,
      );
      throw UnexpectedFailure(
        message: 'Something went wrong setting up onboarding.',
        stackTrace: stack,
      );
    }
  }

  // â”€â”€ Dashboard Statistics (Admin Use) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Combined stream for Admin Dashboard statistics.
  /// Aggregates: Active Employees, New Onboarding (Last 30d), and Completed Today.
  Stream<(int onboarding, int completedToday, int active)>
  streamAdminDashboardStats(String adminId) {
    // 1. Stream Active Employees
    final activeEmployeesStream = _firestore
        .collection(firebase_const.users)
        .where('adminId', isEqualTo: adminId)
        .snapshots();

    // 2. Stream Completed Today
    // Uses Rx.combineLatest2 or switchMap for elite reactive logic
    return activeEmployeesStream.switchMap((employeeSnapshot) {
      final employeeDocs = employeeSnapshot.docs.where((doc) {
        final data = doc.data();
        return data['role'] == 'employee' && data['isActive'] == true;
      }).toList();

      final activeCount = employeeDocs.length;

      // Calculate "Onboarding" count (joined in last 30 days)
      final thirtyDaysAgo = DateTime.now().subtract(const Duration(days: 30));
      final onboardingCount = employeeDocs.where((doc) {
        final data = doc.data();
        final createdAt = (data['createdAt'] as LocalTimestamp?)?.toDate();
        final effectiveDate =
            createdAt ?? (data['updatedAt'] as LocalTimestamp?)?.toDate();
        return effectiveDate != null && effectiveDate.isAfter(thirtyDaysAgo);
      }).length;

      // 3. Stream Completed Tasks Group Query
      return _firestore
          .collectionGroup(firebase_const.onboardingTasks)
          .where('adminId', isEqualTo: adminId)
          .snapshots()
          .map((completedSnapshot) {
            final now = DateTime.now();
            final startOfToday = DateTime(now.year, now.month, now.day);

            final completedTodayCount = completedSnapshot.docs.where((doc) {
              final data = doc.data();
              final isCompleted = data['isCompleted'] == true;
              final completedAt = (data['completedAt'] as LocalTimestamp?)?.toDate();
              return isCompleted &&
                  completedAt != null &&
                  completedAt.isAfter(startOfToday);
            }).length;

            return (onboardingCount, completedTodayCount, activeCount);
          });
    });
  }

  // â”€â”€ Action Required (For Dashboard) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Streams onboarding tasks that require admin intervention.
  /// Boosted Performance: Uses server-side ordering and limits (25 items).
  Stream<List<CompilationSubTask>> streamAdminActionRequiredTasks(
    String adminId,
  ) {
    log(
      'ðŸ” [ONBOARDING-SERVICE] Fetching action required tasks for admin: $adminId',
    );

    return _firestore
        .collectionGroup(firebase_const.onboardingTasks)
        .where('adminId', isEqualTo: adminId)
        // ðŸš€ PERFORMANCE BOOST: Server-side indexing for speed
        .orderBy('updatedAt', descending: true)
        .limit(25)
        .snapshots()
        .map((snapshot) {
          log(
            'âœ… [ONBOARDING-SERVICE] Received ${snapshot.docs.length} tasks from Firestore.',
          );

          // We still filter for specific statuses in memory because Firestore
          // doesn't support "where Field in [A,B,C] + orderBy OtherField" without complex indexes.
          // However, by limiting to 25 NEWEST records, the memory load is negligible.
          final targetStatuses = [
            TaskStatus.submitted,
            TaskStatus.signed,
            TaskStatus.pendingEmployerSignature,
            TaskStatus.waitingForApprover,
          ];

          return snapshot.docs
              .map((doc) {
                try {
                  return OnboardingTaskDTO.fromFirestore(doc);
                } catch (e) {
                  log(
                    'âš ï¸ [ONBOARDING-SERVICE] Failed to parse document ${doc.id}: $e',
                  );
                  return null;
                }
              })
              .whereType<CompilationSubTask>()
              .where((task) => targetStatuses.contains(task.status))
              .toList();
        })
        .handleError((error, stack) {
          log(
            'âŒ [ONBOARDING-SERVICE] Stream error: $error',
            stackTrace: stack,
          );
          throw error;
        });
  }

  // â”€â”€ Data Resilience Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Scans for tasks with missing 'employeeName' and patches them.
  /// Typically called in the background upon Admin login.
  Future<int> repairMissingTaskMetadata(String adminId) async {
    log('🚀 [ONBOARDING-SERVICE] Starting data repair for admin: $adminId');

    try {
      // 0. Run Compliance Check (Auto-expiry)
      await _complianceService.runComplianceCheck(adminId);
      // 1. Scan for tasks with missing adminId or employeeName
      // Optimization: We fetch all employees for this admin first to narrow down the collectionGroup search
      final employeesSnapshot = await _firestore
          .collection(firebase_const.users)
          .where('adminId', isEqualTo: adminId)
          .get();

      final employeeIds = employeesSnapshot.docs.map((d) => d.id).toSet();
      final employeeNames = {
        for (var d in employeesSnapshot.docs)
          d.id: d.data()['name'] as String? ?? 'Employee',
      };

      // 2. Fetch all onboarding tasks and filter manually to bypass complex indexing needs
      // and catch those missing the 'adminId' field.
      final allTasksSnapshot = await _firestore
          .collectionGroup(firebase_const.onboardingTasks)
          .get();

      int repairedCount = 0;

      for (final doc in allTasksSnapshot.docs) {
        final data = doc.data();
        final employeeId = doc.reference.parent.parent?.id;

        // Only repair if the task belongs to an employee of THIS admin
        if (employeeId != null && employeeIds.contains(employeeId)) {
          final Map<String, dynamic> updates = {};

          if (data['adminId'] != adminId) {
            updates['adminId'] = adminId;
          }

          if (data['employeeName'] == null) {
            updates['employeeName'] = employeeNames[employeeId];
          }

          // Normalize Title: If title is missing or looks like a raw ID
          final String? currentTitle = data['title'] as String?;
          final String taskId = doc.id;
          if (currentTitle == null || currentTitle == taskId) {
            updates['title'] = taskId.replaceAll('_', ' ').toTitleCase();
          }

          if (updates.isNotEmpty) {
            await doc.reference.update(updates);
            repairedCount++;
          }
        }
      }

      // ── MIGRATION & SEEDING FOR DRIVER'S LICENSE & VERIFICATION ──
      for (final empId in employeeIds) {
        final licenseDoc = await _tasksCollection(
          empId,
        ).doc('driver\'s_license').get();
        final verificationDoc = await _tasksCollection(
          empId,
        ).doc('driver\'s_verification').get();

        final empName = employeeNames[empId] ?? 'Employee';
        final defaultTasks = OnboardingConstants.getDefaultTasks();
        final licenseTemplate = defaultTasks.firstWhere(
          (t) => t.id == 'driver\'s_license',
        );
        final verificationTemplate = defaultTasks.firstWhere(
          (t) => t.id == 'driver\'s_verification',
        );

        if (licenseDoc.exists) {
          final licenseData = licenseDoc.data();
          final actionTypeStr = licenseData?['actionType'] as String?;
          final hasSignature =
              licenseData?['formData'] != null &&
              (licenseData?['formData'] as Map<String, dynamic>).containsKey(
                'signature',
              );

          // Check if this is a legacy splitField task
          if (actionTypeStr == 'splitField' || hasSignature) {
            // If they don't have driver's verification seeded yet, migrate the data there
            if (!verificationDoc.exists) {
              log(
                '📦 [MIGRATION] Migrating legacy splitField Driver\'s License to Driver\'s Verification for $empId',
              );
              final migratedVerification = OnboardingTaskDTO.toFirestore(
                CompilationSubTask(
                  id: 'driver\'s_verification',
                  title: 'Driver’s Verification',
                  subtitle: 'Dual-Signature Required',
                  status: TaskStatus.values.firstWhere(
                    (e) =>
                        e.name ==
                        (licenseData?['status'] as String? ?? 'notStarted'),
                    orElse: () => TaskStatus.notStarted,
                  ),
                  actionType: TaskActionType.splitField,
                  employeeId: empId,
                  employeeName: empName,
                  adminId: adminId,
                  formData: licenseData?['formData'] as Map<String, dynamic>?,
                  adminFormData:
                      licenseData?['adminFormData'] as Map<String, dynamic>?,
                  signatureUrl: licenseData?['signatureUrl'] as String?,
                  adminSignatureUrl:
                      licenseData?['adminSignatureUrl'] as String?,
                  updatedAt: DateTime.now(),
                ),
              );
              await _tasksCollection(
                empId,
              ).doc('driver\'s_verification').set(migratedVerification);
            }

            // Reset driver's license task to a clean upload task
            log(
              '📦 [MIGRATION] Resetting Driver\'s License to standard Upload task for $empId',
            );
            await _tasksCollection(empId)
                .doc('driver\'s_license')
                .set(
                  OnboardingTaskDTO.toFirestore(
                    licenseTemplate.copyWith(
                      employeeId: empId,
                      employeeName: empName,
                      adminId: adminId,
                    ),
                  ),
                );
            repairedCount++;
          }
        } else {
          // Seed missing driver's license upload task
          log(
            '📦 [MIGRATION] Seeding missing Driver\'s License upload task for $empId',
          );
          await _tasksCollection(empId)
              .doc('driver\'s_license')
              .set(
                OnboardingTaskDTO.toFirestore(
                  licenseTemplate.copyWith(
                    employeeId: empId,
                    employeeName: empName,
                    adminId: adminId,
                  ),
                ),
              );
          repairedCount++;
        }

        // Also seed driver's verification if missing and not migrated
        if (!verificationDoc.exists && !licenseDoc.exists) {
          log(
            '📦 [MIGRATION] Seeding missing Driver\'s Verification splitField task for $empId',
          );
          await _tasksCollection(empId)
              .doc('driver\'s_verification')
              .set(
                OnboardingTaskDTO.toFirestore(
                  verificationTemplate.copyWith(
                    employeeId: empId,
                    employeeName: empName,
                    adminId: adminId,
                  ),
                ),
              );
          repairedCount++;
        }
      }

      log(
        '✅ [ONBOARDING-SERVICE] Repair complete. Fixed $repairedCount tasks.',
      );
      return repairedCount;
    } catch (e, stack) {
      log('❌ [ONBOARDING-SERVICE] Repair failed: $e', stackTrace: stack);
      return 0;
    }
  }

  // â”€â”€ Employee Tracking (For Admin Dashboard) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Streams detailed progress for all employees managed by an admin.
  /// Refined for Spec Req #6: Aggregated progress by category per employee.
  ///
  /// FIX: Replaced collectionGroup queries with mapped subcollection queries
  /// to completely bypass the Firestore composite index requirement.
  Stream<List<AdminEmployeeProgress>> streamAdminEmployeesProgress(
    String adminId,
  ) {
    return _firestore
        .collection(firebase_const.users)
        .where('adminId', isEqualTo: adminId)
        .where('role', isEqualTo: 'employee')
        .snapshots()
        .switchMap((employeeSnapshot) {
          if (employeeSnapshot.docs.isEmpty) {
            return Stream.value(<AdminEmployeeProgress>[]);
          }

          // For every employee, create a combined stream of their specific subcollections
          final List<Stream<AdminEmployeeProgress>>
          employeeStreams = employeeSnapshot.docs.map((empDoc) {
            final empData = empDoc.data();
            final uid = empDoc.id;

            final tasksStream = _firestore
                .collection(firebase_const.users)
                .doc(uid)
                .collection(firebase_const.onboardingTasks)
                .snapshots();
            final trainingsStream = _firestore
                .collection(firebase_const.users)
                .doc(uid)
                .collection(firebase_const.trainings)
                .snapshots();
            final clearanceStream = _firestore
                .collection(firebase_const.users)
                .doc(uid)
                .collection(firebase_const.clearanceItems)
                .snapshots();

            return Rx.combineLatest3(
              tasksStream,
              trainingsStream,
              clearanceStream,
              (taskSnap, trainingSnap, clearanceSnap) {
                // Calculate Onboarding Progress
                final relevantTasks = taskSnap.docs
                    .where(
                      (t) =>
                          t.data()['status'] !=
                          TaskStatus.noActionRequired.name,
                    )
                    .toList();
                final totalTasks = relevantTasks.length;
                final completedTasks = relevantTasks
                    .where((t) => t.data()['isCompleted'] == true)
                    .length;
                final onboardingPct = totalTasks == 0
                    ? 0.0
                    : completedTasks / totalTasks;

                // Calculate Training Progress
                final totalTrainings = trainingSnap.docs.length;
                final completedTrainings = trainingSnap.docs
                    .where((t) => t.data()['status'] == 'completed')
                    .length;
                final trainingPct = totalTrainings == 0
                    ? 0.0
                    : completedTrainings / totalTrainings;

                // Calculate Clearance Progress
                final totalClearances = clearanceSnap.docs.length;
                final completedClearances = clearanceSnap.docs
                    .where((t) => t.data()['status'] == 'verified')
                    .length;
                final clearancePct = totalClearances == 0
                    ? 0.0
                    : completedClearances / totalClearances;

                // Calculate Overall Progress (average of the available modules)
                int activeModules = 0;
                double sumProgress = 0.0;

                if (totalTasks > 0) {
                  activeModules++;
                  sumProgress += onboardingPct;
                }
                if (totalTrainings > 0) {
                  activeModules++;
                  sumProgress += trainingPct;
                }
                if (totalClearances > 0) {
                  activeModules++;
                  sumProgress += clearancePct;
                }

                final overallPct = activeModules == 0
                    ? 0.0
                    : sumProgress / activeModules;

                return AdminEmployeeProgress(
                  uid: uid,
                  name: empData['name'] as String? ?? 'Employee',
                  email: empData['email'] as String?,
                  overallProgress: overallPct,
                  onboardingProgress: onboardingPct,
                  trainingProgress: trainingPct,
                  clearanceProgress: clearancePct,
                  lastLogin:
                      (empData['lastLogin'] as LocalTimestamp?)?.toDate() ??
                      (empData['createdAt'] as LocalTimestamp?)?.toDate() ??
                      DateTime.now(),
                  isActive: empData['isActive'] as bool? ?? true,
                );
              },
            );
          }).toList();

          // Combine all individual employee streams into one reactive list
          return Rx.combineLatestList(employeeStreams).map((employees) {
            // FIXED: Unsupported operation: sort
            // Rx.combineLatestList emits an unmodifiable list.
            // We create a new growable list copy before sorting.
            final mutableEmployees = List<AdminEmployeeProgress>.from(
              employees,
            );

            // Sort by last activity (newest first)
            mutableEmployees.sort((a, b) => b.lastLogin.compareTo(a.lastLogin));
            return mutableEmployees;
          });
        });
  }
}
