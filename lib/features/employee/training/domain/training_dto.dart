// =============================================================================
// TRAINING DTO (Data Transfer Object)
// =============================================================================
// Handles all Firestore ↔ Domain serialization for training items.
// Follows the same pattern as OnboardingTaskDTO and UserDTO.
// =============================================================================

import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class TrainingDTO {
  // ── DESERIALIZATION (Firestore → Domain) ──────────────────────────────────

  /// Converts a Firestore DocumentSnapshot to a [TrainingEntity].
  static TrainingEntity fromFirestore(DocumentSnapshot doc) {
    final map = doc.data() as Map<String, dynamic>?;

    if (map == null) {
      throw FormatException(
        'Document data was null for Training ID: ${doc.id}',
      );
    }

    // ── v0.1: Backward-compat migration for certificateUrl → certificateUrls
    final legacyCertUrl = map['certificateUrl'] as String?;
    final certUrls = map['certificateUrls'] != null
        ? List<String>.from(map['certificateUrls'] as List)
        : (legacyCertUrl != null && legacyCertUrl.isNotEmpty)
        ? [legacyCertUrl]
        : <String>[];

    return TrainingEntity(
      id: doc.id,
      title: map['title'] as String? ?? '',
      description: map['description'] as String? ?? '',
      durationText: map['durationText'] as String? ?? '',
      status: _parseTrainingStatus(map['status'] as String?),
      certificateUrl: legacyCertUrl,
      certificateUrls: certUrls,
      dueDate: _parseTimestamp(map['dueDate']),
      completedAt: _parseTimestamp(map['completedAt']),
      updatedAt: _parseTimestamp(map['updatedAt']),
      expirationDate: _parseTimestamp(map['expirationDate']),
      completionDate: _parseTimestamp(map['completionDate']),
      noExpiration: map['noExpiration'] as bool? ?? false,
      rejectionReason: map['rejectionReason'] as String?,
      employeeId: map['employeeId'] as String?,
      adminId: map['adminId'] as String?,
      assignedAt: _parseTimestamp(map['assignedAt']),
    );
  }

  // ── SERIALIZATION (Domain → Firestore) ────────────────────────────────────

  /// Converts a [TrainingEntity] to a Firestore-compatible map.
  static Map<String, dynamic> toFirestore(TrainingEntity training) {
    return {
      'title': training.title,
      'description': training.description,
      'durationText': training.durationText,
      'status': training.status.name,
      'certificateUrl': training.certificateUrl,
      'certificateUrls': training.certificateUrls,
      'dueDate': training.dueDate != null
          ? Timestamp.fromDate(training.dueDate!)
          : null,
      'completedAt': training.completedAt != null
          ? Timestamp.fromDate(training.completedAt!)
          : null,
      'updatedAt': FieldValue.serverTimestamp(),
      'expirationDate': training.expirationDate != null
          ? Timestamp.fromDate(training.expirationDate!)
          : null,
      'completionDate': training.completionDate != null
          ? Timestamp.fromDate(training.completionDate!)
          : null,
      'assignedAt': training.assignedAt != null
          ? Timestamp.fromDate(training.assignedAt!)
          : null,
      'noExpiration': training.noExpiration,
      'rejectionReason': training.rejectionReason,
      'employeeId': training.employeeId,
      'adminId': training.adminId,
    };
  }

  /// Generates a partial update map for certificate submission.
  static Map<String, dynamic> updateCertificateToFirestore({
    required String certificateUrl,
    required TrainingStatus status,
    DateTime? completionDate,
    DateTime? expirationDate,
    bool? noExpiration,
  }) {
    return {
      'certificateUrl': certificateUrl,
      'status': status.name,
      'updatedAt': FieldValue.serverTimestamp(),
      'completedAt': FieldValue.serverTimestamp(),
      if (completionDate != null)
        'completionDate': Timestamp.fromDate(completionDate),
      if (expirationDate != null)
        'expirationDate': Timestamp.fromDate(expirationDate),
      'noExpiration': noExpiration ?? false,
    };
  }

  /// Generates a partial update map for status changes only.
  static Map<String, dynamic> updateStatusToFirestore({
    required TrainingStatus status,
    String? rejectionReason,
  }) {
    return {
      'status': status.name,
      'updatedAt': FieldValue.serverTimestamp(),
      'rejectionReason': ?rejectionReason,
    };
  }

  // ── Private Parsing Helpers ───────────────────────────────────────────────

  /// Safely parses a TrainingStatus from a Firestore string value.
  static TrainingStatus _parseTrainingStatus(String? value) {
    if (value == null) return TrainingStatus.notStarted;
    return TrainingStatus.values.firstWhere(
      (e) => e.name == value,
      orElse: () => TrainingStatus.notStarted,
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
