import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/features/admin/admin_training/data/model/admin_training_model.dart';

class AdminTrainingDTO {
  static AdminTrainingModel fromFirestore(LocalDocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};

    DateTime? parseTs(dynamic raw) {
      if (raw is LocalTimestamp) return raw.toDate();
      if (raw is DateTime) return raw;
      return null;
    }

    return AdminTrainingModel(
      id: doc.id,
      title: data['title'] as String? ?? 'Untitled Training',
      description: data['description'] as String? ?? '',
      durationText: data['durationText'] as String? ?? '',
      requirementType: data['requirementType'] as String? ?? 'certificate',
      isActive: data['isActive'] as bool? ?? true,
      createdAt: parseTs(data['createdAt']),
      updatedAt: parseTs(data['updatedAt']),
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
          ? LocalTimestamp.fromDate(model.createdAt!)
          : LocalFieldValue.serverTimestamp(),
      'updatedAt': LocalFieldValue.serverTimestamp(),
    };
  }
}
