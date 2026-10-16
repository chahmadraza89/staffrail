import 'package:bhmh/features/admin/admin_training/data/model/admin_training_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

// =============================================================================
// ADMIN TRAINING DTO
// =============================================================================
// Handles Firestore serialization and deserialization for training templates.
// =============================================================================

class AdminTrainingDTO {
  static AdminTrainingModel fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};

    return AdminTrainingModel(
      id: doc.id,
      title: data['title'] as String? ?? 'Untitled Training',
      description: data['description'] as String? ?? '',
      durationText: data['durationText'] as String? ?? '',
      requirementType: data['requirementType'] as String? ?? 'certificate',
      isActive: data['isActive'] as bool? ?? true,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
    );
  }

  static Map<String, dynamic> toFirestore(AdminTrainingModel model) {
    return {
      'title': model.title,
      'description': model.description,
      'durationText': model.durationText,
      'requirementType': model.requirementType,
      'isActive': model.isActive,
      'createdAt': model.createdAt != null
          ? Timestamp.fromDate(model.createdAt!)
          : FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }
}
