import 'dart:ui';

import 'package:equatable/equatable.dart';

/// Represents the high-level progress of an employee for the Admin Dashboard.
/// Satisfies Spec Req #6: Employee-wise completion status and activity tracking.
class AdminEmployeeProgress extends Equatable {
  final String uid;
  final String name;
  final String? email;
  final double overallProgress;
  final double onboardingProgress;
  final double trainingProgress;
  final double clearanceProgress;
  final DateTime lastLogin;
  final bool isActive;

  const AdminEmployeeProgress({
    required this.uid,
    required this.name,
    this.email,
    required this.overallProgress,
    required this.onboardingProgress,
    required this.trainingProgress,
    required this.clearanceProgress,
    required this.lastLogin,
    required this.isActive,
  });

  @override
  List<Object?> get props => [
    uid,
    name,
    email,
    overallProgress,
    onboardingProgress,
    trainingProgress,
    clearanceProgress,
    lastLogin,
    isActive,
  ];
}

class ComplianceAlert extends Equatable {
  final String id;
  final String employeeId;
  final String employeeName;
  final String taskTitle;
  final String category; // 'Overdue', 'Due Soon', 'Signature Needed'
  final DateTime? dueDate;
  final Color color;

  const ComplianceAlert({
    required this.id,
    required this.employeeId,
    required this.employeeName,
    required this.taskTitle,
    required this.category,
    this.dueDate,
    required this.color,
  });

  @override
  List<Object?> get props => [
    id,
    employeeId,
    employeeName,
    taskTitle,
    category,
    dueDate,
    color,
  ];
}
