// ignore_for_file: use_null_aware_elements
import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';

class ClearanceDTO {
  static ClearanceEntity fromFirestore(LocalDocumentSnapshot doc) {
    final map = doc.data() as Map<String, dynamic>?;
    if (map == null) {
      throw FormatException(
        'Document data was null for Clearance ID: ${doc.id}',
      );
    }

    return ClearanceEntity(
      id: doc.id,
      title: map['title'] as String? ?? '',
      description: map['description'] as String? ?? '',
      status: _parseStatus(map['status'] as String?),
      fileUrl: map['fileUrl'] as String?,
      employeeId: map['employeeId'] as String? ?? doc.reference.parent.parent?.id,
      employeeName: map['employeeName'] as String?,
      adminId: map['adminId'] as String?,
      rejectionReason: map['rejectionReason'] as String?,
      dueDate: _parseTimestamp(map['dueDate']),
      submittedAt: _parseTimestamp(map['submittedAt']),
      verifiedAt: _parseTimestamp(map['verifiedAt']),
      updatedAt: _parseTimestamp(map['updatedAt']),
    );
  }

  static Map<String, dynamic> toFirestore(ClearanceEntity entity) {
    return {
      'title': entity.title,
      'description': entity.description,
      'status': entity.status.name,
      'fileUrl': entity.fileUrl,
      'employeeId': entity.employeeId,
      'employeeName': entity.employeeName,
      'adminId': entity.adminId,
      'rejectionReason': entity.rejectionReason,
      'dueDate': entity.dueDate != null
          ? LocalTimestamp.fromDate(entity.dueDate!)
          : null,
      'submittedAt': entity.submittedAt != null
          ? LocalTimestamp.fromDate(entity.submittedAt!)
          : null,
      'verifiedAt': entity.verifiedAt != null
          ? LocalTimestamp.fromDate(entity.verifiedAt!)
          : null,
      'updatedAt': LocalFieldValue.serverTimestamp(),
    };
  }

  static Map<String, dynamic> updateStatusToFirestore({
    required ClearanceStatus status,
    String? fileUrl,
    String? rejectionReason,
  }) {
    return {
      'status': status.name,
      if (fileUrl != null) 'fileUrl': fileUrl,
      if (rejectionReason != null) 'rejectionReason': rejectionReason,
      'updatedAt': LocalFieldValue.serverTimestamp(),
      if (status == ClearanceStatus.verified)
        'verifiedAt': LocalFieldValue.serverTimestamp(),
      if (status == ClearanceStatus.underReview)
        'submittedAt': LocalFieldValue.serverTimestamp(),
    };
  }

  static ClearanceStatus _parseStatus(String? status) {
    if (status == null) return ClearanceStatus.pending;
    return ClearanceStatus.values.firstWhere(
      (e) => e.name == status,
      orElse: () => ClearanceStatus.pending,
    );
  }

  static DateTime? _parseTimestamp(dynamic timestamp) {
    if (timestamp is LocalTimestamp) return timestamp.toDate();
    if (timestamp is DateTime) return timestamp;
    return null;
  }
}
