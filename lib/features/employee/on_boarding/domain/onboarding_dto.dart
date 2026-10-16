// =============================================================================
// ONBOARDING DTO (Data Transfer Object)
// =============================================================================
// Handles all Firestore ↔ Domain serialization for onboarding tasks.
// Follows the same pattern as UserDTO in the Auth feature.
//
// Design Principles:
// 1. FAIL FAST — throws FormatException on corrupted data.
// 2. DEFENSIVE — uses null-coalescing for optional fields.
// 3. IMMUTABLE — always returns new entity instances.
// =============================================================================

import 'package:bhmh/core/extensions/string_extensions.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class OnboardingTaskDTO {
  // ── DESERIALIZATION (Firestore → Domain) ──────────────────────────────────

  /// Converts a Firestore DocumentSnapshot to a [CompilationSubTask].
  static CompilationSubTask fromFirestore(DocumentSnapshot doc) {
    final map = doc.data() as Map<String, dynamic>?;

    if (map == null) {
      throw FormatException(
        'Document data was null for Onboarding Task ID: ${doc.id}',
      );
    }

    final rawActionType = map['actionType'] as String?;
    final title = (map['title'] as String?)?.isNotEmpty == true
        ? (map['title'] as String).toTitleCase()
        : doc.id.toTitleCase();
    final subtitle = (map['subtitle'] as String?)?.isNotEmpty == true
        ? map['subtitle'] as String
        : 'Please complete this step';

    // Infer actionType from Firestore field if present, otherwise infer from title/subtitle
    final actionType = rawActionType != null
        ? _parseActionType(rawActionType)
        : CompilationSubTask.inferActionType(title, subtitle);

    return CompilationSubTask(
      id: doc.id,
      title: title,
      subtitle: subtitle,
      isCompleted: map['isCompleted'] as bool? ?? false,
      status: _parseTaskStatus(map['status'] as String?),
      actionType: actionType,
      employeeName: map['employeeName'] as String?,
      fileUrl: map['fileUrl'] as String?,
      signatureUrl: map['signatureUrl'] as String?,
      formData: map['formData'] != null
          ? Map<String, dynamic>.from(map['formData'] as Map)
          : null,
      isDraft: map['isDraft'] as bool? ?? false,
      isLocked: map['isLocked'] as bool? ?? false,
      rejectionReason: map['rejectionReason'] as String?,
      adminId: map['adminId'] as String?,
      employeeId: doc
          .reference
          .parent
          .parent
          ?.id, // Extract UID from 'users/{uid}/onboardingTasks/{taskId}'
      completedAt: _parseTimestamp(map['completedAt']),
      updatedAt: _parseTimestamp(map['updatedAt']),
      dueDate: _parseTimestamp(map['dueDate']),
      signedAt: _parseTimestamp(map['signedAt']),
      adminFormData: map['adminFormData'] != null
          ? Map<String, dynamic>.from(map['adminFormData'] as Map)
          : null,
      adminSignatureUrl: map['adminSignatureUrl'] as String?,
      formSchema: map['formSchema'] != null
          ? (map['formSchema'] as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList()
          : null,
      policyContent: map['policyContent'] as String?,
      blankFormLink: map['blankFormLink'] as String?,
    );
  }

  /// Converts a Firestore DocumentSnapshot to a [CompilationTask] (category).

  static CompilationTask categoryFromFirestore(
    DocumentSnapshot doc,
    List<CompilationSubTask> subTasks,
  ) {
    final map = doc.data() as Map<String, dynamic>?;

    if (map == null) {
      throw FormatException(
        'Document data was null for Category ID: ${doc.id}',
      );
    }

    return CompilationTask(
      id: doc.id,
      title: (map['title'] as String?)?.isNotEmpty == true
          ? map['title'] as String
          : 'Task Category',
      subtitle: map['subtitle'] as String? ?? 'Incomplete',
      isCompleted: map['isCompleted'] as bool? ?? false,
      subTasks: subTasks,
    );
  }

  // ── SERIALIZATION (Domain → Firestore) ────────────────────────────────────

  /// Converts a [CompilationSubTask] entity to a Firestore-compatible map.
  static Map<String, dynamic> toFirestore(CompilationSubTask task) {
    return {
      'title': task.title,
      'subtitle': task.subtitle,
      'isCompleted': task.isCompleted,
      'status': task.status.name,
      'actionType': task.actionType.name,
      'employeeName': task.employeeName,
      'fileUrl': task.fileUrl,
      'signatureUrl': task.signatureUrl,
      'formData': task.formData,
      'isDraft': task.isDraft,
      'isLocked': task.isLocked,
      'rejectionReason': task.rejectionReason,
      'adminId': task.adminId,
      'employeeId': task
          .employeeId, // Redundant but helpful for simpler queries if needed
      'completedAt': task.completedAt != null
          ? Timestamp.fromDate(task.completedAt!)
          : null,
      'updatedAt': FieldValue.serverTimestamp(),
      'dueDate': task.dueDate != null
          ? Timestamp.fromDate(task.dueDate!)
          : null,
      'signedAt': task.signedAt != null
          ? Timestamp.fromDate(task.signedAt!)
          : null,
      'adminFormData': task.adminFormData,
      'adminSignatureUrl': task.adminSignatureUrl,
      'formSchema': task.formSchema,
      'policyContent': task.policyContent,
      'blankFormLink': task.blankFormLink,
    };
  }

  static Map<String, dynamic> updateStatusToFirestore({
    required TaskStatus status,
    bool isCompleted = false,
    String? title,
    String? employeeName,
    String? fileUrl,
    String? signatureUrl,
    Map<String, dynamic>? formData,
    bool? isDraft,
    bool? isLocked,
    String? rejectionReason,
    String? adminId,
    String? employeeId,
    DateTime? signedAt,
    Map<String, dynamic>? adminFormData,
    String? adminSignatureUrl,
    String? blankFormLink,
  }) {
    final map = <String, dynamic>{
      'status': status.name,
      'isCompleted': isCompleted,
      'updatedAt': FieldValue.serverTimestamp(),
    };

    if (title != null) map['title'] = title;
    if (employeeName != null) map['employeeName'] = employeeName;
    if (fileUrl != null) map['fileUrl'] = fileUrl;
    if (signatureUrl != null) map['signatureUrl'] = signatureUrl;
    if (formData != null) map['formData'] = formData;
    if (isDraft != null) map['isDraft'] = isDraft;
    if (isLocked != null) map['isLocked'] = isLocked;
    if (rejectionReason != null) map['rejectionReason'] = rejectionReason;
    if (adminId != null) map['adminId'] = adminId;
    if (employeeId != null) map['employeeId'] = employeeId;
    if (isCompleted) map['completedAt'] = FieldValue.serverTimestamp();
    if (signedAt != null) map['signedAt'] = Timestamp.fromDate(signedAt);
    if (adminFormData != null) map['adminFormData'] = adminFormData;
    if (adminSignatureUrl != null) map['adminSignatureUrl'] = adminSignatureUrl;
    if (blankFormLink != null) map['blankFormLink'] = blankFormLink;

    return map;
  }

  // ── Private Parsing Helpers ───────────────────────────────────────────────

  /// Safely parses a TaskStatus from a Firestore string value.
  static TaskStatus _parseTaskStatus(String? value) {
    if (value == null) return TaskStatus.notStarted;
    return TaskStatus.values.firstWhere(
      (e) => e.name == value,
      orElse: () => TaskStatus.notStarted,
    );
  }

  /// Safely parses a TaskActionType from a Firestore string value.
  static TaskActionType _parseActionType(String? value) {
    if (value == null) return TaskActionType.none;
    return TaskActionType.values.firstWhere(
      (e) => e.name == value,
      orElse: () => TaskActionType.none,
    );
  }

  /// Safely parses a Firestore Timestamp to a DateTime.
  static DateTime? _parseTimestamp(dynamic value) {
    if (value == null) return null;
    if (value is Timestamp) return value.toDate();
    if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
    if (value is String) return DateTime.tryParse(value);
    return null;
  }
}
