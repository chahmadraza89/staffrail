import 'package:flutter/material.dart';

/// A single action item displayed on the employee dashboard.
/// Generated from real onboarding + training + clearance Firestore data.
///
/// This is a pure data class — navigation is handled in the UI layer
/// following Flutter best practices (separation of concerns).
class DashboardActionItem {
  final String id;
  final String title;
  final String module; // 'Onboarding', 'Trainings', 'Clearance'
  final IconData icon;
  final Color color;
  final int priority; // 0 = overdue (highest), 1 = pending, 2 = informational
  final String entityId; // Original entity ID for navigation to detail page
  final Object? entityData; // Raw entity object for passing to detail pages

  const DashboardActionItem({
    required this.id,
    required this.title,
    required this.module,
    required this.icon,
    required this.color,
    required this.priority,
    required this.entityId,
    this.entityData,
  });
}
