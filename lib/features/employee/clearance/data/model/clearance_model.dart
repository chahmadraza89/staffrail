import 'package:equatable/equatable.dart';

// =============================================================================
// CLEARANCE MODELS
// =============================================================================
// Domain entities for the Background Clearance module.
// =============================================================================

enum ClearanceStatus {
  pending,
  underReview,
  verified,
  expired,
  actionRequired, // Rejected — needs re-upload
}

class ClearanceEntity extends Equatable {
  final String id;
  final String title;
  final String description;
  final ClearanceStatus status;
  final String? fileUrl;
  final String? employeeId;
  final String? employeeName;
  final String? adminId;
  final String? rejectionReason;
  final DateTime? dueDate;
  final DateTime? submittedAt;
  final DateTime? verifiedAt;
  final DateTime? updatedAt;

  const ClearanceEntity({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    this.fileUrl,
    this.employeeId,
    this.employeeName,
    this.adminId,
    this.rejectionReason,
    this.dueDate,
    this.submittedAt,
    this.verifiedAt,
    this.updatedAt,
  });

  String get statusText {
    switch (status) {
      case ClearanceStatus.pending:
        return 'Pending';
      case ClearanceStatus.underReview:
        return 'Under Review';
      case ClearanceStatus.verified:
        return 'Verified';
      case ClearanceStatus.expired:
        return 'Expired';
      case ClearanceStatus.actionRequired:
        return 'Action Required';
    }
  }

  bool get isCompleted => status == ClearanceStatus.verified;

  bool get canUpload =>
      status == ClearanceStatus.pending ||
      status == ClearanceStatus.actionRequired ||
      status == ClearanceStatus.expired;

  @override
  List<Object?> get props => [
        id,
        title,
        description,
        status,
        fileUrl,
        employeeId,
        employeeName,
        adminId,
        rejectionReason,
        dueDate,
        submittedAt,
        verifiedAt,
        updatedAt,
      ];

  ClearanceEntity copyWith({
    String? id,
    String? title,
    String? description,
    ClearanceStatus? status,
    String? fileUrl,
    String? employeeId,
    String? employeeName,
    String? adminId,
    String? rejectionReason,
    DateTime? dueDate,
    DateTime? submittedAt,
    DateTime? verifiedAt,
    DateTime? updatedAt,
  }) {
    return ClearanceEntity(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      fileUrl: fileUrl ?? this.fileUrl,
      employeeId: employeeId ?? this.employeeId,
      employeeName: employeeName ?? this.employeeName,
      adminId: adminId ?? this.adminId,
      rejectionReason: rejectionReason ?? this.rejectionReason,
      dueDate: dueDate ?? this.dueDate,
      submittedAt: submittedAt ?? this.submittedAt,
      verifiedAt: verifiedAt ?? this.verifiedAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
