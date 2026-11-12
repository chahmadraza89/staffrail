import 'package:equatable/equatable.dart';

// =============================================================================
// TRAINING MODELS
// =============================================================================
// Domain entities for the Training module.
// Firestore serialization is handled by TrainingDTO (separation of concerns).
// =============================================================================

// ── Status Enum ─────────────────────────────────────────────────────────────
enum TrainingStatus {
  completed,
  pending,
  overdue,
  inProgress,
  notStarted,
  underReview,
  verified,
  actionRequired, // Rejected — needs re-upload
}

// ── Training Entity ─────────────────────────────────────────────────────────
class TrainingEntity extends Equatable {
  final String id;
  final String title;
  final String description;
  final String durationText;
  final TrainingStatus status;
  final String? certificateUrl; // Single certificate (backward compat)
  final List<String> certificateUrls; // v0.1: Multiple certificate URLs
  final DateTime? dueDate;
  final DateTime? completedAt;
  final DateTime? updatedAt;
  final DateTime? expirationDate; // v0.1: When the training expires
  final DateTime? completionDate; // v0.1: Explicit completion date (vs system completedAt)
  final bool noExpiration; // v0.1: Training never expires
  final String? rejectionReason; // v0.1: Reason if certificate was rejected
  final String? employeeId; // v0.1: Employee who owns this training
  final String? adminId; // v0.1: Admin who assigned this training
  final DateTime? assignedAt; // The exact time this training was assigned

  const TrainingEntity({
    required this.id,
    required this.title,
    required this.description,
    required this.durationText,
    required this.status,
    this.certificateUrl,
    this.certificateUrls = const [],
    this.dueDate,
    this.completedAt,
    this.updatedAt,
    this.expirationDate,
    this.completionDate,
    this.noExpiration = false,
    this.rejectionReason,
    this.employeeId,
    this.adminId,
    this.assignedAt,
  });

  /// Returns a human-readable date string for the due date.
  String get dueDateText {
    if (dueDate == null) return 'No due date';
    final months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[dueDate!.month]} ${dueDate!.day}, ${dueDate!.year}';
  }

  /// Whether the training has a certificate uploaded.
  bool get hasCertificate =>
      (certificateUrl != null && certificateUrl!.isNotEmpty) ||
      certificateUrls.isNotEmpty;

  /// Whether the training is expiring within the given threshold days.
  bool isExpiringSoon({int thresholdDays = 30}) {
    if (noExpiration || expirationDate == null) return false;
    final daysLeft = expirationDate!.difference(DateTime.now()).inDays;
    return daysLeft > 0 && daysLeft <= thresholdDays;
  }

  /// Whether the training has already expired.
  bool get isExpired {
    if (noExpiration || expirationDate == null) return false;
    return expirationDate!.isBefore(DateTime.now());
  }

  /// Creates a copy with updated fields.
  TrainingEntity copyWith({
    String? id,
    String? title,
    String? description,
    String? durationText,
    TrainingStatus? status,
    String? certificateUrl,
    List<String>? certificateUrls,
    DateTime? dueDate,
    DateTime? completedAt,
    DateTime? updatedAt,
    DateTime? expirationDate,
    DateTime? completionDate,
    bool? noExpiration,
    String? rejectionReason,
    String? employeeId,
    String? adminId,
    DateTime? assignedAt,
  }) {
    return TrainingEntity(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      durationText: durationText ?? this.durationText,
      status: status ?? this.status,
      certificateUrl: certificateUrl ?? this.certificateUrl,
      certificateUrls: certificateUrls ?? this.certificateUrls,
      dueDate: dueDate ?? this.dueDate,
      completedAt: completedAt ?? this.completedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      expirationDate: expirationDate ?? this.expirationDate,
      completionDate: completionDate ?? this.completionDate,
      noExpiration: noExpiration ?? this.noExpiration,
      rejectionReason: rejectionReason ?? this.rejectionReason,
      employeeId: employeeId ?? this.employeeId,
      adminId: adminId ?? this.adminId,
      assignedAt: assignedAt ?? this.assignedAt,
    );
  }

  @override
  List<Object?> get props => [
    id,
    title,
    description,
    durationText,
    status,
    certificateUrl,
    certificateUrls,
    dueDate,
    completedAt,
    updatedAt,
    expirationDate,
    completionDate,
    noExpiration,
    rejectionReason,
    employeeId,
    adminId,
    assignedAt,
  ];
}
