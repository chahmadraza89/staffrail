import 'package:equatable/equatable.dart';

// =============================================================================
// ADMIN TRAINING MODELS
// =============================================================================

/// Represents a master training template created by the Admin.
class AdminTrainingModel extends Equatable {
  final String id;
  final String title;
  final String description;
  final String durationText;
  final String requirementType; // e.g., 'certificate', 'acknowledgement'
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const AdminTrainingModel({
    required this.id,
    required this.title,
    required this.description,
    required this.durationText,
    required this.requirementType,
    required this.isActive,
    this.createdAt,
    this.updatedAt,
  });

  AdminTrainingModel copyWith({
    String? id,
    String? title,
    String? description,
    String? durationText,
    String? requirementType,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return AdminTrainingModel(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      durationText: durationText ?? this.durationText,
      requirementType: requirementType ?? this.requirementType,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        title,
        description,
        durationText,
        requirementType,
        isActive,
        createdAt,
        updatedAt,
      ];
}

/// Helper model for the admin dashboard training metrics.
class AdminTrainingStatsModel extends Equatable {
  final int totalActive;
  final double complianceRate;
  final int overdueCount;

  const AdminTrainingStatsModel({
    required this.totalActive,
    required this.complianceRate,
    required this.overdueCount,
  });

  @override
  List<Object?> get props => [totalActive, complianceRate, overdueCount];
}
