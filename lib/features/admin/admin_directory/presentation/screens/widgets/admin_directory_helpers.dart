import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:flutter/material.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart'; // Ensure this matches your path

class AdminDirectoryHelpers {
  // Extracts 'John Doe' to 'JD'
  static String getInitials(String? name) {
    if (name == null || name.isEmpty) return '??';
    final parts = name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  // Modern Color Mapping for Task Statuses
  static Color getStatusColor(TaskStatus status) {
    switch (status) {
      case TaskStatus.noActionRequired:
        return const Color(0xFF64748B); // Slate Grey
      case TaskStatus.completed:
      case TaskStatus.verified:
      case TaskStatus.cleared:
        return const Color(0xFF10B981); // Emerald Green
      case TaskStatus.submitted:
      case TaskStatus.signed:
      case TaskStatus.pendingEmployerSignature:
        return const Color(0xFF3B82F6); // Blue
      case TaskStatus.pending:
        return const Color(0xFFF59E0B); // Warm Orange
      case TaskStatus.rejected:
        return const Color(0xFFEF4444); // Red
      default:
        return const Color(0xFF94A3B8); // Slate 400
    }
  }

  static Color getTrainingStatusColor(TrainingStatus status) {
    switch (status) {
      case TrainingStatus.completed:
      case TrainingStatus.verified:
        return const Color(0xFF10B981);
      case TrainingStatus.inProgress:
      case TrainingStatus.underReview:
        return const Color(0xFF3B82F6);
      case TrainingStatus.pending:
      case TrainingStatus.notStarted:
        return const Color(0xFFF59E0B);
      case TrainingStatus.overdue:
      case TrainingStatus.actionRequired:
        return const Color(0xFFEF4444);
    }
  }

  static Color getClearanceStatusColor(ClearanceStatus status) {
    switch (status) {
      case ClearanceStatus.verified:
        return const Color(0xFF10B981);
      case ClearanceStatus.underReview:
        return const Color(0xFF3B82F6);
      case ClearanceStatus.pending:
        return const Color(0xFFF59E0B);
      case ClearanceStatus.expired:
      case ClearanceStatus.actionRequired:
        return const Color(0xFFEF4444);
    }
  }

  // Icon Mapping for Task Statuses
  static IconData getStatusIcon(TaskStatus status) {
    switch (status) {
      case TaskStatus.noActionRequired:
        return Icons.block_flipped;
      case TaskStatus.completed:
      case TaskStatus.verified:
      case TaskStatus.cleared:
        return Icons.check_circle_rounded;
      case TaskStatus.submitted:
      case TaskStatus.signed:
      case TaskStatus.pendingEmployerSignature:
        return Icons.file_present_rounded;
      case TaskStatus.pending:
        return Icons.pending_actions_rounded;
      case TaskStatus.rejected:
        return Icons.cancel_rounded;
      default:
        return Icons.info_outline_rounded;
    }
  }

  // Filters Document Tasks
  static List<CompilationSubTask> filterDocTasks(
    List<CompilationSubTask> tasks,
  ) {
    return tasks.where((t) {
      final title = t.title.toLowerCase();
      return title.contains('doc') ||
          title.contains('id') ||
          title.contains('passport');
    }).toList();
  }
}
