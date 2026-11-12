import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';

class TrainingDTO {
  static TrainingEntity fromFirestore(LocalDocumentSnapshot doc) {
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
          ? LocalTimestamp.fromDate(training.dueDate!)
          : null,
      'completedAt': training.completedAt != null
          ? LocalTimestamp.fromDate(training.completedAt!)
          : null,
      'updatedAt': LocalFieldValue.serverTimestamp(),
      'expirationDate': training.expirationDate != null
          ? LocalTimestamp.fromDate(training.expirationDate!)
          : null,
      'completionDate': training.completionDate != null
          ? LocalTimestamp.fromDate(training.completionDate!)
          : null,
      'assignedAt': training.assignedAt != null
          ? LocalTimestamp.fromDate(training.assignedAt!)
          : null,
      'noExpiration': training.noExpiration,
      'rejectionReason': training.rejectionReason,
      'employeeId': training.employeeId,
      'adminId': training.adminId,
    };
  }

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
      'updatedAt': LocalFieldValue.serverTimestamp(),
      'completedAt': LocalFieldValue.serverTimestamp(),
      if (completionDate != null)
        'completionDate': LocalTimestamp.fromDate(completionDate),
      if (expirationDate != null)
        'expirationDate': LocalTimestamp.fromDate(expirationDate),
      'noExpiration': noExpiration ?? false,
    };
  }

  static Map<String, dynamic> updateStatusToFirestore({
    required TrainingStatus status,
    String? rejectionReason,
  }) {
    return {
      'status': status.name,
      'updatedAt': LocalFieldValue.serverTimestamp(),
      'rejectionReason': ?rejectionReason,
    };
  }

  static TrainingStatus _parseTrainingStatus(String? value) {
    if (value == null) return TrainingStatus.notStarted;
    return TrainingStatus.values.firstWhere(
      (e) => e.name == value,
      orElse: () => TrainingStatus.notStarted,
    );
  }

  static DateTime? _parseTimestamp(dynamic value) {
    if (value == null) return null;
    if (value is LocalTimestamp) return value.toDate();
    if (value is DateTime) return value;
    if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
    if (value is String) return DateTime.tryParse(value);
    return null;
  }
}
